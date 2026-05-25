// backend/src/billing.js
// Tarifario oficial SEMAPA — 9 categorías, 6 tramos, cargo fijo 12m³ base

//                            Fijo(Bs)  T1(13-25) T2(26-50) T3(51-75) T4(76-100) T5(101-150) T6(>151)
const TARIFARIO = {
  'R1-Residencial':       { cargo_fijo:  16.74, tramos:[{hasta:25,precio:1.10},{hasta:50,precio:1.26},{hasta:75,precio:1.87},{hasta:100,precio:2.39},{hasta:150,precio:2.84},{hasta:Infinity,precio:3.34}] },
  'R2-Residencial':       { cargo_fijo:  33.37, tramos:[{hasta:25,precio:1.78},{hasta:50,precio:1.98},{hasta:75,precio:2.96},{hasta:100,precio:3.59},{hasta:150,precio:4.16},{hasta:Infinity,precio:4.75}] },
  'R3-Residencial':       { cargo_fijo:  62.57, tramos:[{hasta:25,precio:2.17},{hasta:50,precio:3.38},{hasta:75,precio:3.76},{hasta:100,precio:4.36},{hasta:150,precio:4.96},{hasta:Infinity,precio:5.54}] },
  'R4-Residencial Alta':  { cargo_fijo: 104.22, tramos:[{hasta:25,precio:2.58},{hasta:50,precio:2.80},{hasta:75,precio:4.39},{hasta:100,precio:4.99},{hasta:150,precio:5.59},{hasta:Infinity,precio:6.20}] },
  'C-Comercial':          { cargo_fijo: 125.16, tramos:[{hasta:25,precio:5.35},{hasta:50,precio:5.73},{hasta:75,precio:6.14},{hasta:100,precio:6.53},{hasta:150,precio:6.92},{hasta:Infinity,precio:7.34}] },
  'CE-Comercial Especial':{ cargo_fijo: 145.98, tramos:[{hasta:25,precio:8.72},{hasta:50,precio:8.72},{hasta:75,precio:9.12},{hasta:100,precio:9.50},{hasta:150,precio:9.90},{hasta:Infinity,precio:10.29}] },
  'I-Industrial':         { cargo_fijo: 112.64, tramos:[{hasta:25,precio:4.95},{hasta:50,precio:5.66},{hasta:75,precio:5.94},{hasta:100,precio:6.33},{hasta:150,precio:6.73},{hasta:Infinity,precio:7.11}] },
  'P-Preferencial':       { cargo_fijo:  54.96, tramos:[{hasta:25,precio:2.17},{hasta:50,precio:2.39},{hasta:75,precio:2.96},{hasta:100,precio:3.35},{hasta:150,precio:3.76},{hasta:Infinity,precio:4.16}] },
  'S-Social':             { cargo_fijo:  91.72, tramos:[{hasta:25,precio:3.57},{hasta:50,precio:3.77},{hasta:75,precio:3.96},{hasta:100,precio:4.35},{hasta:150,precio:4.75},{hasta:Infinity,precio:5.15}] },
};

const UMBRAL_EXCESO_ONU = 45; // m³/mes

function calcularFactura(categoria, consumoM3) {
  const t = TARIFARIO[categoria];
  if (!t) throw new Error(`Categoría desconocida: ${categoria}`);

  const desglose = [];
  let cargo_consumo = 0;
  let desde = 12; // base cubierta por cargo fijo

  t.tramos.forEach((tr, idx) => {
    if (consumoM3 <= desde) return;
    const m3 = Math.min(consumoM3, tr.hasta) - desde;
    if (m3 <= 0) return;
    const sub = +(m3 * tr.precio).toFixed(2);
    desglose.push({ tramo: idx + 1, m3, precio: tr.precio, subtotal: sub });
    cargo_consumo += sub;
    desde = tr.hasta === Infinity ? consumoM3 : tr.hasta;
  });

  return {
    categoria,
    consumoM3,
    esExcesivo:    consumoM3 > UMBRAL_EXCESO_ONU,
    cargo_fijo:    t.cargo_fijo,
    cargo_consumo: +cargo_consumo.toFixed(2),
    total:         +(t.cargo_fijo + cargo_consumo).toFixed(2),
    desglose,
  };
}

module.exports = { calcularFactura, TARIFARIO, UMBRAL_EXCESO_ONU };
