// ============================================================
// SEMAPA COCHABAMBA — DATOS MAESTROS Y LÓGICA DE NEGOCIO
// Fuente: Tarifario.csv + Práctica 5 Arquitectura Cassandra
// ============================================================

import type {
  TarifaCategoria, ModeloMedidor, ModeloStats,
  DistritoMetrics, Radiobase, Inmueble, Moroso,
  CierreMensual, Factura, TramoFactura,
} from './types';
import { esConsumoExcesivo, calcularAntiguedadAnios } from './utils';

// ─── Tarifario SEMAPA oficial (Tarifario.csv) ─────────────────────────────────
// cargo_fijo cubre los primeros 12m³ base (cuota fija mensual)
// 6 tramos sobre el excedente: 13-25 | 26-50 | 51-75 | 76-100 | 101-150 | >151 m³
export interface TarifaDetalle {
  readonly cargo_fijo: number;                          // Bs/mes
  readonly tramos: ReadonlyArray<{ hasta: number; precio: number }>; // hasta=m³ total, precio=Bs/m³
}

//                           Fijo(Bs)  T1(13-25) T2(26-50) T3(51-75) T4(76-100) T5(101-150) T6(>151)
export const TARIFARIO: Record<TarifaCategoria, TarifaDetalle> = {
  'R1-Residencial':      { cargo_fijo:  16.74, tramos:[{hasta:25,precio:1.10},{hasta:50,precio:1.26},{hasta:75,precio:1.87},{hasta:100,precio:2.39},{hasta:150,precio:2.84},{hasta:Infinity,precio:3.34}] },
  'R2-Residencial':      { cargo_fijo:  33.37, tramos:[{hasta:25,precio:1.78},{hasta:50,precio:1.98},{hasta:75,precio:2.96},{hasta:100,precio:3.59},{hasta:150,precio:4.16},{hasta:Infinity,precio:4.75}] },
  'R3-Residencial':      { cargo_fijo:  62.57, tramos:[{hasta:25,precio:2.17},{hasta:50,precio:3.38},{hasta:75,precio:3.76},{hasta:100,precio:4.36},{hasta:150,precio:4.96},{hasta:Infinity,precio:5.54}] },
  'R4-Residencial Alta': { cargo_fijo: 104.22, tramos:[{hasta:25,precio:2.58},{hasta:50,precio:2.80},{hasta:75,precio:4.39},{hasta:100,precio:4.99},{hasta:150,precio:5.59},{hasta:Infinity,precio:6.20}] },
  'C-Comercial':         { cargo_fijo: 125.16, tramos:[{hasta:25,precio:5.35},{hasta:50,precio:5.73},{hasta:75,precio:6.14},{hasta:100,precio:6.53},{hasta:150,precio:6.92},{hasta:Infinity,precio:7.34}] },
  'CE-Comercial Especial':{ cargo_fijo:145.98, tramos:[{hasta:25,precio:8.72},{hasta:50,precio:8.72},{hasta:75,precio:9.12},{hasta:100,precio:9.50},{hasta:150,precio:9.90},{hasta:Infinity,precio:10.29}] },
  'I-Industrial':        { cargo_fijo: 112.64, tramos:[{hasta:25,precio:4.95},{hasta:50,precio:5.66},{hasta:75,precio:5.94},{hasta:100,precio:6.33},{hasta:150,precio:6.73},{hasta:Infinity,precio:7.11}] },
  'P-Preferencial':      { cargo_fijo:  54.96, tramos:[{hasta:25,precio:2.17},{hasta:50,precio:2.39},{hasta:75,precio:2.96},{hasta:100,precio:3.35},{hasta:150,precio:3.76},{hasta:Infinity,precio:4.16}] },
  'S-Social':            { cargo_fijo:  91.72, tramos:[{hasta:25,precio:3.57},{hasta:50,precio:3.77},{hasta:75,precio:3.96},{hasta:100,precio:4.35},{hasta:150,precio:4.75},{hasta:Infinity,precio:5.15}] },
};

export const CATEGORIAS_LIST = Object.keys(TARIFARIO) as TarifaCategoria[];

// ─── Algoritmo de facturación — 6 tramos oficiales SEMAPA ────────────────────
export function calcularFactura(categoria: TarifaCategoria, consumoM3: number): Factura {
  const t = TARIFARIO[categoria];
  const desglose: TramoFactura[] = [];
  let cargo_consumo = 0;
  let tramo_activo: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  let desde = 12; // base cubierta por cargo fijo

  t.tramos.forEach((tr, idx) => {
    if (consumoM3 <= desde) return;
    const m3 = Math.min(consumoM3, tr.hasta) - desde;
    if (m3 <= 0) return;
    const sub = parseFloat((m3 * tr.precio).toFixed(2));
    const n = (idx + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    desglose.push({ tramo: n, m3, precio: tr.precio, subtotal: sub });
    cargo_consumo += sub;
    tramo_activo = n;
    desde = tr.hasta === Infinity ? consumoM3 : tr.hasta;
  });

  return {
    categoria,
    consumoM3,
    esExcesivo:    esConsumoExcesivo(consumoM3),
    cargo_fijo:    t.cargo_fijo,
    cargo_consumo: parseFloat(cargo_consumo.toFixed(2)),
    total:         parseFloat((t.cargo_fijo + cargo_consumo).toFixed(2)),
    tramo_activo,
    desglose,
  };
}

// ─── Datos de Distritos (15 distritos — fuente: documento oficial práctica) ──
// Tunari: 1,2,13 | Molle: 3,4 | Alejo Calatayud: 5,8 | Valle Hermoso: 6,7,14 | Itocta: 9,15 | Adela Zamudio: 10,11,12
export const DISTRITOS: DistritoMetrics[] = [
  { id:1,  name:'QUERU QUERU / ARANJUEZ',   subalcaldia:'Tunari',          consumoM3:285, presionPSI:14.2, poblacion:25100, medidoresActivos:6272,  medidoresTotal:6600,  cobertura:95.0, calidadICA:83, temperatura:17.8, status:'normal' },
  { id:2,  name:'CALA CALA / MAYORAZGO',    subalcaldia:'Tunari',          consumoM3:260, presionPSI:13.8, poblacion:28100, medidoresActivos:7028,  medidoresTotal:7400,  cobertura:95.1, calidadICA:83, temperatura:17.8, status:'normal' },
  { id:3,  name:'SARCO / SARCOBAMBA',       subalcaldia:'Molle',           consumoM3:310, presionPSI:13.5, poblacion:44900, medidoresActivos:11231, medidoresTotal:11800, cobertura:95.2, calidadICA:80, temperatura:18.9, status:'normal' },
  { id:4,  name:'COÑA COÑA / HIPODROMO',    subalcaldia:'Molle',           consumoM3:275, presionPSI:12.8, poblacion:24300, medidoresActivos:6085,  medidoresTotal:6400,  cobertura:95.2, calidadICA:80, temperatura:18.9, status:'normal' },
  { id:5,  name:'JAIHUAYCO / LACMA',        subalcaldia:'Alejo Calatayud', consumoM3:320, presionPSI:15.1, poblacion:47700, medidoresActivos:11920, medidoresTotal:12500, cobertura:95.4, calidadICA:79, temperatura:19.1, status:'alta-demanda' },
  { id:6,  name:'ALALAY NORTE',             subalcaldia:'Valle Hermoso',   consumoM3:295, presionPSI:14.0, poblacion:14100, medidoresActivos:3537,  medidoresTotal:3700,  cobertura:95.6, calidadICA:82, temperatura:18.1, status:'normal' },
  { id:7,  name:'ALALAY SUD',               subalcaldia:'Valle Hermoso',   consumoM3:240, presionPSI:11.5, poblacion:13300, medidoresActivos:3330,  medidoresTotal:3500,  cobertura:95.1, calidadICA:82, temperatura:18.1, status:'normal' },
  { id:8,  name:'TICTI / USPHA USPHA',      subalcaldia:'Alejo Calatayud', consumoM3:210, presionPSI:10.8, poblacion:20800, medidoresActivos:5190,  medidoresTotal:5500,  cobertura:94.4, calidadICA:76, temperatura:20.0, status:'mantenimiento' },
  { id:9,  name:'PUKARA GRANDE / TAMBORADA',subalcaldia:'Itocta',          consumoM3:350, presionPSI:12.2, poblacion:52200, medidoresActivos:13045, medidoresTotal:13700, cobertura:95.2, calidadICA:68, temperatura:21.0, status:'normal' },
  { id:10, name:'NOROESTE / NORESTE',       subalcaldia:'Adela Zamudio',   consumoM3:280, presionPSI:14.5, poblacion:21300, medidoresActivos:5324,  medidoresTotal:5600,  cobertura:95.1, calidadICA:81, temperatura:18.5, status:'normal' },
  { id:11, name:'MUYURINA / LAS CUADRAS',   subalcaldia:'Adela Zamudio',   consumoM3:230, presionPSI:13.1, poblacion:14000, medidoresActivos:3509,  medidoresTotal:3700,  cobertura:94.8, calidadICA:80, temperatura:18.5, status:'normal' },
  { id:12, name:'TUPURAYA / CALA CALA SUD', subalcaldia:'Adela Zamudio',   consumoM3:470, presionPSI:11.0, poblacion:40400, medidoresActivos:10090, medidoresTotal:10600, cobertura:95.2, calidadICA:77, temperatura:19.4, status:'critico' },
  { id:13, name:'CARA CARA',                subalcaldia:'Tunari',          consumoM3:195, presionPSI:10.5, poblacion:6100,  medidoresActivos:1521,  medidoresTotal:1600,  cobertura:95.1, calidadICA:74, temperatura:18.6, status:'normal' },
  { id:14, name:'VALLE HERMOSO SUD',        subalcaldia:'Valle Hermoso',   consumoM3:330, presionPSI:13.6, poblacion:23000, medidoresActivos:5743,  medidoresTotal:6000,  cobertura:95.8, calidadICA:82, temperatura:18.1, status:'normal' },
  { id:15, name:'KHARA KHARA / PUKARA SUR', subalcaldia:'Itocta',          consumoM3:265, presionPSI:12.0, poblacion:24700, medidoresActivos:6175,  medidoresTotal:6500,  cobertura:94.9, calidadICA:68, temperatura:21.0, status:'normal' },
];

// ─── Modelos de medidores — stats técnicos ────────────────────────────────────
export const MODELOS_STATS: ModeloStats[] = [
  { modelo:'ITC 100',  total:28000, activos:26900, avgAge:3.1, tasaFallo:3.9, erroresAlimentacion:412, erroresConectividad:209, erroresConfig:180, bateriaPctPromedio:88 },
  { modelo:'Siconia',  total:25000, activos:24100, avgAge:2.8, tasaFallo:3.6, erroresAlimentacion:318, erroresConectividad:184, erroresConfig:120, bateriaPctPromedio:82 },
  { modelo:'OY1320',   total:22000, activos:20800, avgAge:4.6, tasaFallo:5.5, erroresAlimentacion:721, erroresConectividad:498, erroresConfig:340, bateriaPctPromedio:45 },
  { modelo:'WP20',     total:18000, activos:17400, avgAge:1.9, tasaFallo:3.3, erroresAlimentacion:192, erroresConectividad:96,  erroresConfig:88,  bateriaPctPromedio:91 },
  { modelo:'LAIN IoT', total:27000, activos:26200, avgAge:1.4, tasaFallo:2.9, erroresAlimentacion:143, erroresConectividad:81,  erroresConfig:62,  bateriaPctPromedio:95 },
];

// ─── Radiobases LoRaWAN (32 GAMC) ────────────────────────────────────────────
function rng(seed: number): number { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

export const RADIOBASES: Radiobase[] = Array.from({ length: 32 }, (_, i) => {
  const up = 94 + rng(i * 13) * 6;
  const st = up > 98 ? 'online' : up > 95 ? 'degraded' : 'offline';
  return {
    id:                  `RB-${String(i + 1).padStart(3, '0')}`,
    lat:                 -17.38 + (rng(i * 7) - 0.5) * 0.24,
    lng:                 -66.15 + (rng(i * 11) - 0.5) * 0.24,
    medidoresConectados: Math.round(3000 + rng(i * 5) * 1000),
    uptimePct:           parseFloat(up.toFixed(1)),
    erroresPct:          parseFloat((rng(i * 17) * 0.1 + 0.02).toFixed(3)),
    status:              st as Radiobase['status'],
  };
});

// ─── Inmuebles / Contratos mock ───────────────────────────────────────────────
// Simula SELECT … WHERE id_servicio=? (Cassandra primary key lookup)
export const INMUEBLES: Inmueble[] = [
  { contrato:'CBB-00123456', ci:'7890123', nombre:'García Vargas, María Elena',   direccion:'Av. Ayacucho 1234',        zona:'Zona 1', distritoId:10, categoria:'R3-Residencial',      medidorSerie:'ITC100-123456',   medidorModelo:'ITC 100',  instalacion:'2021-03-15', estadoServicio:'al-dia',    consumoActualM3:22,  consumoAnteriorM3:19,  deudaTotal:0     },
  { contrato:'CBB-00291122', ci:'4812003', nombre:'Industrias El Prado Ltda.',    direccion:'Av. Blanco Galindo Km 8',  zona:'Zona 1', distritoId:12, categoria:'I-Industrial',        medidorSerie:'OY1320-229912',   medidorModelo:'OY1320',   instalacion:'2019-08-01', estadoServicio:'moroso',    consumoActualM3:145, consumoAnteriorM3:138, deudaTotal:32100 },
  { contrato:'CBB-00448821', ci:'7123456', nombre:'Torres Mamani, Roberto',       direccion:'Calle Lanza 456',          zona:'Zona 3', distritoId:9,  categoria:'R4-Residencial Alta', medidorSerie:'WP20-448821',     medidorModelo:'WP20',     instalacion:'2022-05-20', estadoServicio:'moroso',    consumoActualM3:58,  consumoAnteriorM3:51,  deudaTotal:4280  },
  { contrato:'CBB-00561234', ci:'5567890', nombre:'Quispe Laura, Pedro',          direccion:'Calle Baptista 789',       zona:'Zona 2', distritoId:5,  categoria:'R2-Residencial',      medidorSerie:'LAIN-561234',     medidorModelo:'LAIN IoT', instalacion:'2023-01-10', estadoServicio:'al-dia',    consumoActualM3:13,  consumoAnteriorM3:12,  deudaTotal:0     },
  { contrato:'CBB-00672341', ci:'8901234', nombre:'Quispe Flores, Ana María',     direccion:'Pasaje Sucre 23',          zona:'Zona 4', distritoId:5,  categoria:'R3-Residencial',      medidorSerie:'LAIN-672341',     medidorModelo:'LAIN IoT', instalacion:'2022-11-30', estadoServicio:'moroso',    consumoActualM3:18,  consumoAnteriorM3:17,  deudaTotal:1960  },
  { contrato:'CBB-00781122', ci:'3456789', nombre:'Agencia de Viajes Andes',      direccion:'Plaza 14 de Septiembre',  zona:'Zona 2', distritoId:3,  categoria:'C-Comercial',         medidorSerie:'ITC100-781122',   medidorModelo:'ITC 100',  instalacion:'2020-06-15', estadoServicio:'moroso',    consumoActualM3:38,  consumoAnteriorM3:35,  deudaTotal:6720  },
  { contrato:'CBB-00891230', ci:'9012345', nombre:'Construcciones J&R SAC',       direccion:'Av. Industrial 890',       zona:'Zona 1', distritoId:12, categoria:'I-Industrial',        medidorSerie:'OY1320-891230',   medidorModelo:'OY1320',   instalacion:'2018-03-20', estadoServicio:'suspendido', consumoActualM3:210, consumoAnteriorM3:198, deudaTotal:24500 },
  { contrato:'CBB-00334455', ci:'2234567', nombre:'Mamani Condori, Lucía',        direccion:'Calle Colombia 331',       zona:'Zona 3', distritoId:1,  categoria:'R1-Residencial',      medidorSerie:'Siconia-334455',  medidorModelo:'Siconia',  instalacion:'2023-07-01', estadoServicio:'al-dia',    consumoActualM3:10,  consumoAnteriorM3:9,   deudaTotal:0     },
];

// Simula Cassandra: SELECT WHERE contrato=? OR ci=? OR medidor_serie=?
export function buscarInmueble(query: string): Inmueble | null {
  const q = query.trim().toLowerCase();
  return INMUEBLES.find(i =>
    i.contrato.toLowerCase()     === q ||
    i.ci                         === q ||
    i.medidorSerie.toLowerCase() === q
  ) ?? null;
}

// ─── Ranking de Morosos ───────────────────────────────────────────────────────
export const MOROSOS: Moroso[] = [
  { contrato:'CBB-00891230', nombre:'Construcciones J&R SAC',    zona:'Zona 1', distritoId:12, categoria:'I-Industrial',        deudaTotal:24500, mesesDeuda:9,  ultimoPago:'2024-08-10', medidorSerie:'OY1320-891230' },
  { contrato:'CBB-00291122', nombre:'Industrias El Prado Ltda.',  zona:'Zona 1', distritoId:12, categoria:'I-Industrial',        deudaTotal:32100, mesesDeuda:11, ultimoPago:'2024-06-10', medidorSerie:'OY1320-229912' },
  { contrato:'CBB-00781122', nombre:'Agencia de Viajes Andes',    zona:'Zona 2', distritoId:3,  categoria:'C-Comercial',         deudaTotal:6720,  mesesDeuda:5,  ultimoPago:'2024-12-10', medidorSerie:'ITC100-781122' },
  { contrato:'CBB-00448821', nombre:'Torres Mamani, Roberto',     zona:'Zona 3', distritoId:9,  categoria:'R4-Residencial Alta', deudaTotal:4280,  mesesDeuda:6,  ultimoPago:'2024-11-10', medidorSerie:'WP20-448821' },
  { contrato:'CBB-00672341', nombre:'Quispe Flores, Ana María',   zona:'Zona 4', distritoId:5,  categoria:'R3-Residencial',      deudaTotal:1960,  mesesDeuda:4,  ultimoPago:'2025-01-10', medidorSerie:'LAIN-672341' },
];

// ─── Cierre Mensual (Día 10 de cada mes) ─────────────────────────────────────
export const CIERRE_6M: CierreMensual[] = [
  { periodo:'Dic-2024', facturado:4820500, cobrado:4215200, pendiente:421300, incobrables:184000, eficiencia:87.4 },
  { periodo:'Ene-2025', facturado:4910300, cobrado:4308100, pendiente:438200, incobrables:164000, eficiencia:87.7 },
  { periodo:'Feb-2025', facturado:4765800, cobrado:4195400, pendiente:412000, incobrables:158400, eficiencia:88.0 },
  { periodo:'Mar-2025', facturado:5012400, cobrado:4430600, pendiente:445200, incobrables:136600, eficiencia:88.4 },
  { periodo:'Abr-2025', facturado:5128600, cobrado:4512800, pendiente:472100, incobrables:143700, eficiencia:88.0 },
  { periodo:'May-2025', facturado:5243100, cobrado:4580900, pendiente:498200, incobrables:164000, eficiencia:87.4 },
];

// ─── Histórico consumo ciudad (12 meses) ─────────────────────────────────────
export const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export const HISTORICO_CIUDAD = MESES.map((mes, i) => ({
  mes,
  consumoM3:    Math.round(3800 + Math.sin(i * 0.5) * 400 + (Math.sin(i * 7.3) * 10000 % 300 - 150)),
  temperatura:  Math.round(14 + Math.sin(i * 0.52 + 1) * 5),
  contaminacion:Math.round(35 + Math.cos(i * 0.4) * 12),
}));

// ─── Proyección demanda 5 años (crecimiento 2.6% anual) ──────────────────────
export const PROYECCION_5A = Array.from({ length: 6 }, (_, i) => ({
  year:     2025 + i,
  demanda:  Math.round(4382 * Math.pow(1.026, i)),
  capacidad:5200 + i * 120,
  brecha:   5200 + i * 120 - Math.round(4382 * Math.pow(1.026, i)),
}));
