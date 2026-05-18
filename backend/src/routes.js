// backend/src/routes.js
// Endpoints REST para los Dashboards y el Tótem SEMAPA

const { Router } = require('express');
const { client }  = require('./cassandra');
const { calcularFactura } = require('./billing');

const router = Router();

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── TÓTEM: búsqueda multimodal por CI | Contrato | Serie Medidor ──────────────
// Pattern Cassandra: SELECT … WHERE contrato=? (PK lookup, O(1))
// Para CI y serie: usa índices secundarios (permitido porque son lookups únicos)
router.get('/totem/buscar', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Parámetro q requerido' });

  try {
    let row = null;

    // Intento 1: por contrato (PK — más rápido)
    if (q.toUpperCase().startsWith('CBB-')) {
      const r = await client.execute(
        'SELECT * FROM inmuebles WHERE contrato=?', [q.toUpperCase()], { prepare: true }
      );
      row = r.rows[0] || null;
    }

    // Intento 2: por CI (índice secundario)
    if (!row) {
      const r = await client.execute(
        'SELECT * FROM inmuebles WHERE ci=?', [q], { prepare: true }
      );
      row = r.rows[0] || null;
    }

    // Intento 3: por serie de medidor (índice secundario)
    if (!row) {
      const r = await client.execute(
        'SELECT * FROM inmuebles WHERE medidor_serie=?', [q], { prepare: true }
      );
      row = r.rows[0] || null;
    }

    if (!row) return res.status(404).json({ error: 'No encontrado' });

    // Enriquecer con factura calculada
    const factura = calcularFactura(row.categoria, row.consumo_actual_m3);

    res.json({
      inmueble: {
        contrato:          row.contrato,
        ci:                row.ci,
        nombre:            row.nombre,
        direccion:         row.direccion,
        zona:              row.zona,
        distritoId:        row.distrito_id,
        categoria:         row.categoria,
        medidorSerie:      row.medidor_serie,
        medidorModelo:     row.medidor_modelo,
        instalacion:       row.instalacion,
        estadoServicio:    row.estado_servicio,
        consumoActualM3:   row.consumo_actual_m3,
        consumoAnteriorM3: row.consumo_anterior_m3,
        deudaTotal:        row.deuda_total,
      },
      factura,
    });
  } catch (err) {
    console.error('[/totem/buscar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── FACTURACIÓN: calcular factura por categoría y consumo ─────────────────────
router.post('/billing/calcular', (req, res) => {
  const { categoria, consumoM3 } = req.body;
  if (!categoria || consumoM3 == null)
    return res.status(400).json({ error: 'categoria y consumoM3 requeridos' });
  try {
    res.json(calcularFactura(categoria, Number(consumoM3)));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── ALCALDÍA: distritos con consumo y estado ──────────────────────────────────
router.get('/distritos', async (_req, res) => {
  try {
    const r = await client.execute('SELECT * FROM distritos');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ALCALDÍA: consumo promedio por distrito en rangos de 8 horas (Consultas.csv)
// SELECT consumo_total, consumo_avg, medidores_ok
// FROM consumo_distrito_8h WHERE distrito_id=? AND fecha_hora >= ? AND fecha_hora <= ?
router.get('/distritos/:id/consumo8h', async (req, res) => {
  const { id } = req.params;
  const desde  = req.query.desde || new Date(Date.now() - 8*3600*1000).toISOString();
  const hasta  = req.query.hasta || new Date().toISOString();
  try {
    const r = await client.execute(
      `SELECT * FROM consumo_distrito_8h WHERE distrito_id=?
       AND fecha_hora >= ? AND fecha_hora <= ?`,
      [parseInt(id), new Date(desde), new Date(hasta)],
      { prepare: true }
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GERENCIA: errores IoT por código (3=Alimentación,4=Conectividad,5=Config) ─
router.get('/medidores/errores', async (req, res) => {
  const codigos = (req.query.codigos || '3,4,5')
    .split(',').map(Number).filter(Boolean);
  try {
    // En Cassandra real: SELECT con ALLOW FILTERING por codigo_error
    // Aquí usamos la tabla medidores con filtro en app-level
    const r = await client.execute(
      'SELECT serie, modelo, estado, distrito_id, zona, ultima_lectura, codigo_error, bateria_pct FROM medidores'
    );
    const filtrados = r.rows.filter(m => codigos.includes(m.codigo_error));
    res.json(filtrados);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CONTABILIDAD: ranking morosos ─────────────────────────────────────────────
router.get('/morosos', async (_req, res) => {
  try {
    const r = await client.execute('SELECT * FROM morosos');
    const sorted = r.rows.sort((a, b) => b.deuda_total - a.deuda_total);
    res.json(sorted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CONTABILIDAD: cierre mensual (últimos N meses) ────────────────────────────
router.get('/cierre', async (req, res) => {
  try {
    const r = await client.execute('SELECT * FROM cierre_mensual');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GERENCIA: radiobases LoRaWAN ──────────────────────────────────────────────
router.get('/radiobases', async (_req, res) => {
  try {
    const r = await client.execute('SELECT * FROM radiobases');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── IOT: lecturas de un medidor (ventana temporal) ────────────────────────────
// SELECT * FROM lecturas WHERE medidor_serie=? AND periodo=? — O(1) Cassandra PK
router.get('/lecturas/:serie', async (req, res) => {
  const { serie }  = req.params;
  const periodo    = req.query.periodo || new Date().toISOString().slice(0, 7); // YYYY-MM
  try {
    const r = await client.execute(
      'SELECT * FROM lecturas WHERE medidor_serie=? AND periodo=?',
      [serie, periodo], { prepare: true }
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
