// backend/src/cassandra.js
// Conexión al cluster Cassandra con reintentos
const cassandra = require('cassandra-driver');

const hosts   = (process.env.CASSANDRA_HOSTS || 'cassandra-1').split(',');
const keyspace = process.env.CASSANDRA_KEYSPACE || 'semapa';
const dc       = process.env.CASSANDRA_DC || 'datacenter1';

const client = new cassandra.Client({
  contactPoints:      hosts,
  localDataCenter:    dc,
  keyspace,
  policies: {
    retry:     new cassandra.policies.retry.IdempotenceAwareRetryPolicy(new cassandra.policies.retry.RetryPolicy()),
    reconnection: new cassandra.policies.reconnection.ConstantReconnectionPolicy(5000),
  },
  socketOptions: { connectTimeout: 15000 },
});

async function connect(retries = 40) {
  for (let i = 1; i <= retries; i++) {
    try {
      await client.connect();
      console.log(`[Cassandra] Conectado al cluster ${hosts.join(',')} — keyspace: ${keyspace}`);
      return;
    } catch (e) {
      console.warn(`[Cassandra] Intento ${i}/${retries} fallido: ${e.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error('[Cassandra] No se pudo conectar tras múltiples intentos');
}

module.exports = { client, connect };
