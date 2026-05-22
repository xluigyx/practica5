// backend/src/inmuebleLookup.js — Búsqueda compartida (tótem, WhatsApp bot, API)
const { client } = require('./cassandra');
const { calcularFactura } = require('./billing');

async function buscarInmueble(q) {
  const query = (q || '').trim();
  if (!query) return null;

  let row = null;

  if (query.toUpperCase().startsWith('CBB-')) {
    const r = await client.execute(
      'SELECT * FROM inmuebles WHERE contrato=?',
      [query.toUpperCase()],
      { prepare: true }
    );
    row = r.rows[0] || null;
  }

  if (!row) {
    const r = await client.execute(
      'SELECT * FROM inmuebles WHERE ci=?',
      [query],
      { prepare: true }
    );
    row = r.rows[0] || null;
  }

  if (!row) {
    const r = await client.execute(
      'SELECT * FROM inmuebles WHERE medidor_serie=?',
      [query],
      { prepare: true }
    );
    row = r.rows[0] || null;
  }

  if (!row) return null;

  const factura = calcularFactura(row.categoria, row.consumo_actual_m3);

  return {
    inmueble: {
      contrato: row.contrato,
      ci: row.ci,
      nombre: row.nombre,
      direccion: row.direccion,
      zona: row.zona,
      distritoId: row.distrito_id,
      categoria: row.categoria,
      medidorSerie: row.medidor_serie,
      medidorModelo: row.medidor_modelo,
      instalacion: row.instalacion,
      estadoServicio: row.estado_servicio,
      consumoActualM3: row.consumo_actual_m3,
      consumoAnteriorM3: row.consumo_anterior_m3,
      deudaTotal: row.deuda_total,
    },
    factura,
  };
}

module.exports = { buscarInmueble };
