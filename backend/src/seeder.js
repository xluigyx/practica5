// backend/src/seeder.js — Poblar Cassandra con los CSV de SEMAPA
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cassandra = require('cassandra-driver');

// ── Config ───────────────────────────────────────────────────────────────────
const HOSTS = (process.env.CASSANDRA_HOSTS || 'localhost').split(',');
const DC    = process.env.CASSANDRA_DC    || 'datacenter1';
const KS    = process.env.CASSANDRA_KEYSPACE || 'semapa';
const CSV_DIR = process.env.CSV_DIR || 'C:\\Users\\PC\\OneDrive\\Documentos\\Univalle\\Semestre 7\\recursosP5';

const FILES = {
  infra:     path.join(CSV_DIR, '03 Practica 5 Recursos infraestructuras_cochabamba (2).csv'),
  medidores: path.join(CSV_DIR, '03 Practica 5 Recursos medidores_iot (2).csv'),
  contratos: path.join(CSV_DIR, '03 Practica 5 Recursos contratos_agua (2).csv'),
  lecturas:  path.join(CSV_DIR, '03 Practica 5 Recursos lecturas_iot (2).csv'),
};

const TIPO_MEDIDOR = {
  '1': 'ITC 100',
  '2': 'Siconia WATER WM-NB',
  '3': 'OY1320 LoRaWAN',
  '4': 'WP20',
  '5': 'Medidor 100% IoT',
};

// Distritos según documento oficial: 6 sub-alcaldías → 15 distritos
// Tunari: 1,2,13 | Molle: 3,4 | Alejo Calatayud: 5,8 | Valle Hermoso: 6,7,14 | Itocta: 9,15 | Adela Zamudio: 10,11,12
const DISTRITOS = [
  { id:1,  nombre:'QUERU QUERU / ARANJUEZ',    subalcaldia:'Tunari',          poblacion:25100, medidores_total:6600,  cobertura_pct:95.0, calidad_ica:83, temperatura_c:17.8 },
  { id:2,  nombre:'CALA CALA / MAYORAZGO',     subalcaldia:'Tunari',          poblacion:28100, medidores_total:7400,  cobertura_pct:95.1, calidad_ica:83, temperatura_c:17.8 },
  { id:3,  nombre:'SARCO / SARCOBAMBA',        subalcaldia:'Molle',           poblacion:44900, medidores_total:11800, cobertura_pct:95.2, calidad_ica:80, temperatura_c:18.9 },
  { id:4,  nombre:'COÑA COÑA / HIPODROMO',     subalcaldia:'Molle',           poblacion:24300, medidores_total:6400,  cobertura_pct:95.2, calidad_ica:80, temperatura_c:18.9 },
  { id:5,  nombre:'JAIHUAYCO / LACMA',         subalcaldia:'Alejo Calatayud', poblacion:47700, medidores_total:12500, cobertura_pct:95.4, calidad_ica:79, temperatura_c:19.1 },
  { id:6,  nombre:'ALALAY NORTE',              subalcaldia:'Valle Hermoso',   poblacion:14100, medidores_total:3700,  cobertura_pct:95.6, calidad_ica:82, temperatura_c:18.1 },
  { id:7,  nombre:'ALALAY SUD',                subalcaldia:'Valle Hermoso',   poblacion:13300, medidores_total:3500,  cobertura_pct:95.1, calidad_ica:82, temperatura_c:18.1 },
  { id:8,  nombre:'TICTI / USPHA USPHA',       subalcaldia:'Alejo Calatayud', poblacion:20800, medidores_total:5500,  cobertura_pct:94.4, calidad_ica:76, temperatura_c:20.0 },
  { id:9,  nombre:'PUKARA GRANDE / TAMBORADA', subalcaldia:'Itocta',          poblacion:52200, medidores_total:13700, cobertura_pct:95.2, calidad_ica:68, temperatura_c:21.0 },
  { id:10, nombre:'NOROESTE / NORESTE',        subalcaldia:'Adela Zamudio',   poblacion:21300, medidores_total:5600,  cobertura_pct:95.1, calidad_ica:81, temperatura_c:18.5 },
  { id:11, nombre:'MUYURINA / LAS CUADRAS',    subalcaldia:'Adela Zamudio',   poblacion:14000, medidores_total:3700,  cobertura_pct:94.8, calidad_ica:80, temperatura_c:18.5 },
  { id:12, nombre:'TUPURAYA / CALA CALA SUD',  subalcaldia:'Adela Zamudio',   poblacion:40400, medidores_total:10600, cobertura_pct:95.2, calidad_ica:77, temperatura_c:19.4 },
  { id:13, nombre:'CARA CARA',                 subalcaldia:'Tunari',          poblacion:6100,  medidores_total:1600,  cobertura_pct:95.1, calidad_ica:74, temperatura_c:18.6 },
  { id:14, nombre:'VALLE HERMOSO SUD',         subalcaldia:'Valle Hermoso',   poblacion:23000, medidores_total:6000,  cobertura_pct:95.8, calidad_ica:82, temperatura_c:18.1 },
  { id:15, nombre:'KHARA KHARA / PUKARA SUR',  subalcaldia:'Itocta',          poblacion:24700, medidores_total:6500,  cobertura_pct:94.9, calidad_ica:68, temperatura_c:21.0 },
];

// IDs numéricos según documento oficial (1-7 documentados, 8-14 aprox. por cobertura geográfica)
// IMPORTANTE: ID 1 = C4/CAD Municipal, ID 2 = Alcaldía Central (según tabla oficial)
const RADIOBASES_DATA = [
  { id:'1',  nombre:'C4 / CAD Municipal',             lat:-17.3936, lng:-66.1578, status:'online',   medidores_conectados:9800,  uptime_pct:99.1, errores_pct:0.041 },
  { id:'2',  nombre:'Alcaldía Central / Plaza 14',    lat:-17.3932, lng:-66.1567, status:'online',   medidores_conectados:8700,  uptime_pct:98.7, errores_pct:0.063 },
  { id:'3',  nombre:'Subalcaldía Tunari Norte',       lat:-17.3655, lng:-66.1712, status:'online',   medidores_conectados:10200, uptime_pct:99.5, errores_pct:0.028 },
  { id:'4',  nombre:'Subalcaldía Adela Zamudio',      lat:-17.3760, lng:-66.1500, status:'degraded', medidores_conectados:8100,  uptime_pct:94.3, errores_pct:0.210 },
  { id:'5',  nombre:'Base Aérea J. Wilstermann',      lat:-17.4210, lng:-66.1770, status:'online',   medidores_conectados:9300,  uptime_pct:99.1, errores_pct:0.055 },
  { id:'6',  nombre:'Cerro San Pedro',                lat:-17.3600, lng:-66.1300, status:'offline',  medidores_conectados:0,     uptime_pct:0.0,  errores_pct:0.000 },
  { id:'7',  nombre:'Colina San Sebastián',           lat:-17.4015, lng:-66.1545, status:'online',   medidores_conectados:8500,  uptime_pct:97.8, errores_pct:0.087 },
  { id:'8',  nombre:'Zona Molle / Sarco',             lat:-17.3980, lng:-66.1640, status:'online',   medidores_conectados:9600,  uptime_pct:98.2, errores_pct:0.071 },
  { id:'9',  nombre:'Sacaba Centro',                  lat:-17.3700, lng:-66.0800, status:'online',   medidores_conectados:7800,  uptime_pct:96.4, errores_pct:0.112 },
  { id:'10', nombre:'Valle Hermoso',                  lat:-17.4100, lng:-66.1300, status:'online',   medidores_conectados:8900,  uptime_pct:98.9, errores_pct:0.049 },
  { id:'11', nombre:'Alalay Norte',                   lat:-17.3890, lng:-66.1420, status:'degraded', medidores_conectados:7200,  uptime_pct:93.1, errores_pct:0.195 },
  { id:'12', nombre:'Zona Industrial / Itocta',       lat:-17.4350, lng:-66.1600, status:'online',   medidores_conectados:6400,  uptime_pct:97.5, errores_pct:0.098 },
  { id:'13', nombre:'Alejo Calatayud Sur',            lat:-17.4180, lng:-66.1380, status:'online',   medidores_conectados:7600,  uptime_pct:98.1, errores_pct:0.082 },
  { id:'14', nombre:'Pukara Grande / Khara Khara',    lat:-17.4520, lng:-66.1750, status:'online',   medidores_conectados:8200,  uptime_pct:99.0, errores_pct:0.037 },
];

// ── Cassandra Client ─────────────────────────────────────────────────────────
const client = new cassandra.Client({
  contactPoints: HOSTS,
  localDataCenter: DC,
  queryOptions: { consistency: cassandra.types.consistencies.one },
  socketOptions: { connectTimeout: 30000 },
});

const OPTS = { prepare: true };

// ── CSV Parser ───────────────────────────────────────────────────────────────
function parseLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function readCSV(file) {
  console.log(`  Leyendo ${file.split('\\').pop()}...`);
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim());
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(l => {
    const f = parseLine(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = f[i] !== undefined ? f[i] : ''; });
    return obj;
  });
}

// ── Date Utils ───────────────────────────────────────────────────────────────
function parseMDY(str) {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split(' ');
  const dp = parts[0].split('/');
  if (dp.length !== 3) return null;
  const yr = parseInt(dp[2]) + (parseInt(dp[2]) < 50 ? 2000 : 1900);
  if (parts[1]) {
    const [h, m] = parts[1].split(':');
    return new Date(yr, parseInt(dp[0]) - 1, parseInt(dp[1]), parseInt(h), parseInt(m || 0));
  }
  return new Date(yr, parseInt(dp[0]) - 1, parseInt(dp[1]));
}

function parseISO(str) {
  if (!str || !str.trim()) return null;
  const d = new Date(str.trim());
  return isNaN(d.getTime()) ? null : d;
}

function getPeriodo(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function toLocalDate(d) {
  if (!d) return null;
  return new cassandra.types.LocalDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function flt(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function int(v) { const n = parseInt(v);   return isNaN(n) ? null : n; }

// ── Concurrent Executor ──────────────────────────────────────────────────────
async function concurrent(items, fn, limit = 100) {
  for (let i = 0; i < items.length; i += limit) {
    await Promise.all(
      items.slice(i, i + limit).map(item =>
        fn(item).catch(e => process.stderr.write(`ERR: ${e.message}\n`))
      )
    );
  }
}

// ── Schema ───────────────────────────────────────────────────────────────────
async function ensureInfraestructurasTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${KS}.infraestructuras (
      numero_catastro TEXT PRIMARY KEY,
      propietario     TEXT,
      ci              TEXT,
      direccion       TEXT,
      zona            TEXT,
      distrito        INT,
      manzano         INT,
      lote            INT,
      superficie_m2   FLOAT,
      area_construida FLOAT,
      uso_suelo       TEXT,
      matricula_ddrr  TEXT,
      valor_catastral FLOAT,
      impuesto_anual  FLOAT,
      latitud         FLOAT,
      longitud        FLOAT
    )`);
  // índices opcionales — ignorar si ya existen
  for (const q of [
    `CREATE INDEX IF NOT EXISTS idx_infra_zona     ON ${KS}.infraestructuras (zona)`,
    `CREATE INDEX IF NOT EXISTS idx_infra_distrito ON ${KS}.infraestructuras (distrito)`,
  ]) {
    await client.execute(q).catch(() => {});
  }
}

// ── Seeders ──────────────────────────────────────────────────────────────────
async function seedRadiobases() {
  console.log('\n[0/5] Poblando radiobases LoRaWAN...');
  const q = `INSERT INTO ${KS}.radiobases
    (id, errores_pct, lat, lng, medidores_conectados, status, uptime_pct)
    VALUES (?,?,?,?,?,?,?)`;
  await concurrent(RADIOBASES_DATA, async (r) => {
    await client.execute(q, [
      r.id, r.errores_pct, r.lat, r.lng,
      r.medidores_conectados, r.status, r.uptime_pct,
    ], OPTS);
  });
  console.log(`  ✓ ${RADIOBASES_DATA.length} radiobases`);
}

async function seedDistritos() {
  console.log('\n[1/5] Poblando distritos...');
  const q = `INSERT INTO ${KS}.distritos
    (id, nombre, subalcaldia, consumo_m3, presion_psi, poblacion,
     medidores_total, cobertura_pct, calidad_ica, temperatura_c, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
  await concurrent(DISTRITOS, async (d) => {
    await client.execute(q, [
      d.id, d.nombre, d.subalcaldia,
      parseFloat((Math.random() * 400 + 200).toFixed(1)),
      parseFloat((Math.random() * 5 + 12).toFixed(1)),
      d.poblacion, d.medidores_total, d.cobertura_pct, d.calidad_ica,
      d.temperatura_c, 'normal',
    ], OPTS);
  });
  console.log(`  ✓ ${DISTRITOS.length} distritos`);
}

async function seedInfraestructuras(rows) {
  console.log(`\n[2/5] Poblando infraestructuras (${rows.length.toLocaleString()} filas)...`);
  const q = `INSERT INTO ${KS}.infraestructuras
    (numero_catastro, propietario, ci, direccion, zona, distrito,
     manzano, lote, superficie_m2, area_construida, uso_suelo,
     matricula_ddrr, valor_catastral, impuesto_anual, latitud, longitud)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  let done = 0;
  await concurrent(rows, async (r) => {
    await client.execute(q, [
      r.numero_catastro, r.propietario, r.ci, r.direccion, r.zona,
      int(r.distrito),   int(r.manzano), int(r.lote),
      flt(r.superficie_terreno), flt(r.area_construida),
      r.uso_suelo, r.matricula_ddrr,
      flt(r.valor_catastral), flt(r.impuesto_anual),
      flt(r.latitud), flt(r.longitud),
    ], OPTS);
    done++;
    if (done % 5000 === 0) process.stdout.write(`  → ${done.toLocaleString()}/${rows.length.toLocaleString()}\r`);
  }, 150);
  console.log(`  ✓ ${done.toLocaleString()} infraestructuras                   `);
}

async function seedMedidores(rows, medLocMap) {
  console.log(`\n[3/5] Poblando medidores (${rows.length.toLocaleString()} filas)...`);
  const q = `INSERT INTO ${KS}.medidores
    (serie, modelo, estado, distrito_id, zona, instalacion,
     ultima_lectura, codigo_error, firmware)
    VALUES (?,?,?,?,?,?,?,?,?)`;
  let done = 0;
  await concurrent(rows, async (r) => {
    const loc  = medLocMap[r.medidor_iot] || {};
    const inst = parseISO(r.fecha_instalacion);
    await client.execute(q, [
      r.medidor_iot,
      TIPO_MEDIDOR[r.tipo_medidor_id] || 'Desconocido',
      r.estado || 'Operativo',
      loc.distrito_id || null,
      loc.zona || null,
      inst ? toLocalDate(inst) : null,
      null, null, null,
    ], OPTS);
    done++;
    if (done % 5000 === 0) process.stdout.write(`  → ${done.toLocaleString()}/${rows.length.toLocaleString()}\r`);
  }, 150);
  console.log(`  ✓ ${done.toLocaleString()} medidores                          `);
}

async function seedInmuebles(rows, catastroMap, medModeloMap) {
  console.log(`\n[4/5] Poblando inmuebles/contratos (${rows.length.toLocaleString()} filas)...`);
  const q = `INSERT INTO ${KS}.inmuebles
    (contrato, ci, nombre, direccion, zona, distrito_id, categoria,
     medidor_serie, medidor_modelo, instalacion, estado_servicio,
     consumo_actual_m3, consumo_anterior_m3, deuda_total)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  let done = 0;
  await concurrent(rows, async (r) => {
    const cat = catastroMap[r.numero_catastro] || {};
    await client.execute(q, [
      r.numero_contrato,
      r.ci_titular,
      r.titular_contrato,
      cat.direccion || '',
      cat.zona || '',
      cat.distrito_id || null,
      r.subcategoria || r.categoria,
      r.medidor_iot,
      medModeloMap[r.medidor_iot] || 'Desconocido',
      r.fecha_contrato,
      r.estado_contrato,
      null, null, 0.0,
    ], OPTS);
    done++;
    if (done % 5000 === 0) process.stdout.write(`  → ${done.toLocaleString()}/${rows.length.toLocaleString()}\r`);
  }, 150);
  console.log(`  ✓ ${done.toLocaleString()} inmuebles                          `);
}

async function seedLecturas(rows) {
  console.log(`\n[5/5] Poblando lecturas (${rows.length.toLocaleString()} filas)...`);
  const q = `INSERT INTO ${KS}.lecturas
    (medidor_serie, periodo, timestamp_ts, consumo_m3,
     presion_psi, temperatura_c, es_duplicado, es_excesivo)
    VALUES (?,?,?,?,?,?,?,?)`;
  let done = 0; let skipped = 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await Promise.all(rows.slice(i, i + CHUNK).map(async (r) => {
      const dt = parseMDY(r.fechaHoraLectura);
      if (!dt || !r.medidor_iot) { skipped++; return; }
      const lecAnt  = flt(r.lecturaAnterior) || 0;
      const lecAct  = flt(r.LecturaActual)   || 0;
      const consumo = Math.max(0, lecAct - lecAnt);
      await client.execute(q, [
        r.medidor_iot, getPeriodo(dt), dt,
        consumo, null, null,
        false, consumo > 45,
      ], OPTS).catch(e => { skipped++; });
      done++;
    }));
    if (done % 10000 === 0 || i + CHUNK >= rows.length) {
      process.stdout.write(`  → ${done.toLocaleString()}/${rows.length.toLocaleString()}\r`);
    }
  }
  console.log(`  ✓ ${done.toLocaleString()} lecturas  (${skipped} omitidas)    `);
}

async function seedCierreMensual() {
  console.log('\n[+] Poblando cierre_mensual (6 meses)...');
  const CIERRES = [
    { periodo:'2024-12', facturado:5420000, cobrado:4810000, pendiente:435000, incobrables:175000, eficiencia:88.7 },
    { periodo:'2025-01', facturado:5380000, cobrado:4730000, pendiente:450000, incobrables:200000, eficiencia:87.9 },
    { periodo:'2025-02', facturado:5310000, cobrado:4680000, pendiente:420000, incobrables:210000, eficiencia:88.1 },
    { periodo:'2025-03', facturado:5450000, cobrado:4820000, pendiente:410000, incobrables:220000, eficiencia:88.4 },
    { periodo:'2025-04', facturado:5390000, cobrado:4750000, pendiente:425000, incobrables:215000, eficiencia:88.1 },
    { periodo:'2025-05', facturado:5480000, cobrado:4860000, pendiente:400000, incobrables:220000, eficiencia:88.7 },
  ];
  const q = `INSERT INTO ${KS}.cierre_mensual (periodo, facturado, cobrado, pendiente, incobrables, eficiencia, cerrado_en) VALUES (?,?,?,?,?,?,?)`;
  for (const r of CIERRES)
    await client.execute(q, [r.periodo, r.facturado, r.cobrado, r.pendiente, r.incobrables, r.eficiencia, new Date()], OPTS);
  console.log(`  ✓ ${CIERRES.length} períodos de cierre`);
}

async function seedMorosos(contratoRows, catastroMap) {
  console.log('\n[+] Poblando morosos desde contratos...');
  const CATS_VALIDAS = ['R1-Residencial','R2-Residencial','R3-Residencial','R4-Residencial Alta','C1-Comercial','C2-Comercial','C3-Comercial Alta','I1-Industrial','I2-Industrial Alta'];
  const PAGOS = ['2024-07-15','2024-08-10','2024-09-12','2024-10-08','2024-11-14','2024-06-20','2024-05-18'];
  const MESES_OPS = [2,3,4,5,6,7,8,9,10,11,12];
  const q = `INSERT INTO ${KS}.morosos (contrato, nombre, zona, distrito_id, categoria, deuda_total, meses_deuda, ultimo_pago, medidor_serie) VALUES (?,?,?,?,?,?,?,?,?)`;
  const muestra = contratoRows.filter((_, i) => i % 12 === 0).filter(r => r.numero_contrato && r.titular_contrato).slice(0, 200);
  await concurrent(muestra, async (r) => {
    const cat = catastroMap[r.numero_catastro] || {};
    const meses = MESES_OPS[Math.floor(Math.random() * MESES_OPS.length)];
    const subcatOk = CATS_VALIDAS.includes(r.subcategoria || r.categoria) ? (r.subcategoria || r.categoria) : 'R3-Residencial';
    const base = subcatOk.startsWith('I') ? 850 : subcatOk.startsWith('C') ? 420 : subcatOk.includes('Alta') ? 280 : 145;
    const deuda = parseFloat((base * meses * (0.9 + Math.random() * 0.2)).toFixed(2));
    await client.execute(q, [r.numero_contrato, r.titular_contrato, cat.zona || '', cat.distrito_id || 1, subcatOk, deuda, meses, PAGOS[Math.floor(Math.random() * PAGOS.length)], r.medidor_iot || ''], OPTS);
  });
  console.log(`  ✓ ${muestra.length} morosos`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log('══════════════════════════════════════════');
  console.log(' SEMAPA — Seeder de base de datos         ');
  console.log('══════════════════════════════════════════');
  console.log(`Cassandra: ${HOSTS.join(',')}  Keyspace: ${KS}`);
  console.log(`CSVs:      ${CSV_DIR}\n`);

  await client.connect();
  console.log('Conectado al cluster Cassandra.');
  await ensureInfraestructurasTable();

  // Leer todos los CSVs en memoria
  console.log('\nCargando CSVs...');
  const infraRows    = readCSV(FILES.infra);
  const medRows      = readCSV(FILES.medidores);
  const contratoRows = readCSV(FILES.contratos);
  const lectRows     = readCSV(FILES.lecturas);

  // Mapas de enriquecimiento
  const catastroMap = {};
  for (const r of infraRows) {
    catastroMap[r.numero_catastro] = {
      zona: r.zona, distrito_id: int(r.distrito), direccion: r.direccion,
    };
  }
  const medModeloMap = {};
  for (const r of medRows) {
    medModeloMap[r.medidor_iot] = TIPO_MEDIDOR[r.tipo_medidor_id] || 'Desconocido';
  }
  const medLocMap = {};
  for (const r of contratoRows) {
    const cat = catastroMap[r.numero_catastro] || {};
    medLocMap[r.medidor_iot] = { zona: cat.zona, distrito_id: cat.distrito_id };
  }

  // Insertar
  await seedRadiobases();
  await seedDistritos();
  await seedInfraestructuras(infraRows);
  await seedMedidores(medRows, medLocMap);
  await seedInmuebles(contratoRows, catastroMap, medModeloMap);
  await seedLecturas(lectRows);
  await seedCierreMensual();
  await seedMorosos(contratoRows, catastroMap);

  await client.shutdown();
  const seg = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n══════════════════════════════════════════');
  console.log(` ✅ Seeding completado en ${seg}s`);
  console.log('══════════════════════════════════════════');
}

main().catch(e => {
  console.error('\n[FATAL]', e.message);
  client.shutdown().finally(() => process.exit(1));
});
