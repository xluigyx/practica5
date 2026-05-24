// backend/src/queries.js — Las 25 consultas del PDF como endpoints REST
const { Router } = require('express');
const { client }  = require('./cassandra');
const { TARIFARIO } = require('./billing');

const router = Router();
const KS = process.env.CASSANDRA_KEYSPACE || 'semapa';
const PERIODO = process.env.PERIODO_ACTIVO || '2026-02';
// 1 m³ = 35.3147 pies³
const M3_TO_FT3 = 35.3147;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function exec(cql, params = []) {
  const r = await client.execute(cql, params, { prepare: !!params.length });
  return r.rows;
}

// Trae TODAS las filas usando paginación automática (evita el límite de 5000)
function execAll(cql, params = []) {
  return new Promise((resolve, reject) => {
    const rows = [];
    client.eachRow(
      cql, params,
      { prepare: true, autoPage: true, fetchSize: 500000 },
      (_n, row) => rows.push(row),
      (err) => err ? reject(err) : resolve(rows)
    );
  });
}

// Wraps handler con manejo de errores
function h(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) { console.error('[consulta]', e.message); res.status(500).json({ error: e.message }); }
  };
}

// Carga distritos en mapa id→nombre
async function loadDistritos() {
  const rows = await exec(`SELECT id, nombre FROM ${KS}.distritos`);
  const m = {};
  rows.forEach(r => { m[r.id] = r.nombre; });
  return m;
}

// Mapeo subcategoria corta → nombre completo del tarifario
const CAT_FULL = {
  R1:'R1-Preferencial', R2:'R2-Social',     R3:'R3-Residencial',
  R4:'R4-Residencial Alta', C:'Comercial',  CE:'CE-Comercial Especial',
  I:'Industrial',       P:'P-Provisional',  S:'S-Social',
};

// Calcula monto por m³ usando el tarifario
function montoDesdeM3(cat, m3) {
  const t = TARIFARIO[CAT_FULL[cat] || cat];
  if (!t) return 0;
  const exc = Math.max(0, m3 - 12);
  let monto = t.cargo_fijo;
  if (exc > 0) {
    monto += Math.min(exc, t.t1_lim) * t.t1_p;
    if (exc > t.t1_lim) monto += Math.min(exc - t.t1_lim, t.t2_lim - t.t1_lim) * t.t2_p;
    if (exc > t.t2_lim) monto += (exc - t.t2_lim) * t.t3_p;
  }
  return +monto.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 1 — Consumo promedio por distrito en rangos de 8 horas
// GET /api/consultas/1?fecha=2026-02-28&distrito_id=2
// ─────────────────────────────────────────────────────────────────────────────
router.get('/1', h(async (req, res) => {
  const fecha      = req.query.fecha || '2026-02-28';
  const distritoId = req.query.distrito_id ? parseInt(req.query.distrito_id) : null;
  const dmap = await loadDistritos();

  // Trae medidores del distrito pedido (o todos)
  let medRows;
  if (distritoId) {
    medRows = await exec(
      `SELECT serie, distrito_id FROM ${KS}.medidores WHERE distrito_id = ? ALLOW FILTERING`,
      [distritoId]
    );
  } else {
    medRows = await exec(`SELECT serie, distrito_id FROM ${KS}.medidores`);
  }

  // Muestra: agrupar en 3 bloques de 8h
  const bloques = { '00:00-08:00': {}, '08:00-16:00': {}, '16:00-24:00': {} };
  const dia = new Date(fecha);
  const t0  = dia.getTime();

  // Para demo: usa los primeros 500 medidores (muestra representativa)
  const muestra = medRows.slice(0, 500);

  for (const med of muestra) {
    const lects = await exec(
      `SELECT timestamp_ts, consumo_m3 FROM ${KS}.lecturas
       WHERE medidor_serie = ? AND periodo = ?`,
      [med.serie, PERIODO]
    );
    for (const l of lects) {
      const ts   = new Date(l.timestamp_ts).getTime();
      const hora = new Date(l.timestamp_ts).getHours();
      const blq  = hora < 8 ? '00:00-08:00' : hora < 16 ? '08:00-16:00' : '16:00-24:00';
      const did  = med.distrito_id || 0;
      if (!bloques[blq][did]) bloques[blq][did] = { suma: 0, n: 0, nombre: dmap[did] || `D-${did}` };
      bloques[blq][did].suma += l.consumo_m3 || 0;
      bloques[blq][did].n++;
    }
  }

  const resultado = [];
  for (const [bloque, distritos] of Object.entries(bloques)) {
    for (const [did, data] of Object.entries(distritos)) {
      resultado.push({
        distrito: data.nombre,
        hora: bloque,
        consumo_m3: +(data.suma).toFixed(0),
        promedio_m3: data.n > 0 ? +(data.suma / data.n).toFixed(2) : 0,
      });
    }
  }

  res.json({ consulta: 1, descripcion: 'Consumo promedio por distrito en rangos de 8 horas', data: resultado });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 2 — Comparativa de consumo entre las 4 últimas semanas por distritos
// GET /api/consultas/2?distritos=TUNARI,MOLLE,ALEJO CALATAYUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/2', h(async (req, res) => {
  const nombresReq = (req.query.distritos || 'TUNARI,MOLLE,ALEJO CALATAYUD').split(',').map(s => s.trim().toUpperCase());
  const dmap = await loadDistritos();

  // Filtrar ids de distritos pedidos
  const idsReq = Object.entries(dmap)
    .filter(([, n]) => nombresReq.some(nr => n.includes(nr)))
    .map(([id]) => parseInt(id));

  // Trae medidores de esos distritos
  const medRows = await exec(`SELECT serie, distrito_id FROM ${KS}.medidores`);
  const medMap  = {}; // serie → distrito_id
  medRows.forEach(m => { if (idsReq.includes(m.distrito_id)) medMap[m.serie] = m.distrito_id; });

  // Semanas del mes activo (S1=1-7, S2=8-14, S3=15-21, S4=22-28)
  const semanas   = { S1:[1,7], S2:[8,14], S3:[15,21], S4:[22,31] };
  const consumoSD = {}; // { distrito_id: { S1: total, S2: total, ... } }
  idsReq.forEach(id => { consumoSD[id] = { S1:0, S2:0, S3:0, S4:0 }; });

  // Muestra de 300 medidores de los distritos pedidos
  const series = Object.keys(medMap).slice(0, 300);
  for (const serie of series) {
    const lects = await exec(
      `SELECT timestamp_ts, consumo_m3 FROM ${KS}.lecturas WHERE medidor_serie=? AND periodo=?`,
      [serie, PERIODO]
    );
    for (const l of lects) {
      const dia = new Date(l.timestamp_ts).getDate();
      const sem = dia <= 7 ? 'S1' : dia <= 14 ? 'S2' : dia <= 21 ? 'S3' : 'S4';
      consumoSD[medMap[serie]][sem] += l.consumo_m3 || 0;
    }
  }

  const data = Object.entries(consumoSD).map(([id, sem]) => ({
    distrito: dmap[parseInt(id)] || `D-${id}`,
    S1: Math.round(sem.S1), S2: Math.round(sem.S2),
    S3: Math.round(sem.S3), S4: Math.round(sem.S4),
  }));

  res.json({ consulta: 2, descripcion: 'Comparativa de consumo entre las 4 últimas semanas', data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 3 — Contratos con consumo excesivo >45 m³ (categoría Residencial)
// GET /api/consultas/3?limite=50
// ─────────────────────────────────────────────────────────────────────────────
router.get('/3', h(async (req, res) => {
  const limite = parseInt(req.query.limite || '50');

  // Lecturas excesivas del periodo activo
  const lects = await exec(
    `SELECT medidor_serie, consumo_m3 FROM ${KS}.lecturas
     WHERE periodo=? AND es_excesivo=true ALLOW FILTERING`,
    [PERIODO]
  );

  // Buscar el contrato de cada medidor (inmuebles por medidor_serie usa índice)
  const resultado = [];
  const vistas = new Set();
  for (const l of lects) {
    if (vistas.has(l.medidor_serie) || resultado.length >= limite) continue;
    vistas.add(l.medidor_serie);

    const inmRows = await exec(
      `SELECT contrato, categoria, medidor_serie FROM ${KS}.inmuebles
       WHERE medidor_serie=? ALLOW FILTERING`,
      [l.medidor_serie]
    );
    const inm = inmRows[0];
    if (!inm) continue;
    const cat = inm.categoria || '';
    if (!['R1','R2','R3','R4'].includes(cat)) continue; // solo residencial

    const exceso_pct = +(((l.consumo_m3 - 45) / 45) * 100).toFixed(2);
    resultado.push({
      contrato:    inm.contrato,
      tarifa:      `Residencial ${cat}`,
      consumo_m3:  l.consumo_m3,
      limite_onu:  45,
      exceso_pct,
    });
  }

  res.json({ consulta: 3, descripcion: 'Contratos residenciales con consumo excesivo >45 m³', total: resultado.length, data: resultado });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 4 — Medidores activos por distrito y zona
// GET /api/consultas/4
// ─────────────────────────────────────────────────────────────────────────────
router.get('/4', h(async (req, res) => {
  const medRows = await execAll(
    `SELECT serie, estado, zona, distrito_id FROM ${KS}.medidores
     WHERE estado='Operativo' ALLOW FILTERING`
  );
  const dmap = await loadDistritos();

  const agr = {}; // 'distrito_id|zona' → count
  for (const m of medRows) {
    const key = `${m.distrito_id || 0}|${m.zona || 'SIN ZONA'}`;
    agr[key] = (agr[key] || 0) + 1;
  }

  const data = Object.entries(agr)
    .map(([key, count]) => {
      const [did, zona] = key.split('|');
      return { distrito: dmap[parseInt(did)] || `D-${did}`, zona, medidores_activos: count };
    })
    .sort((a, b) => b.medidores_activos - a.medidores_activos);

  res.json({ consulta: 4, descripcion: 'Medidores activos por distrito y zona', total: medRows.length, data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 5 — Medidores fuera de servicio por distrito y zona
// GET /api/consultas/5
// ─────────────────────────────────────────────────────────────────────────────
router.get('/5', h(async (req, res) => {
  const medRows = await execAll(
    `SELECT serie, estado, zona, distrito_id FROM ${KS}.medidores
     WHERE estado IN ('Dañado','Mantenimiento','Inactivo') ALLOW FILTERING`
  );
  const dmap = await loadDistritos();

  const agr = {};
  for (const m of medRows) {
    const key = `${m.distrito_id || 0}|${m.zona || 'SIN ZONA'}`;
    if (!agr[key]) agr[key] = { count: 0, estados: {} };
    agr[key].count++;
    agr[key].estados[m.estado] = (agr[key].estados[m.estado] || 0) + 1;
  }

  const data = Object.entries(agr)
    .map(([key, v]) => {
      const [did, zona] = key.split('|');
      return { distrito: dmap[parseInt(did)] || `D-${did}`, zona, fuera_de_servicio: v.count, detalle: v.estados };
    })
    .sort((a, b) => b.fuera_de_servicio - a.fuera_de_servicio);

  res.json({ consulta: 5, descripcion: 'Medidores fuera de servicio por distrito y zona', total: medRows.length, data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 6 — Modelos de medidores con mayor tasa de fallos
// GET /api/consultas/6
// ─────────────────────────────────────────────────────────────────────────────
router.get('/6', h(async (req, res) => {
  const medRows = await execAll(`SELECT serie, modelo, estado FROM ${KS}.medidores`);

  const stats = {}; // modelo → { total, fallos }
  for (const m of medRows) {
    const mod = m.modelo || 'Desconocido';
    if (!stats[mod]) stats[mod] = { total: 0, fallos: 0 };
    stats[mod].total++;
    if (['Dañado', 'Mantenimiento'].includes(m.estado)) stats[mod].fallos++;
  }

  const data = Object.entries(stats).map(([modelo, s]) => ({
    modelo,
    total:         s.total,
    fallos:        s.fallos,
    tasa_fallo_pct: s.total > 0 ? +((s.fallos / s.total) * 100).toFixed(2) : 0,
  })).sort((a, b) => b.fallos - a.fallos);

  res.json({ consulta: 6, descripcion: 'Modelos de medidores con mayor tasa de fallos', data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 7 — Consumo promedio mensual en m³ por tarifa y distrito
// GET /api/consultas/7?periodo=2026-02
// ─────────────────────────────────────────────────────────────────────────────
router.get('/7', h(async (req, res) => {
  const periodo = req.query.periodo || PERIODO;
  const dmap    = await loadDistritos();

  // Trae todos los inmuebles con zona y distrito
  const inmRows = await exec(`SELECT contrato, categoria, medidor_serie, distrito_id FROM ${KS}.inmuebles`);
  const medToInm = {}; // medidor_serie → { categoria, distrito_id }
  inmRows.forEach(r => { medToInm[r.medidor_serie] = { cat: r.categoria, did: r.distrito_id }; });

  // Agrupa consumo por distrito + categoria
  const agr = {}; // `did|cat` → { suma, n }
  // Muestra de 2000 lecturas del periodo
  const lects = await exec(
    `SELECT medidor_serie, consumo_m3 FROM ${KS}.lecturas
     WHERE periodo=? LIMIT 2000 ALLOW FILTERING`,
    [periodo]
  );
  for (const l of lects) {
    const meta = medToInm[l.medidor_serie];
    if (!meta) continue;
    const key = `${meta.did || 0}|${meta.cat || '?'}`;
    if (!agr[key]) agr[key] = { suma: 0, n: 0 };
    agr[key].suma += l.consumo_m3 || 0;
    agr[key].n++;
  }

  // Pivotar: distrito → { R1, R2, R3, R4, C, CE, I, P, S }
  const pivot = {};
  for (const [key, v] of Object.entries(agr)) {
    const [did, cat] = key.split('|');
    const dnom = dmap[parseInt(did)] || `D-${did}`;
    if (!pivot[dnom]) pivot[dnom] = {};
    pivot[dnom][cat] = Math.round(v.suma);
  }

  const data = Object.entries(pivot).map(([distrito, cats]) => ({ distrito, ...cats }));
  res.json({ consulta: 7, descripcion: 'Consumo promedio mensual por tarifa y distrito', periodo, data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 8 — Zonas con más medidores de consumo anómalo (0 o excesivo)
// GET /api/consultas/8
// ─────────────────────────────────────────────────────────────────────────────
router.get('/8', h(async (req, res) => {
  // Lecturas anómalas: consumo_m3 = 0 O es_excesivo = true
  const excLects = await exec(
    `SELECT medidor_serie FROM ${KS}.lecturas WHERE periodo=? AND es_excesivo=true ALLOW FILTERING`,
    [PERIODO]
  );
  const ceroLects = await exec(
    `SELECT medidor_serie FROM ${KS}.lecturas WHERE periodo=? AND consumo_m3=0 ALLOW FILTERING`,
    [PERIODO]
  );

  // Unir medidores anómalos
  const anomalos = new Set([
    ...excLects.map(r => r.medidor_serie),
    ...ceroLects.map(r => r.medidor_serie),
  ]);

  // Buscar zona y modelo de cada medidor anómalo
  const agr = {}; // zona → { count, modelos: Set }
  for (const serie of anomalos) {
    const rows = await exec(
      `SELECT modelo, zona FROM ${KS}.medidores WHERE serie=?`, [serie]
    );
    if (!rows[0]) continue;
    const zona = rows[0].zona || 'SIN ZONA';
    if (!agr[zona]) agr[zona] = { count: 0, modelos: new Set() };
    agr[zona].count++;
    if (rows[0].modelo) agr[zona].modelos.add(rows[0].modelo);
  }

  const data = Object.entries(agr)
    .map(([zona, v]) => ({ zona, anomalos: v.count, modelos: [...v.modelos].join(', ') }))
    .sort((a, b) => b.anomalos - a.anomalos)
    .slice(0, 20);

  res.json({ consulta: 8, descripcion: 'Zonas con mayor cantidad de medidores con consumo anómalo', total_anomalos: anomalos.size, data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 9 — Lecturas fallidas por tipo de medidor en el último mes
// GET /api/consultas/9
// ─────────────────────────────────────────────────────────────────────────────
router.get('/9', h(async (req, res) => {
  // "Fallida" = consumo_m3 = 0 (no reportó lectura válida)
  const fallidas = await exec(
    `SELECT medidor_serie FROM ${KS}.lecturas WHERE periodo=? AND consumo_m3=0 ALLOW FILTERING`,
    [PERIODO]
  );

  const conteo = {}; // modelo → count
  for (const l of fallidas) {
    const rows = await exec(`SELECT modelo FROM ${KS}.medidores WHERE serie=?`, [l.medidor_serie]);
    const mod = rows[0]?.modelo || 'Desconocido';
    conteo[mod] = (conteo[mod] || 0) + 1;
  }

  const data = Object.entries(conteo)
    .map(([modelo, fallidas]) => ({ modelo, fallidas }))
    .sort((a, b) => b.fallidas - a.fallidas);

  res.json({ consulta: 9, descripcion: 'Lecturas fallidas (consumo=0) por tipo de medidor', periodo: PERIODO, data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 10 — % de medidores con más de 4 años de antigüedad
// GET /api/consultas/10
// ─────────────────────────────────────────────────────────────────────────────
router.get('/10', h(async (req, res) => {
  const medRows = await exec(`SELECT serie, instalacion FROM ${KS}.medidores`);
  const limite  = new Date();
  limite.setFullYear(limite.getFullYear() - 4);

  let antiguos = 0;
  for (const m of medRows) {
    if (!m.instalacion) continue;
    const inst = new Date(m.instalacion.toString());
    if (inst < limite) antiguos++;
  }

  res.json({
    consulta: 10,
    descripcion: 'Medidores con más de 4 años de antigüedad (fuera de garantía)',
    total_medidores:  medRows.length,
    medidores_4_anos: antiguos,
    porcentaje: +((antiguos / medRows.length) * 100).toFixed(2) + '%',
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 11 — Zonas con mayor consumo per cápita por categoría residencial
// GET /api/consultas/11
// ─────────────────────────────────────────────────────────────────────────────
router.get('/11', h(async (req, res) => {
  // Trae inmuebles residenciales con zona
  const inmRows = await exec(
    `SELECT medidor_serie, zona, categoria FROM ${KS}.inmuebles
     WHERE categoria IN ('R1','R2','R3','R4') ALLOW FILTERING`
  );
  const medToMeta = {};
  inmRows.forEach(r => { medToMeta[r.medidor_serie] = { zona: r.zona, cat: r.categoria }; });

  // Lecturas del periodo
  const lects = await exec(
    `SELECT medidor_serie, consumo_m3 FROM ${KS}.lecturas WHERE periodo=? LIMIT 3000 ALLOW FILTERING`,
    [PERIODO]
  );

  const agr = {}; // `zona|cat` → { suma, n }
  for (const l of lects) {
    const meta = medToMeta[l.medidor_serie];
    if (!meta) continue;
    const key = `${meta.zona}|${meta.cat}`;
    if (!agr[key]) agr[key] = { suma: 0, n: 0 };
    agr[key].suma += l.consumo_m3 || 0;
    agr[key].n++;
  }

  // Pivotar por zona
  const pivot = {};
  for (const [key, v] of Object.entries(agr)) {
    const [zona, cat] = key.split('|');
    if (!pivot[zona]) pivot[zona] = {};
    pivot[zona][cat] = Math.round(v.suma);
  }

  const data = Object.entries(pivot)
    .map(([zona, cats]) => ({ zona, ...cats }))
    .sort((a, b) => (b.R1||0)+(b.R2||0)+(b.R3||0)+(b.R4||0) - (a.R1||0)-(a.R2||0)-(a.R3||0)-(a.R4||0))
    .slice(0, 15);

  res.json({ consulta: 11, descripcion: 'Consumo per cápita por zona y categoría residencial', periodo: PERIODO, data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 12 — Top 3 clientes con mayor consumo por distrito en el mes activo
// GET /api/consultas/12
// ─────────────────────────────────────────────────────────────────────────────
router.get('/12', h(async (req, res) => {
  const dmap  = await loadDistritos();
  const inmRows = await exec(`SELECT contrato, nombre, medidor_serie, distrito_id FROM ${KS}.inmuebles`);
  const medToInm = {};
  inmRows.forEach(r => { medToInm[r.medidor_serie] = r; });

  // Lecturas del periodo
  const lects = await exec(
    `SELECT medidor_serie, consumo_m3 FROM ${KS}.lecturas WHERE periodo=? LIMIT 5000 ALLOW FILTERING`,
    [PERIODO]
  );

  // Suma de consumo por medidor
  const consumoMed = {};
  for (const l of lects) {
    consumoMed[l.medidor_serie] = (consumoMed[l.medidor_serie] || 0) + (l.consumo_m3 || 0);
  }

  // Agrupar por distrito y tomar top 3
  const porDistrito = {};
  for (const [serie, consumo] of Object.entries(consumoMed)) {
    const inm = medToInm[serie];
    if (!inm) continue;
    const did = inm.distrito_id || 0;
    if (!porDistrito[did]) porDistrito[did] = [];
    porDistrito[did].push({ nombre: inm.nombre, contrato: inm.contrato, consumo_m3: Math.round(consumo) });
  }

  const data = Object.entries(porDistrito).map(([did, clientes]) => ({
    distrito: dmap[parseInt(did)] || `D-${did}`,
    top3: clientes.sort((a, b) => b.consumo_m3 - a.consumo_m3).slice(0, 3),
  }));

  res.json({ consulta: 12, descripcion: 'Top 3 clientes con mayor consumo por distrito', periodo: PERIODO, data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 13 — Zonas que requieren renovación (más errores = estado Dañado/Mant.)
// GET /api/consultas/13
// ─────────────────────────────────────────────────────────────────────────────
router.get('/13', h(async (req, res) => {
  const dmap = await loadDistritos();
  const medRows = await exec(
    `SELECT serie, modelo, zona, distrito_id, estado FROM ${KS}.medidores
     WHERE estado IN ('Dañado','Mantenimiento') ALLOW FILTERING`
  );

  const agr = {}; // `did|zona` → { count, modelos: {} }
  for (const m of medRows) {
    const key = `${m.distrito_id || 0}|${m.zona || 'SIN ZONA'}`;
    if (!agr[key]) agr[key] = { count: 0, modelos: {} };
    agr[key].count++;
    agr[key].modelos[m.modelo || '?'] = (agr[key].modelos[m.modelo || '?'] || 0) + 1;
  }

  const data = Object.entries(agr).map(([key, v]) => {
    const [did, zona] = key.split('|');
    return {
      distrito: dmap[parseInt(did)] || `D-${did}`,
      zona,
      medidores_con_falla: v.count,
      recomendacion: v.count > 50 ? 'RENOVACIÓN URGENTE' : 'MANTENIMIENTO PREVENTIVO',
      modelos: v.modelos,
    };
  }).sort((a, b) => b.medidores_con_falla - a.medidores_con_falla).slice(0, 20);

  res.json({ consulta: 13, descripcion: 'Zonas que requieren renovación de medidores', total_con_falla: medRows.length, data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 15 — Zonas con más errores dado un distrito X
// GET /api/consultas/15?distrito=MOLLE
// ─────────────────────────────────────────────────────────────────────────────
router.get('/15', h(async (req, res) => {
  const nombreDistrito = (req.query.distrito || 'MOLLE').toUpperCase();
  const dmap = await loadDistritos();
  const did  = parseInt(Object.entries(dmap).find(([,n]) => n.includes(nombreDistrito))?.[0] || '0');

  const medRows = await exec(
    `SELECT serie, zona, estado FROM ${KS}.medidores
     WHERE distrito_id=? AND estado IN ('Dañado','Mantenimiento') ALLOW FILTERING`,
    [did]
  );

  const agr = {};
  for (const m of medRows) {
    const zona = m.zona || 'SIN ZONA';
    agr[zona] = (agr[zona] || 0) + 1;
  }

  const data = Object.entries(agr)
    .map(([zona, reportes]) => ({ zona, reportes }))
    .sort((a, b) => b.reportes - a.reportes);

  res.json({
    consulta: 15,
    descripcion: `Zonas con mayor cantidad de errores en el distrito ${nombreDistrito}`,
    distrito: nombreDistrito,
    data,
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 17 — Cobertura de antenas LoRaWAN por zona
// GET /api/consultas/17
// ─────────────────────────────────────────────────────────────────────────────
router.get('/17', h(async (req, res) => {
  // Asigna radiobase por distrito (simulación basada en datos reales de zonas)
  const RADIOBASE_MAP = {
    1:'LoRaWan-Adela',    2:'LoRaWan-Teleferico', 3:'LoRaWan-Itocta',
    4:'LoRaWan-Calatayud',5:'LoRaWan-Petrolera',  6:'LoRaWan-Valle',
    7:'LoRaWan-Murillo',  8:'LoRaWan-Colcapirhua',9:'LoRaWan-Central',
    10:'LoRaWan-SipeSipe',11:'LoRaWan-Alalay',    12:'LoRaWan-Industrial',
    13:'LoRaWan-Sacaba',  14:'LoRaWan-Sur',
  };

  const medRows = await exec(`SELECT serie, zona, distrito_id FROM ${KS}.medidores`);
  const agr = {}; // `radiobase|zona` → count
  for (const m of medRows) {
    const rb  = RADIOBASE_MAP[m.distrito_id] || 'LoRaWan-Desconocida';
    const key = `${rb}|${m.zona || 'SIN ZONA'}`;
    agr[key] = (agr[key] || 0) + 1;
  }

  const data = Object.entries(agr)
    .map(([key, conexiones]) => {
      const [radiobase, zona] = key.split('|');
      return { radiobase, zona, conexiones };
    })
    .sort((a, b) => b.conexiones - a.conexiones)
    .slice(0, 20);

  res.json({ consulta: 17, descripcion: 'Zonas con mayor cobertura de antenas LoRaWAN', data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 18 — Demanda proyectada de agua para los próximos 5 años (2.6%/año)
// GET /api/consultas/18
// ─────────────────────────────────────────────────────────────────────────────
router.get('/18', h(async (req, res) => {
  const dmap = await loadDistritos();
  const lects = await exec(
    `SELECT medidor_serie, consumo_m3 FROM ${KS}.lecturas WHERE periodo=? LIMIT 10000 ALLOW FILTERING`,
    [PERIODO]
  );

  // Suma consumo actual por medidor
  const medRows = await exec(`SELECT serie, distrito_id FROM ${KS}.medidores`);
  const medToDist = {};
  medRows.forEach(m => { medToDist[m.serie] = m.distrito_id; });

  const baseDistrito = {};
  for (const l of lects) {
    const did = medToDist[l.medidor_serie] || 0;
    baseDistrito[did] = (baseDistrito[did] || 0) + (l.consumo_m3 || 0);
  }

  const GROWTH = 0.026;
  const data   = Object.entries(baseDistrito).map(([did, base]) => {
    const row = { distrito: dmap[parseInt(did)] || `D-${did}` };
    let val = base;
    for (let y = 2025; y <= 2029; y++) {
      row[`${y}_m3`] = Math.round(val);
      val *= (1 + GROWTH);
    }
    return row;
  });

  res.json({ consulta: 18, descripcion: 'Demanda proyectada 5 años (crecimiento 2.6%/año)', data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 20 — Impacto de cambio tarifario (ej. P → R4)
// GET /api/consultas/20?cat_origen=P&cat_destino=R4
// ─────────────────────────────────────────────────────────────────────────────
router.get('/20', h(async (req, res) => {
  const catOrigen  = (req.query.cat_origen  || 'P').toUpperCase();
  const catDestino = (req.query.cat_destino || 'R4').toUpperCase();

  const inmRows = await exec(
    `SELECT contrato, medidor_serie FROM ${KS}.inmuebles WHERE categoria=? ALLOW FILTERING`,
    [catOrigen]
  );

  let totalM3 = 0, totalAntes = 0, totalDespues = 0;
  const muestra = inmRows.slice(0, 500); // muestra para estimar

  for (const inm of muestra) {
    const lects = await exec(
      `SELECT consumo_m3 FROM ${KS}.lecturas WHERE medidor_serie=? AND periodo=?`,
      [inm.medidor_serie, PERIODO]
    );
    const m3 = lects.reduce((s, l) => s + (l.consumo_m3 || 0), 0);
    totalM3 += m3;
    totalAntes   += montoDesdeM3(catOrigen, m3);
    totalDespues += montoDesdeM3(catDestino, m3);
  }

  // Escalar al total de contratos
  const factor = inmRows.length / Math.max(muestra.length, 1);

  res.json({
    consulta: 20,
    descripcion: `Impacto cambio tarifario ${catOrigen} → ${catDestino}`,
    contratos_afectados: inmRows.length,
    consumo_total_m3:    Math.round(totalM3 * factor),
    ingresos_actuales_bs: +(totalAntes  * factor).toFixed(2),
    ingresos_nuevos_bs:   +(totalDespues * factor).toFixed(2),
    incremento_bs:        +((totalDespues - totalAntes) * factor).toFixed(2),
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 21 — Medidores que no reportaron su consumo (sin lecturas en el periodo)
// GET /api/consultas/21?limite=50
// ─────────────────────────────────────────────────────────────────────────────
router.get('/21', h(async (req, res) => {
  const limite = parseInt(req.query.limite || '50');

  // Medidores con lecturas en el periodo (set de series que SÍ reportaron)
  const reportaron = await exec(
    `SELECT DISTINCT medidor_serie FROM ${KS}.lecturas WHERE periodo=? ALLOW FILTERING`,
    [PERIODO]
  );
  const setReportaron = new Set(reportaron.map(r => r.medidor_serie));

  // Medidores que NO están en ese set
  const medRows = await exec(`SELECT serie, zona, distrito_id FROM ${KS}.medidores`);
  const dmap    = await loadDistritos();

  const sinReporte = medRows
    .filter(m => !setReportaron.has(m.serie))
    .slice(0, limite);

  // Enriquecer con datos del inmueble
  const data = [];
  for (const m of sinReporte) {
    const inmRows = await exec(
      `SELECT contrato, nombre, direccion FROM ${KS}.inmuebles WHERE medidor_serie=? ALLOW FILTERING`,
      [m.serie]
    );
    data.push({
      serie:    m.serie,
      distrito: dmap[m.distrito_id] || `D-${m.distrito_id}`,
      zona:     m.zona || 'SIN ZONA',
      contrato: inmRows[0]?.contrato || 'N/A',
      titular:  inmRows[0]?.nombre   || 'N/A',
      direccion:inmRows[0]?.direccion|| 'N/A',
    });
  }

  res.json({
    consulta: 21,
    descripcion: 'Medidores que no reportaron consumo en el periodo activo',
    periodo: PERIODO,
    total_sin_reporte: medRows.length - setReportaron.size,
    mostrando: data.length,
    data,
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 22 — Proyección de ingresos por tipo de tarifa para el mes activo
// GET /api/consultas/22
// ─────────────────────────────────────────────────────────────────────────────
router.get('/22', h(async (req, res) => {
  const inmRows = await exec(`SELECT medidor_serie, categoria FROM ${KS}.inmuebles`);
  const medToCat = {};
  inmRows.forEach(r => { medToCat[r.medidor_serie] = r.categoria; });

  const lects = await exec(
    `SELECT medidor_serie, consumo_m3 FROM ${KS}.lecturas WHERE periodo=? LIMIT 20000 ALLOW FILTERING`,
    [PERIODO]
  );

  const agr = {}; // cat → { totalM3, totalBs, n }
  for (const l of lects) {
    const cat = medToCat[l.medidor_serie] || '?';
    if (!agr[cat]) agr[cat] = { totalM3: 0, totalBs: 0, n: 0 };
    agr[cat].totalM3 += l.consumo_m3 || 0;
    agr[cat].totalBs += montoDesdeM3(cat, l.consumo_m3 || 0);
    agr[cat].n++;
  }

  const ALIAS = { R1:'R1', R2:'R2', R3:'R3', R4:'R4', C:'C', CE:'CE', I:'I', P:'P', S:'S' };
  const data  = Object.entries(agr)
    .filter(([cat]) => cat !== '?')
    .map(([cat, v]) => ({
      categoria: CAT_FULL[cat] || cat,
      alias:     ALIAS[cat] || cat,
      consumo_m3: Math.round(v.totalM3),
      ingresos_bs: +v.totalBs.toFixed(2),
    }))
    .sort((a, b) => b.ingresos_bs - a.ingresos_bs);

  const total_bs = data.reduce((s, r) => s + r.ingresos_bs, 0);
  res.json({ consulta: 22, descripcion: 'Proyección de ingresos por tarifa en el mes activo', periodo: PERIODO, total_bs: +total_bs.toFixed(2), data });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 23 — ¿Cuánto y a quiénes cobrar consumo mínimo (Residencial)?
// GET /api/consultas/23?limite=50
// ─────────────────────────────────────────────────────────────────────────────
router.get('/23', h(async (req, res) => {
  const limite = parseInt(req.query.limite || '50');
  const MINIMO_M3 = 12; // consumo mínimo facturable

  // Lecturas del periodo con consumo < mínimo (aún así se cobra el cargo fijo)
  const lects = await exec(
    `SELECT medidor_serie, consumo_m3 FROM ${KS}.lecturas
     WHERE periodo=? LIMIT 5000 ALLOW FILTERING`,
    [PERIODO]
  );

  const consumoMed = {};
  for (const l of lects) {
    consumoMed[l.medidor_serie] = (consumoMed[l.medidor_serie] || 0) + (l.consumo_m3 || 0);
  }

  const data = [];
  for (const [serie, m3] of Object.entries(consumoMed)) {
    if (m3 >= MINIMO_M3) continue;
    const inmRows = await exec(
      `SELECT contrato, nombre, categoria FROM ${KS}.inmuebles WHERE medidor_serie=? ALLOW FILTERING`,
      [serie]
    );
    if (!inmRows[0]) continue;
    const cat = inmRows[0].categoria || 'R2';
    if (!['R1','R2','R3','R4'].includes(cat)) continue;
    const montoCobrar = montoDesdeM3(cat, MINIMO_M3); // se cobra como si consumiera 12m³
    data.push({
      contrato:      inmRows[0].contrato,
      nombre:        inmRows[0].nombre,
      categoria:     cat,
      consumo_real_m3: m3,
      consumo_min_m3:  MINIMO_M3,
      monto_bs:      montoCobrar,
    });
    if (data.length >= limite) break;
  }

  res.json({
    consulta: 23,
    descripcion: 'Clientes residenciales a cobrar consumo mínimo (12 m³)',
    periodo: PERIODO,
    total: data.length,
    data,
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA 24 — Proyección de ingresos por tarifa en pies³
// GET /api/consultas/24
// ─────────────────────────────────────────────────────────────────────────────
router.get('/24', h(async (req, res) => {
  // Reutiliza los datos de consulta 22 y convierte m³ → pies³
  const inmRows = await exec(`SELECT medidor_serie, categoria FROM ${KS}.inmuebles`);
  const medToCat = {};
  inmRows.forEach(r => { medToCat[r.medidor_serie] = r.categoria; });

  const lects = await exec(
    `SELECT medidor_serie, consumo_m3 FROM ${KS}.lecturas WHERE periodo=? LIMIT 20000 ALLOW FILTERING`,
    [PERIODO]
  );

  const agr = {};
  for (const l of lects) {
    const cat = medToCat[l.medidor_serie] || '?';
    if (!agr[cat]) agr[cat] = { totalM3: 0, totalBs: 0 };
    agr[cat].totalM3 += l.consumo_m3 || 0;
    agr[cat].totalBs += montoDesdeM3(cat, l.consumo_m3 || 0);
  }

  const data = Object.entries(agr)
    .filter(([cat]) => cat !== '?')
    .map(([cat, v]) => ({
      categoria:    CAT_FULL[cat] || cat,
      consumo_m3:   Math.round(v.totalM3),
      consumo_ft3:  +(v.totalM3 * M3_TO_FT3).toFixed(2),
      ingresos_bs:  +v.totalBs.toFixed(2),
    }))
    .sort((a, b) => b.consumo_ft3 - a.consumo_ft3);

  res.json({
    consulta: 24,
    descripcion: 'Proyección de ingresos por tarifa (consumo en m³ y pies³)',
    nota: `1 m³ = ${M3_TO_FT3} pies³`,
    periodo: PERIODO,
    data,
  });
}));

module.exports = router;
