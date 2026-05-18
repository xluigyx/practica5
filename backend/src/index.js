// backend/src/index.js — Entry point API SEMAPA
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const { connect } = require('./cassandra');
const { initKafka, publicarLecturas } = require('./kafka');
const routes   = require('./routes');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));

app.use('/api', routes);

// Endpoint extra: disparar simulación de lecturas IoT vía Kafka
app.post('/api/iot/simular', async (req, res) => {
  const n = parseInt(req.body.n || '100');
  const { publicarLecturas: pub } = require('./kafka');
  const r = await pub(n);
  res.json(r);
});

// Iniciar servidor inmediatamente para pasar los Healthchecks de Docker
app.listen(PORT, () => {
  console.log(`[API] Servidor Express corriendo en puerto ${PORT}`);
});

async function main() {
  try {
    await connect();
    await initKafka();
      console.log(`
╔══════════════════════════════════════════════╗
║  SEMAPA API — Puerto ${PORT}                     ║
║  Cassandra: ${process.env.CASSANDRA_HOSTS}  ║
║  Kafka:     ${process.env.KAFKA_BROKERS}     ║
╠══════════════════════════════════════════════╣
║  GET  /api/health                            ║
║  GET  /api/totem/buscar?q=CBB-00123456       ║
║  POST /api/billing/calcular                  ║
║  GET  /api/distritos                         ║
║  GET  /api/morosos                           ║
║  GET  /api/cierre                            ║
║  GET  /api/radiobases                        ║
║  GET  /api/medidores/errores?codigos=3,4,5   ║
║  GET  /api/lecturas/:serie?periodo=2025-05   ║
║  POST /api/iot/simular  { n: 1000 }         ║
╚══════════════════════════════════════════════╝`);
      // startup logo printed
  } catch (err) {
    console.error('[FATAL]', err.message);
    process.exit(1);
  }
}

main();
