// backend/src/routes.js
// Endpoints REST para los Dashboards y el Tótem SEMAPA

const { Router } = require('express');
const { client }  = require('./cassandra');
const { calcularFactura } = require('./billing');
const { buscarInmueble } = require('./inmuebleLookup');
const { sendWhatsAppText, isConfigured, getProvider, buildWaMeLink, verifyWebhookSignature } = require('./whatsapp');
const { processEvolutionWebhook, processWebhookPayload } = require('./whatsappBot');

const {
  paymentIntents,
  obtenerMesesDeuda,
  getDesgloseContrato,
  createQrIntent,
  simulateTransaction,
  advanceVerification,
} = require('./paymentService');
const { sendWhatsAppText: sendWa } = require('./whatsapp');

const consultasRouter = require('./queries');

const router = Router();

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function codigoErrorFromEstado(estado) {
  const s = normalizeText(estado);
  if (s.includes('INACTIVO')) return 3;
  if (s.includes('MANTEN')) return 4;
  if (s.includes('DANADO')) return 5;
  return null;
}

// ── Las 25 Consultas del PDF ──────────────────────────────────────────────────
router.use('/consultas', consultasRouter);

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    ts: new Date(),
    whatsapp: 'evolution-webhook-v2',
    kafkaWhatsapp: false,
  })
);

// ── TÓTEM: búsqueda multimodal por CI | Contrato | Serie Medidor ──────────────
// Pattern Cassandra: SELECT … WHERE contrato=? (PK lookup, O(1))
// Para CI y serie: usa índices secundarios (permitido porque son lookups únicos)
router.get('/totem/buscar', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Parámetro q requerido' });

  try {
    const data = await buscarInmueble(q);
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    res.json(data);
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
    const rows = await new Promise((resolve, reject) => {
      const acc = [];
      client.eachRow(
        'SELECT serie, modelo, estado, distrito_id, zona, ultima_lectura, codigo_error FROM medidores',
        [], { autoPage: true, fetchSize: 5000 },
        (_n, row) => acc.push(row),
        (err) => err ? reject(err) : resolve(acc)
      );
    });
    const filtrados = rows
      .map((m) => ({
        ...m,
        codigo_error: m.codigo_error || codigoErrorFromEstado(m.estado),
      }))
      .filter(m => codigos.includes(m.codigo_error));
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

// ── GERENCIA: resumen de estados de medidores ─────────────────────────────────
router.get('/medidores/estados', async (_req, res) => {
  try {
    const counts = {};
    await new Promise((resolve, reject) => {
      client.eachRow(
        'SELECT estado FROM medidores', [],
        { autoPage: true, fetchSize: 5000 },
        (_n, row) => { const e = row.estado || 'Desconocido'; counts[e] = (counts[e] || 0) + 1; },
        (err) => err ? reject(err) : resolve()
      );
    });
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    const data = Object.entries(counts)
      .map(([estado, count]) => ({ estado, count, pct: total > 0 ? +((count / total) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.count - a.count);
    res.json({ total, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GERENCIA: descripciones de códigos de error IoT ──────────────────────────
const ERROR_CODIGOS = {
  1: 'Automático (Bien)',
  2: 'Manual',
  3: 'Falla en la alimentación eléctrica',
  4: 'Fallo en la conectividad de red',
  5: 'Configuración incorrecta del sensor o gateway',
  6: 'Obstrucción o daño en el caudalímetro',
  7: 'Problemas de firmware o software embebido',
  8: 'Error en el backend o plataforma IoT',
  9: 'Desincronización de reloj (timestamp incorrecto)',
};

router.get('/errores/codigos', (_req, res) => res.json(ERROR_CODIGOS));

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

// ── PASARELA PAGO QR SIMPLE (BNB) ─────────────────────────────────────────────

// 1. Endpoint: Obtener desglose detallado de deuda mensual
router.get('/pagos/desglose/:contrato', async (req, res) => {
  const { contrato } = req.params;
  try {
    const data = await getDesgloseContrato(contrato);
    if (!data) return res.status(404).json({ error: 'Inmueble no encontrado' });
    res.json(data);
  } catch (err) {
    console.error('[/pagos/desglose]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Endpoint: Generar intención de pago de QR Simple Bancario
router.post('/pagos/generar-qr', async (req, res) => {
  const { contrato, meses, montoBs } = req.body;
  if (!contrato || !meses || !montoBs) {
    return res.status(400).json({ error: 'contrato, meses y montoBs son requeridos' });
  }

  try {
    const { intent, qrSimplePayload } = createQrIntent(contrato, meses, montoBs);
    res.json({
      success: true,
      intentId: intent.id,
      metodo: 'qr_simple',
      cuentaBanco: intent.cuentaBanco,
      banco: intent.banco,
      montoBs: intent.montoBs,
      paymentUri: intent.paymentUri,
      qrSimplePayload,
    });
  } catch (err) {
    console.error('[/pagos/generar-qr]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. Endpoint: Simular el envío del pago desde la Wallet o el Banco (broadcasting)
router.post('/pagos/generar-transaccion-simulada', (req, res) => {
  const { intentId } = req.body;
  if (!intentId) return res.status(400).json({ error: 'intentId requerido' });

  const result = simulateTransaction(intentId);
  if (!result) return res.status(404).json({ error: 'Intención de pago no encontrada' });

  res.json({
    success: true,
    txHash: result.txHash,
    blockNumber: result.intent.blockNumber,
    status: 'detectado',
  });
});

// 4. Endpoint: Verificar y confirmar transacción (blockchain query & Cassandra write)
router.get('/pagos/verificar/:txHash', async (req, res) => {
  const { txHash } = req.params;

  try {
    const result = await advanceVerification(txHash);
    if (!result) {
      return res.status(404).json({ error: 'Transacción no encontrada en el registro de intenciones' });
    }

    res.json({
      success: true,
      ...result,
      metodo: 'qr_simple',
      montoBnb: 0.0,
    });
  } catch (err) {
    console.error('[/pagos/verificar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5. Endpoint: Listar historial de pagos BNB para el Dashboard
router.get('/pagos/bnb/historial', async (req, res) => {
  try {
    const r = await client.execute('SELECT * FROM pagos_bnb');
    // Ordenar por fecha descendente
    const sorted = r.rows.sort((a, b) => b.timestamp_ts - a.timestamp_ts);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Endpoint: Listar historial de notificaciones enviadas por Kafka para el Dashboard
router.get('/notificaciones/historial', async (req, res) => {
  try {
    const r = await client.execute('SELECT * FROM notificaciones_despacho');
    // Ordenar por fecha descendente
    const sorted = r.rows.sort((a, b) => b.timestamp_ts - a.timestamp_ts);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Webhook Evolution API (chatbot entrante)
router.post('/whatsapp/evolution/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const result = await processEvolutionWebhook(req.body);
    if (result.handled > 0) {
      console.log(`[Evolution Webhook] ${result.handled} mensaje(s) del chatbot`);
    }
  } catch (err) {
    console.error('[Evolution Webhook]', err.message);
  }
});

// Meta Cloud API (opcional)
router.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expected) {
    console.log('[WhatsApp Webhook] Verificación Meta OK');
    return res.status(200).send(challenge);
  }
  console.warn('[WhatsApp Webhook] Verificación fallida — revise WHATSAPP_VERIFY_TOKEN');
  return res.sendStatus(403);
});

router.post('/whatsapp/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  if (process.env.WHATSAPP_APP_SECRET && !verifyWebhookSignature(rawBody, signature)) {
    console.warn('[WhatsApp Webhook] Firma inválida');
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  try {
    const result = await processWebhookPayload(req.body);
    if (result.handled > 0) {
      console.log(`[WhatsApp Webhook] ${result.handled} mensaje(s) procesado(s)`);
    }
  } catch (err) {
    console.error('[WhatsApp Webhook]', err.message);
  }
});

router.get('/whatsapp/chat-link', (req, res) => {
  try {
    const link = buildWaMeLink(null, 'lulitolaredo');
    if (!link) {
      return res.status(500).json({ error: 'Número de WhatsApp de la empresa no configurado' });
    }
    res.json({ url: link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/whatsapp/status', (_req, res) => {
  const provider = getProvider();
  res.json({
    configured: isConfigured(),
    provider,
    businessPhone: process.env.WHATSAPP_BUSINESS_PHONE || null,
    chatLinkPath: '/api/whatsapp/chat-link?contrato=CBB-00123456',
    evolution: {
      url: process.env.EVOLUTION_API_URL || null,
      instance: process.env.EVOLUTION_INSTANCE || null,
      webhookPath: '/api/whatsapp/evolution/webhook',
      apiKeySet: Boolean(process.env.EVOLUTION_API_KEY),
    },
    meta: {
      webhookPath: '/api/whatsapp/webhook',
      verifyTokenSet: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      phoneNumberIdSet: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    },
    hint:
      provider === 'evolution'
        ? 'Levante Evolution API, conecte la instancia por QR y apunte el webhook a /api/whatsapp/evolution/webhook'
        : 'Configure WHATSAPP_PROVIDER=evolution y variables EVOLUTION_*',
  });
});

// Prueba manual de envío (desarrollo / dashboard)
router.post('/whatsapp/enviar', async (req, res) => {
  const { destino, mensaje } = req.body;
  if (!destino || !mensaje) {
    return res.status(400).json({ error: 'destino y mensaje son requeridos' });
  }
  try {
    const result = await sendWhatsAppText(destino, mensaje);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Notificaciones: WhatsApp → Evolution chatbot directo; Email/SMS → Kafka
router.post('/notificar', async (req, res) => {
  const { canal, contrato, periodo, destino } = req.body;
  if (!canal || !contrato || !periodo || !destino) {
    return res.status(400).json({ error: 'canal, contrato, periodo y destino son requeridos' });
  }

  try {
    const rInmueble = await client.execute(
      'SELECT contrato FROM inmuebles WHERE contrato = ?',
      [contrato],
      { prepare: true }
    );
    if (!rInmueble.rows[0]) {
      return res.status(404).json({ error: 'Contrato no encontrado en Cassandra' });
    }

    if (canal === 'whatsapp') {
      return res.status(400).json({
        error: 'WhatsApp ya no usa Kafka. El chatbot responde solo por Evolution API (webhook).',
        como_usar:
          'Desde otro celular escribe al bot, o abre el chat desde el tótem. Envía contrato, CI o medidor (ej. CBB-00448821).',
        botPhone: process.env.WHATSAPP_BOT_PHONE || process.env.WHATSAPP_BUSINESS_PHONE || '59162658425',
        webhook: '/api/whatsapp/evolution/webhook',
      });
    }

    const { encolarNotificacion } = require('./kafka');
    const result = await encolarNotificacion(canal, contrato, periodo, destino);

    res.json({
      success: true,
      message: `Notificación '${canal}' encolada en Kafka.`,
      details: result,
    });
  } catch (err) {
    console.error('[/notificar] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

