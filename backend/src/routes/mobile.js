const { Router } = require('express');
const { client } = require('../cassandra');

const router = Router();

const LOCATION_CACHE_TTL_MS = Number(process.env.MOBILE_LOCATION_CACHE_TTL_MS || 10 * 60 * 1000);
const DEFAULT_ACTIVE_PERIOD = process.env.PERIODO_ACTIVO || '2026-02';

let locationCache = {
  expiresAt: 0,
  rows: null,
  loading: null,
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeCi(value) {
  return normalizeText(value).replace(/[^0-9A-Z]/g, '');
}

function inferDistritoIdFromZona(zona) {
  const z = normalizeText(zona);
  if (!z) return null;

  if (/(TAMBORADA|PUKARA GRANDE|MAICA)/.test(z)) return 9;
  if (/(KHARA KHARA|KARA KARA|CARA CARA|ARRUMANI)/.test(z)) return 15;
  if (/(QUERU QUERU|ARANJUEZ|TUNARI)/.test(z)) return 1;
  if (/(CALA CALA|MAYORAZGO)/.test(z)) return 2;
  if (/(SARCO|SARCOBAMBA)/.test(z)) return 3;
  if (/(CONA CONA|HIPODROMO|COÑA COÑA)/.test(z)) return 4;
  if (/(JAIHUAYCO|LACMA)/.test(z)) return 5;
  if (/(ALALAY NORTE)/.test(z)) return 6;
  if (/(ALALAY SUD|ALALAY SUR)/.test(z)) return 7;
  if (/(TICTI|USPHA USPHA)/.test(z)) return 8;
  if (/(NOROESTE|NORESTE|CENTRO)/.test(z)) return 10;
  if (/(MUYURINA|CUADRAS)/.test(z)) return 11;
  if (/(TUPURAYA|INDUSTRIAL)/.test(z)) return 12;
  if (/(VALLE HERMOSO)/.test(z)) return 14;
  return null;
}

function resolveDistritoId(inmueble, loc) {
  return inmueble.distrito_id || loc.distrito || inferDistritoIdFromZona(inmueble.zona || loc.zona);
}

function addressKey(direccion, zona) {
  return `${normalizeText(zona)}|${normalizeText(direccion)}`;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPeriod(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function recentPeriods(months = 36) {
  const seen = new Set();
  const out = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const p = toPeriod(d);
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }

  for (const p of [DEFAULT_ACTIVE_PERIOD, '2026-02']) {
    if (p && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }

  return out;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tarifaAlias(categoria) {
  const s = String(categoria || '').trim();
  const m = s.match(/^(R[1-4]|CE|C|I|P|S)\b/i);
  return m ? m[1].toUpperCase() : s || null;
}

function scanAll(cql, params = []) {
  return new Promise((resolve, reject) => {
    const rows = [];
    client.eachRow(
      cql,
      params,
      { prepare: params.length > 0, autoPage: true, fetchSize: 5000 },
      (_n, row) => rows.push(row),
      (err) => (err ? reject(err) : resolve(rows))
    );
  });
}

async function buildMobileLocationIndex() {
  const [infraRows, inmuebleRows, distritoRows] = await Promise.all([
    scanAll('SELECT ci, direccion, zona, distrito, latitud, longitud FROM infraestructuras'),
    scanAll('SELECT contrato, ci, direccion, zona, distrito_id, medidor_serie FROM inmuebles'),
    scanAll('SELECT id, nombre FROM distritos'),
  ]);

  const distritos = new Map();
  for (const d of distritoRows) {
    distritos.set(d.id, d.nombre);
  }

  const infraByCi = new Map();
  const infraByAddress = new Map();
  for (const row of infraRows) {
    const lat = toNumber(row.latitud);
    const lon = toNumber(row.longitud);
    if (lat == null || lon == null) continue;

    const infra = {
      lat,
      lon,
      direccion: row.direccion || '',
      zona: row.zona || '',
      distrito: row.distrito ?? null,
    };

    const ciKey = normalizeCi(row.ci);
    if (ciKey && !infraByCi.has(ciKey)) infraByCi.set(ciKey, infra);

    const addrKey = addressKey(row.direccion, row.zona);
    if (addrKey !== '|' && !infraByAddress.has(addrKey)) infraByAddress.set(addrKey, infra);
  }

  const seenSeries = new Set();
  const mobileRows = [];
  for (const inm of inmuebleRows) {
    const serie = inm.medidor_serie;
    if (!serie || seenSeries.has(serie)) continue;

    const loc =
      infraByCi.get(normalizeCi(inm.ci)) ||
      infraByAddress.get(addressKey(inm.direccion, inm.zona));

    if (!loc) continue;

    const distritoId = resolveDistritoId(inm, loc);
    mobileRows.push({
      medidor_id: serie,
      numero_serie: serie,
      direccion: inm.direccion || loc.direccion || '',
      distrito: distritoId != null ? (distritos.get(distritoId) || `D-${distritoId}`) : '',
      zona: inm.zona || loc.zona || '',
      numero_contrato: inm.contrato || null,
      lat: loc.lat,
      lon: loc.lon,
    });
    seenSeries.add(serie);
  }

  return mobileRows;
}

async function getMobileLocationIndex() {
  const now = Date.now();
  if (locationCache.rows && locationCache.expiresAt > now) {
    return locationCache.rows;
  }

  if (!locationCache.loading) {
    locationCache.loading = buildMobileLocationIndex()
      .then((rows) => {
        locationCache = {
          rows,
          expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
          loading: null,
        };
        return rows;
      })
      .catch((err) => {
        locationCache.loading = null;
        throw err;
      });
  }

  return locationCache.loading;
}

router.get('/medidores/cercanos', async (req, res) => {
  const lat = toNumber(req.query.lat);
  const lon = toNumber(req.query.lon);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '8', 10) || 8, 1), 100);
  const maxKm = Math.min(Math.max(toNumber(req.query.max_km) ?? 5, 0.1), 100);

  if (lat == null || lon == null) {
    return res.status(400).json({ error: 'lat y lon son requeridos' });
  }

  try {
    const rows = await getMobileLocationIndex();
    const cercanos = rows
      .map((m) => ({
        ...m,
        distancia_km: haversineKm(lat, lon, m.lat, m.lon),
      }))
      .filter((m) => m.distancia_km <= maxKm)
      .sort((a, b) => a.distancia_km - b.distancia_km)
      .slice(0, limit)
      .map(({ lat: _lat, lon: _lon, ...m }) => ({
        ...m,
        distancia_km: Number(m.distancia_km.toFixed(3)),
      }));

    res.json(cercanos);
  } catch (err) {
    console.error('[mobile /medidores/cercanos]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/consultas/contrato/:numero_contrato', async (req, res) => {
  try {
    const r = await client.execute(
      'SELECT nombre, categoria, estado_servicio FROM inmuebles WHERE contrato = ?',
      [req.params.numero_contrato],
      { prepare: true }
    );

    const row = r.rows[0];
    if (!row) {
      return res.json({
        nombre_titular: null,
        categoria: null,
        tarifa_alias: null,
        estado: null,
      });
    }

    res.json({
      nombre_titular: row.nombre || null,
      categoria: row.categoria || null,
      tarifa_alias: tarifaAlias(row.categoria),
      estado: row.estado_servicio || null,
    });
  } catch (err) {
    console.error('[mobile /consultas/contrato]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/lecturas/ultima/:numero_serie', async (req, res) => {
  try {
    for (const periodo of recentPeriods()) {
      const r = await client.execute(
        'SELECT timestamp_ts, consumo_m3 FROM lecturas WHERE medidor_serie = ? AND periodo = ? LIMIT 1',
        [req.params.numero_serie, periodo],
        { prepare: true }
      );

      const row = r.rows[0];
      if (row) {
        return res.json({
          ultima_lectura: row.consumo_m3 != null ? Number(row.consumo_m3) : null,
          fecha: row.timestamp_ts ? new Date(row.timestamp_ts).toISOString() : null,
          periodo,
        });
      }
    }

    res.json({ ultima_lectura: null, fecha: null, periodo: null });
  } catch (err) {
    console.error('[mobile /lecturas/ultima]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/lecturas/manual', async (req, res) => {
  const medidorId = String(req.body?.medidor_id || '').trim();
  const lectura = toNumber(req.body?.lectura);
  const observaciones = req.body?.observaciones || null;

  if (!medidorId || lectura == null || lectura < 0) {
    return res.status(400).json({ error: 'medidor_id y lectura válida son requeridos' });
  }

  try {
    const medidor = await client.execute(
      'SELECT serie FROM medidores WHERE serie = ?',
      [medidorId],
      { prepare: true }
    );

    if (!medidor.rows[0]) {
      const inmueble = await client.execute(
        'SELECT contrato FROM inmuebles WHERE medidor_serie = ?',
        [medidorId],
        { prepare: true }
      );
      if (!inmueble.rows[0]) {
        return res.status(404).json({ error: 'medidor no encontrado' });
      }
    }

    const now = new Date();
    const periodo = toPeriod(now);

    await client.execute(
      `INSERT INTO lecturas
        (medidor_serie, periodo, timestamp_ts, consumo_m3, presion_psi, temperatura_c, es_duplicado, es_excesivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [medidorId, periodo, now, lectura, null, null, false, lectura > 45],
      { prepare: true }
    );

    res.status(201).json({
      ok: true,
      medidor_id: medidorId,
      lectura,
      observaciones,
      periodo,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('[mobile /lecturas/manual]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
