// backend/src/kafka.js
// Kafka integration: telemetry producer, notification queue producer, and background consumer
const { Kafka } = require('kafkajs');
const nodemailer = require('nodemailer');
const { client } = require('./cassandra');
const { calcularFactura } = require('./billing');
const { generarFacturaPDF } = require('./pdfGenerator');
const { sendWhatsAppText } = require('./whatsapp');
const { buildAvisoCobranza } = require('./whatsappBot');

const TOPIC_TELEMETRY = 'semapa.lecturas.raw';
const TOPIC_NOTIFICATIONS = 'semapa.notificaciones';
const MODELOS = ['ITC100', 'Siconia', 'OY1320', 'WP20', 'LAIN'];

let producer = null;
let consumer = null;

// NodeMailer mock/SMTP configuration (utilizes a secure, lightweight transport for local demo)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'reyna.barton76@ethereal.email', // Auto-generated credentials for testing
    pass: process.env.SMTP_PASS || 'J7HjG7YfKx35W9tQeC'
  }
});

async function initKafka() {
  const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
  const kafka = new Kafka({ clientId: 'semapa-api', brokers });
  producer = kafka.producer();

  for (let i = 0; i < 10; i++) {
    try {
      await producer.connect();
      console.log(`[Kafka] Producer conectado a brokers: ${brokers.join(',')}`);

      // Admin client to create topics if they don't exist
      const admin = kafka.admin();
      await admin.connect();
      await admin.createTopics({
        topics: [
          { topic: TOPIC_TELEMETRY, numPartitions: 8, replicationFactor: 1 },
          { topic: TOPIC_NOTIFICATIONS, numPartitions: 4, replicationFactor: 1 }
        ],
        waitForLeaders: true
      }).catch(() => {}); // Ignore if already exist
      await admin.disconnect();

      // Launch Kafka Consumer for Background Notification Processing
      startNotificationConsumer(kafka);

      return producer;
    } catch (e) {
      console.warn(`[Kafka] Intento de conexión ${i + 1}/10 fallido: ${e.message}`);
      await new Promise(r => setTimeout(r, 6000));
    }
  }
  console.warn('[Kafka] No se pudo conectar a los brokers — operando con simulaciones locales');
  return null;
}

/**
 * Publica una petición de notificación en la cola de Kafka.
 */
async function encolarNotificacion(canal, contrato, periodo, destino) {
  if (!producer) {
    throw new Error('Kafka no está disponible para encolar notificaciones');
  }

  const payload = { canal, contrato, periodo, destino };
  
  await producer.send({
    topic: TOPIC_NOTIFICATIONS,
    messages: [
      { key: contrato, value: JSON.stringify(payload) }
    ]
  });

  console.log(`[Kafka Producer] Notificación encolada en topic '${TOPIC_NOTIFICATIONS}':`, payload);
  return { success: true, topic: TOPIC_NOTIFICATIONS };
}

/**
 * Procesa notificaciones consumidas en segundo plano desde el topic 'semapa.notificaciones'.
 */
async function startNotificationConsumer(kafka) {
  try {
    consumer = kafka.consumer({ groupId: 'semapa-notificaciones-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC_NOTIFICATIONS, fromBeginning: false });

    console.log(`[Kafka Consumer] Suscrito al topic de notificaciones '${TOPIC_NOTIFICATIONS}'`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const valueStr = message.value.toString();
        console.log(`[Kafka Consumer] Mensaje recibido de partition ${partition}:`, valueStr);

        try {
          const { canal, contrato, periodo, destino } = JSON.parse(valueStr);

          // 1. Buscar información del inmueble en Cassandra
          const rInmueble = await client.execute(
            'SELECT * FROM inmuebles WHERE contrato = ?', [contrato], { prepare: true }
          );
          const inmueble = rInmueble.rows[0];

          if (!inmueble) {
            console.error(`[Kafka Consumer] Contrato '${contrato}' no encontrado en Cassandra. Saltando.`);
            return;
          }

          const factura = calcularFactura(inmueble.categoria, inmueble.consumo_actual_m3);
          const totalBs = factura.total + (inmueble.deuda_total || 0);
          
          let mensajeTexto = '';
          let estado = 'enviado';

          // 2. Ejecutar según el canal
          if (canal === 'email') {
            // Generar factura PDF en memoria
            const pdfBuffer = await generarFacturaPDF(inmueble, periodo);

            // Enviar email con nodemailer
            const info = await transporter.sendMail({
              from: '"SEMAPA Recaudaciones" <facturacion@semapa.gob.bo>',
              to: destino,
              subject: `💧 Factura SEMAPA ${periodo === '2025-05' ? 'Mayo 2025' : periodo} - Contrato ${contrato}`,
              text: `Estimado(a) ${inmueble.nombre},\n\nAdjuntamos su factura mensual correspondiente al periodo ${periodo}. Su consumo medido es de ${inmueble.consumo_actual_m3} m³ y el importe total a cancelar es de Bs ${totalBs.toFixed(2)}.\n\nPuede realizar el pago de forma rápida y segura mediante Pago QR Simple (Banco Nacional de Bolivia) escaneando el código QR impreso en el PDF adjunto.\n\nAtentamente,\nSEMAPA Cochabamba`,
              attachments: [
                {
                  filename: `Factura_SEMAPA_${contrato}_${periodo}.pdf`,
                  content: pdfBuffer
                }
              ]
            });

            console.log(`[Kafka Consumer] Email enviado con PDF adjunto a ${destino}. MessageId: ${info.messageId}`);
            mensajeTexto = `Factura digital enviada con PDF adjunto. SMTP MessageId: ${info.messageId}`;
          } 
          else if (canal === 'whatsapp') {
            console.warn('[Kafka Consumer] Canal whatsapp ignorado — usar Evolution webhook, no Kafka.');
            mensajeTexto = 'WhatsApp deshabilitado en cola Kafka (usar chatbot Evolution).';
            estado = 'omitido';
          } 
          else {
            // SMS / Otro
            mensajeTexto = `SEMAPA Aviso: Contrato ${contrato} tiene deuda de Bs ${totalBs.toFixed(2)}. Pague en linea mediante QR Simple (Banco BNB).`;
            console.log(`[Kafka Consumer] Enviando SMS a ${destino}: ${mensajeTexto}`);
            await new Promise(r => setTimeout(r, 400));
          }

          // 3. Registrar auditoría de envío en la tabla Cassandra `notificaciones_despacho`
          await client.execute(
            `INSERT INTO notificaciones_despacho (contrato, timestamp_ts, canal, periodo, destino, mensaje, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              contrato,
              new Date(),
              canal,
              periodo,
              destino,
              mensajeTexto,
              estado
            ],
            { prepare: true }
          );

          console.log(`[Kafka Consumer] Notificación registrada exitosamente en Cassandra para contrato ${contrato}`);

        } catch (err) {
          console.error('[Kafka Consumer Error procesando mensaje]', err.message);
        }
      }
    });

  } catch (err) {
    console.error('[Kafka Consumer Connect Error]', err.message);
  }
}

/**
 * Simula la llegada de N lecturas de medidores IoT.
 * 0.07% son duplicados (misma lectura desde 2 radiobases).
 */
async function publicarLecturas(n = 100) {
  if (!producer) return { enviados: 0, error: 'Kafka no disponible' };

  const mensajes = [];
  const ahora = Date.now();

  for (let i = 0; i < n; i++) {
    const modelo = MODELOS[i % 5];
    const serie = `${modelo}-${String(10000 + i).padStart(6, '0')}`;
    const base = {
      serieMedidor: serie,
      radibaseId: `RB-${String((i % 32) + 1).padStart(3, '0')}`,
      timestamp: ahora - i * 30000,
      consumo: +(Math.random() * 5 + 0.5).toFixed(3),
      rssi: -(60 + Math.floor(Math.random() * 40))
    };
    mensajes.push({ key: serie, value: JSON.stringify(base) });
    // 0.07% duplicado
    if (Math.random() < 0.0007) {
      mensajes.push({
        key: serie,
        value: JSON.stringify({
          ...base,
          radibaseId: `RB-${String(((i + 1) % 32) + 1).padStart(3, '0')}`,
          timestamp: ahora - i * 30000 + 30000
        })
      });
    }
  }

  await producer.send({ topic: TOPIC_TELEMETRY, messages });
  return { enviados: mensajes.length, duplicados: Math.round(n * 0.0007) };
}

module.exports = { initKafka, encolarNotificacion, publicarLecturas };
