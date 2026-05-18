// backend/src/kafka.js
// Producer Kafka que simula ingesta de 120,000 medidores IoT
// Topic: semapa.lecturas.raw — 21.6M registros/mes = ~30K/hora

const { Kafka } = require('kafkajs');

const TOPIC  = 'semapa.lecturas.raw';
const MODELOS = ['ITC100','Siconia','OY1320','WP20','LAIN'];

let producer = null;

async function initKafka() {
  const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
  const kafka   = new Kafka({ clientId: 'semapa-api', brokers });
  producer      = kafka.producer();

  for (let i = 0; i < 10; i++) {
    try {
      await producer.connect();
      console.log(`[Kafka] Producer conectado a ${brokers.join(',')}`);

      // Admin: crear topic si no existe
      const admin = kafka.admin();
      await admin.connect();
      await admin.createTopics({
        topics: [{ topic: TOPIC, numPartitions: 8, replicationFactor: 1 }],
        waitForLeaders: true,
      }).catch(() => {}); // ignora si ya existe
      await admin.disconnect();
      return producer;
    } catch (e) {
      console.warn(`[Kafka] Intento ${i+1}/10: ${e.message}`);
      await new Promise(r => setTimeout(r, 6000));
    }
  }
  console.warn('[Kafka] No se pudo conectar — continuando sin mensajería');
  return null;
}

/**
 * Simula la llegada de N lecturas de medidores IoT.
 * 0.07% son duplicados (misma lectura desde 2 radiobases).
 */
async function publicarLecturas(n = 100) {
  if (!producer) return { enviados: 0, error: 'Kafka no disponible' };

  const mensajes = [];
  const ahora    = Date.now();

  for (let i = 0; i < n; i++) {
    const modelo = MODELOS[i % 5];
    const serie  = `${modelo}-${String(10000 + i).padStart(6, '0')}`;
    const base   = { serieMedidor: serie, radibaseId: `RB-${String((i%32)+1).padStart(3,'0')}`, timestamp: ahora - (i*30000), consumo: +(Math.random()*5+0.5).toFixed(3), rssi: -(60+Math.floor(Math.random()*40)) };
    mensajes.push({ key: serie, value: JSON.stringify(base) });
    // 0.07% duplicado
    if (Math.random() < 0.0007) {
      mensajes.push({ key: serie, value: JSON.stringify({ ...base, radibaseId: `RB-${String(((i+1)%32)+1).padStart(3,'0')}`, timestamp: ahora - (i*30000) + 30000 }) });
    }
  }

  await producer.send({ topic: TOPIC, messages: mensajes });
  return { enviados: mensajes.length, duplicados: Math.round(n * 0.0007) };
}

module.exports = { initKafka, publicarLecturas };
