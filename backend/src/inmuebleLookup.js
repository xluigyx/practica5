// backend/src/inmuebleLookup.js — Búsqueda compartida (tótem, WhatsApp bot, API)
const { client } = require('./cassandra');
const { calcularFactura } = require('./billing');

const BILLING_CATS = ['R1-Residencial','R2-Residencial','R3-Residencial','R4-Residencial Alta','C-Comercial','CE-Comercial Especial','I-Industrial','P-Preferencial','S-Social'];

function normalizeCategoria(v) {
  if (!v) return 'R3-Residencial';
  const s = v.trim();
  if (BILLING_CATS.includes(s)) return s;
  const sl = s.toLowerCase();
  if (sl.startsWith('r1') || sl.includes('preferencial')) return 'R1-Residencial';
  if (sl.startsWith('r2') || sl.includes('social')) return 'R2-Residencial';
  if (sl.startsWith('r4') || sl.includes('alta')) return 'R4-Residencial Alta';
  if (sl.startsWith('r')) return 'R3-Residencial';
  if (sl.startsWith('ce') || sl.includes('especial')) return 'CE-Comercial Especial';
  if (sl.startsWith('c')) return 'C-Comercial';
  if (sl.startsWith('i')) return 'I-Industrial';
  if (sl.startsWith('p')) return 'P-Preferencial';
  if (sl.startsWith('s')) return 'S-Social';
  return 'R3-Residencial';
}

function normalizeEstado(v) {
  const s = (v || '').toLowerCase().trim();
  if (s === 'moroso' || s === 'mora' || s === 'en mora') return 'moroso';
  if (s === 'suspendido' || s === 'suspendida' || s === 'cortado' || s === 'cortada' || s === 'inactivo') return 'suspendido';
  return 'al-dia';
}

async function buscarInmueble(q) {
  const query = (q || '').trim();
  if (!query) return null;

  let row = null;

  // Try contrato lookup first (PK, O(1)) — accepts any format (CT-, CBB-, etc.)
  for (const variant of [query, query.toUpperCase(), query.toLowerCase()]) {
    const r = await client.execute(
      'SELECT * FROM inmuebles WHERE contrato=?',
      [variant],
      { prepare: true }
    );
    if (r.rows[0]) { row = r.rows[0]; break; }
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

  const rMoroso = await client.execute(
    'SELECT deuda_total, meses_deuda FROM morosos WHERE contrato = ?',
    [row.contrato],
    { prepare: true }
  );
  const moroso = rMoroso.rows[0] || null;

  const consumo  = row.consumo_actual_m3 != null ? row.consumo_actual_m3 : 0;
  const categoria = normalizeCategoria(row.categoria || row.subcategoria);
  const factura  = calcularFactura(categoria, consumo);

  const deudaReal = moroso ? (moroso.deuda_total || 0) : (row.deuda_total || 0);
  const mesesDeuda = moroso ? (moroso.meses_deuda || 0) : 0;

  return {
    inmueble: {
      contrato:          row.contrato,
      ci:                row.ci || '',
      nombre:            row.nombre || row.titular_contrato || '',
      direccion:         row.direccion || '',
      zona:              row.zona || '',
      distritoId:        row.distrito_id || 0,
      categoria,
      medidorSerie:      row.medidor_serie || row.medidor_iot || '',
      medidorModelo:     row.medidor_modelo || 'Desconocido',
      instalacion:       row.instalacion ? String(row.instalacion) : '',
      estadoServicio:    normalizeEstado(row.estado_servicio || row.estado_contrato),
      consumoActualM3:   consumo,
      consumoAnteriorM3: row.consumo_anterior_m3 != null ? row.consumo_anterior_m3 : 0,
      deudaTotal:        deudaReal,
      mesesDeuda,
    },
    factura,
  };
}

module.exports = { buscarInmueble };
