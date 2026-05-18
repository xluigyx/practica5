// backend/src/billing.js
// Algoritmo de facturación — Tarifario 9 categorías SEMAPA

const TARIFARIO = {
  'R1-Preferencial':       { cargo_fijo:  8.50, t1_lim:10, t1_p:0.90, t2_lim:20, t2_p:1.20, t3_p:2.10 },
  'R2-Social':             { cargo_fijo: 10.00, t1_lim:15, t1_p:1.10, t2_lim:25, t2_p:1.60, t3_p:2.50 },
  'R3-Residencial':        { cargo_fijo: 12.50, t1_lim:20, t1_p:1.40, t2_lim:35, t2_p:2.10, t3_p:3.20 },
  'R4-Residencial Alta':   { cargo_fijo: 15.00, t1_lim:20, t1_p:1.80, t2_lim:45, t2_p:2.80, t3_p:4.50 },
  'Comercial':             { cargo_fijo: 25.00, t1_lim:30, t1_p:2.50, t2_lim:60, t2_p:3.80, t3_p:5.20 },
  'CE-Comercial Especial': { cargo_fijo: 35.00, t1_lim:30, t1_p:3.00, t2_lim:70, t2_p:4.50, t3_p:6.00 },
  'Industrial':            { cargo_fijo: 45.00, t1_lim:50, t1_p:3.20, t2_lim:100,t2_p:4.60, t3_p:6.80 },
  'P-Provisional':         { cargo_fijo: 20.00, t1_lim:15, t1_p:2.20, t2_lim:30, t2_p:3.20, t3_p:5.00 },
  'S-Social':              { cargo_fijo:  6.00, t1_lim: 8, t1_p:0.70, t2_lim:15, t2_p:1.00, t3_p:1.80 },
};

const UMBRAL_EXCESO_ONU = 45; // m³/mes

/**
 * Calcula la factura mensual aplicando el tarifario de 9 categorías.
 * - cargo_fijo: cubre los primeros 12m³ base
 * - excedente: se cobra por tramos (t1, t2, t3) sobre los m³ adicionales
 */
function calcularFactura(categoria, consumoM3) {
  const t = TARIFARIO[categoria];
  if (!t) throw new Error(`Categoría desconocida: ${categoria}`);

  const esExcesivo = consumoM3 > UMBRAL_EXCESO_ONU;
  const excedente  = Math.max(0, consumoM3 - 12);
  const desglose   = [];
  let cargo_consumo = 0;

  if (excedente > 0) {
    const t1m3 = Math.min(excedente, t.t1_lim);
    if (t1m3 > 0) {
      const sub = +(t1m3 * t.t1_p).toFixed(2);
      desglose.push({ tramo: 1, m3: t1m3, precio: t.t1_p, subtotal: sub });
      cargo_consumo += sub;
    }
    if (excedente > t.t1_lim) {
      const t2m3 = Math.min(excedente - t.t1_lim, t.t2_lim - t.t1_lim);
      const sub  = +(t2m3 * t.t2_p).toFixed(2);
      desglose.push({ tramo: 2, m3: t2m3, precio: t.t2_p, subtotal: sub });
      cargo_consumo += sub;
    }
    if (excedente > t.t2_lim) {
      const t3m3 = excedente - t.t2_lim;
      const sub  = +(t3m3 * t.t3_p).toFixed(2);
      desglose.push({ tramo: 3, m3: t3m3, precio: t.t3_p, subtotal: sub });
      cargo_consumo += sub;
    }
  }

  return {
    categoria,
    consumoM3,
    esExcesivo,
    cargo_fijo:    t.cargo_fijo,
    cargo_consumo: +cargo_consumo.toFixed(2),
    total:         +(t.cargo_fijo + cargo_consumo).toFixed(2),
    desglose,
  };
}

module.exports = { calcularFactura, TARIFARIO, UMBRAL_EXCESO_ONU };
