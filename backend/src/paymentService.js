// backend/src/paymentService.js — Pagos QR (compartido: API REST + chatbot WhatsApp)
const { client } = require('./cassandra');
const { calcularFactura } = require('./billing');

const paymentIntents = new Map();

function obtenerMesesDeuda(deudaTotal, mesesDeuda) {
  if (!deudaTotal || !mesesDeuda) return [];
  const meses = [];
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  let anio = 2025;
  let mesIdx = 3;
  const montoMensual = parseFloat((deudaTotal / mesesDeuda).toFixed(2));
  let acumulado = 0;

  for (let i = 0; i < mesesDeuda; i++) {
    const periodo = `${anio}-${String(mesIdx + 1).padStart(2, '0')}`;
    const nombre = `${nombresMeses[mesIdx]} ${anio}`;
    let monto = montoMensual;
    if (i === mesesDeuda - 1) {
      monto = parseFloat((deudaTotal - acumulado).toFixed(2));
    } else {
      acumulado += monto;
    }
    meses.unshift({ id: mesesDeuda - i, periodo, nombre, monto, estado: 'vencido' });
    mesIdx--;
    if (mesIdx < 0) {
      mesIdx = 11;
      anio--;
    }
  }
  return meses;
}

async function getDesgloseContrato(contrato) {
  const rInmueble = await client.execute(
    'SELECT * FROM inmuebles WHERE contrato = ?',
    [contrato],
    { prepare: true }
  );
  const inmueble = rInmueble.rows[0];
  if (!inmueble) return null;

  let mesesDeuda = 0;
  const rMoroso = await client.execute(
    'SELECT meses_deuda FROM morosos WHERE contrato = ?',
    [contrato],
    { prepare: true }
  );
  if (rMoroso.rows[0]) mesesDeuda = rMoroso.rows[0].meses_deuda;

  const desgloseVencido = obtenerMesesDeuda(inmueble.deuda_total, mesesDeuda);
  const facturaActual = calcularFactura(inmueble.categoria, inmueble.consumo_actual_m3);

  return {
    contrato,
    deudaTotal: inmueble.deuda_total,
    mesesDeuda,
    desgloseVencido,
    facturaActual: {
      periodo: '2025-05',
      nombre: 'Mayo 2025 (Mes Actual)',
      monto: facturaActual.total,
      estado: 'pendiente',
    },
  };
}

function createQrIntent(contrato, meses, montoBs) {
  const intentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const cuentaBanco = '3503205520';
  const banco = 'Banco Nacional de Bolivia (BNB)';
  const beneficiario = 'SEMAPA - Recaudaciones Oficiales';

  const qrSimplePayload = {
    action: 'payment',
    bank_account: cuentaBanco,
    bank_name: banco,
    recipient: beneficiario,
    amount: parseFloat(Number(montoBs).toFixed(2)),
    currency: 'BOB',
    reference: `Pago Contrato ${contrato} - Periodos: ${meses.join(', ')}`,
    intentId,
  };

  const intent = {
    id: intentId,
    contrato,
    meses,
    montoBs: parseFloat(Number(montoBs).toFixed(2)),
    metodo: 'qr_simple',
    cuentaBanco,
    banco,
    paymentUri: JSON.stringify(qrSimplePayload),
    status: 'esperando',
    txHash: null,
    confirmations: 0,
    ts: Date.now(),
  };

  paymentIntents.set(intentId, intent);
  return { intent, qrSimplePayload };
}

function simulateTransaction(intentId) {
  const intent = paymentIntents.get(intentId);
  if (!intent) return null;
  const txHash = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
  intent.txHash = txHash;
  intent.status = 'detectado';
  intent.confirmations = 0;
  intent.blockNumber = Math.floor(Math.random() * 100000) + 500000;
  return { intent, txHash };
}

async function finalizeIntentInCassandra(intent) {
  const rInmueble = await client.execute(
    'SELECT * FROM inmuebles WHERE contrato = ?',
    [intent.contrato],
    { prepare: true }
  );
  const inmueble = rInmueble.rows[0];
  if (!inmueble) return;

  const nuevaDeuda = Math.max(0, inmueble.deuda_total - intent.montoBs);
  await client.execute(
    'UPDATE inmuebles SET deuda_total = ? WHERE contrato = ?',
    [nuevaDeuda, intent.contrato],
    { prepare: true }
  );

  const rMoroso = await client.execute(
    'SELECT * FROM morosos WHERE contrato = ?',
    [intent.contrato],
    { prepare: true }
  );
  const moroso = rMoroso.rows[0];

  if (moroso) {
    const mesesPagadosCount = intent.meses.filter((m) => m !== '2025-05').length;
    const nuevosMeses = Math.max(0, moroso.meses_deuda - mesesPagadosCount);
    const nuevaDeudaMoroso = Math.max(0, moroso.deuda_total - intent.montoBs);

    if (nuevosMeses <= 0 || nuevaDeudaMoroso <= 0) {
      await client.execute('DELETE FROM morosos WHERE contrato = ?', [intent.contrato], { prepare: true });
      await client.execute(
        'UPDATE inmuebles SET estado_servicio = ? WHERE contrato = ?',
        ['al-dia', intent.contrato],
        { prepare: true }
      );
    } else {
      await client.execute(
        'UPDATE morosos SET deuda_total = ?, meses_deuda = ? WHERE contrato = ?',
        [nuevaDeudaMoroso, nuevosMeses, intent.contrato],
        { prepare: true }
      );
    }
  }

  await client.execute(
    `INSERT INTO pagos_bnb (contrato, timestamp_ts, meses_pagados, monto_bs, monto_bnb, tx_hash, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      intent.contrato,
      new Date(),
      intent.meses.length,
      parseFloat(intent.montoBs.toFixed(2)),
      0.0,
      intent.txHash,
      'completado',
    ],
    { prepare: true }
  );
}

async function advanceVerification(txHash) {
  let intent = null;
  for (const item of paymentIntents.values()) {
    if (item.txHash === txHash) {
      intent = item;
      break;
    }
  }
  if (!intent) return null;

  if (intent.status === 'detectado') {
    intent.confirmations += 1;
    if (intent.confirmations >= 3) {
      intent.status = 'completado';
      await finalizeIntentInCassandra(intent);
    }
  }

  return {
    status: intent.status,
    confirmations: intent.confirmations,
    montoBs: intent.montoBs,
    contrato: intent.contrato,
    meses: intent.meses,
    txHash: intent.txHash,
  };
}

function getIntentById(intentId) {
  return paymentIntents.get(intentId) || null;
}

function getIntentByTxHash(txHash) {
  for (const item of paymentIntents.values()) {
    if (item.txHash === txHash) return item;
  }
  return null;
}

module.exports = {
  paymentIntents,
  obtenerMesesDeuda,
  getDesgloseContrato,
  createQrIntent,
  simulateTransaction,
  advanceVerification,
  getIntentById,
  getIntentByTxHash,
};
