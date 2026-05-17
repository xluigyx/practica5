// ============================================================
// SEMAPA COCHABAMBA — DATOS MAESTROS Y LÓGICA DE NEGOCIO
// Práctica 5 — Arquitectura Cassandra
// ============================================================

// ─── Tarifario (9 categorías) ─────────────────────────────────────────────────
export type TarifaCategoria =
  | 'R1-Preferencial' | 'R2-Social' | 'R3-Residencial' | 'R4-Residencial Alta'
  | 'Comercial' | 'Industrial' | 'Institucional' | 'Municipal' | 'Provisional';

export const CATEGORIAS: TarifaCategoria[] = [
  'R1-Preferencial','R2-Social','R3-Residencial','R4-Residencial Alta',
  'Comercial','Industrial','Institucional','Municipal','Provisional',
];

export const TARIFA_TABLA: Record<TarifaCategoria, {
  cargo_fijo: number; tramo_1_limite: number; tramo_1_precio: number;
  tramo_2_limite: number; tramo_2_precio: number; tramo_3_precio: number;
}> = {
  'R1-Preferencial':     { cargo_fijo:  8.50, tramo_1_limite:10, tramo_1_precio:0.90, tramo_2_limite:20, tramo_2_precio:1.20, tramo_3_precio:2.10 },
  'R2-Social':           { cargo_fijo: 10.00, tramo_1_limite:15, tramo_1_precio:1.10, tramo_2_limite:25, tramo_2_precio:1.60, tramo_3_precio:2.50 },
  'R3-Residencial':      { cargo_fijo: 12.50, tramo_1_limite:20, tramo_1_precio:1.40, tramo_2_limite:35, tramo_2_precio:2.10, tramo_3_precio:3.20 },
  'R4-Residencial Alta': { cargo_fijo: 15.00, tramo_1_limite:20, tramo_1_precio:1.80, tramo_2_limite:45, tramo_2_precio:2.80, tramo_3_precio:4.50 },
  'Comercial':           { cargo_fijo: 25.00, tramo_1_limite:30, tramo_1_precio:2.50, tramo_2_limite:60, tramo_2_precio:3.80, tramo_3_precio:5.20 },
  'Industrial':          { cargo_fijo: 45.00, tramo_1_limite:50, tramo_1_precio:3.20, tramo_2_limite:100,tramo_2_precio:4.60, tramo_3_precio:6.80 },
  'Institucional':       { cargo_fijo: 18.00, tramo_1_limite:25, tramo_1_precio:1.60, tramo_2_limite:50, tramo_2_precio:2.40, tramo_3_precio:3.80 },
  'Municipal':           { cargo_fijo: 12.00, tramo_1_limite:20, tramo_1_precio:1.20, tramo_2_limite:40, tramo_2_precio:1.80, tramo_3_precio:2.80 },
  'Provisional':         { cargo_fijo: 20.00, tramo_1_limite:15, tramo_1_precio:2.20, tramo_2_limite:30, tramo_2_precio:3.20, tramo_3_precio:5.00 },
};

// ─── Algoritmo de facturación ─────────────────────────────────────────────────
export function calcularFactura(categoria: TarifaCategoria, consumoM3: number) {
  const t = TARIFA_TABLA[categoria];
  const excesivo = consumoM3 > 45; // Parámetro ONU
  let cargo_consumo = 0;
  const desglose: { tramo: number; m3: number; precio: number; subtotal: number }[] = [];

  const t1 = Math.min(consumoM3, t.tramo_1_limite);
  desglose.push({ tramo:1, m3:t1, precio:t.tramo_1_precio, subtotal: parseFloat((t1*t.tramo_1_precio).toFixed(2)) });
  cargo_consumo += t1 * t.tramo_1_precio;

  if (consumoM3 > t.tramo_1_limite) {
    const t2 = Math.min(consumoM3 - t.tramo_1_limite, t.tramo_2_limite - t.tramo_1_limite);
    desglose.push({ tramo:2, m3:t2, precio:t.tramo_2_precio, subtotal: parseFloat((t2*t.tramo_2_precio).toFixed(2)) });
    cargo_consumo += t2 * t.tramo_2_precio;
  }

  let tramo: 1|2|3 = consumoM3 > t.tramo_2_limite ? 3 : consumoM3 > t.tramo_1_limite ? 2 : 1;
  if (consumoM3 > t.tramo_2_limite) {
    const t3 = consumoM3 - t.tramo_2_limite;
    desglose.push({ tramo:3, m3:t3, precio:t.tramo_3_precio, subtotal: parseFloat((t3*t.tramo_3_precio).toFixed(2)) });
    cargo_consumo += t3 * t.tramo_3_precio;
  }

  return {
    cargo_fijo: t.cargo_fijo,
    cargo_consumo: parseFloat(cargo_consumo.toFixed(2)),
    total: parseFloat((t.cargo_fijo + cargo_consumo).toFixed(2)),
    excesivo, tramo, desglose,
  };
}

// ─── Simulador de cambio de categoría ────────────────────────────────────────
export function simularCambioCat(consumoM3: number, catActual: TarifaCategoria, catNueva: TarifaCategoria) {
  const actual = calcularFactura(catActual, consumoM3);
  const nueva  = calcularFactura(catNueva,  consumoM3);
  return { actual, nueva, delta: nueva.total - actual.total };
}

// ─── Modelos de medidores ─────────────────────────────────────────────────────
export type MeterModel = 'ITC 100' | 'Siconia' | 'OY1320' | 'WP20' | 'LAIN IoT';
export const METER_MODELS: MeterModel[] = ['ITC 100','Siconia','OY1320','WP20','LAIN IoT'];

export const METER_MODEL_STATS: Record<MeterModel, {
  total:number; active:number; failureRate:number; avgAge:number; firmwareErrors:number; connectivityErrors:number;
}> = {
  'ITC 100':  { total:28000, active:26900, failureRate:3.9, avgAge:3.1, firmwareErrors:412, connectivityErrors:209 },
  'Siconia':  { total:25000, active:24100, failureRate:3.6, avgAge:2.8, firmwareErrors:318, connectivityErrors:184 },
  'OY1320':   { total:22000, active:20800, failureRate:5.5, avgAge:4.6, firmwareErrors:721, connectivityErrors:498 },
  'WP20':     { total:18000, active:17400, failureRate:3.3, avgAge:1.9, firmwareErrors:192, connectivityErrors:96  },
  'LAIN IoT': { total:27000, active:26200, failureRate:2.9, avgAge:1.4, firmwareErrors:143, connectivityErrors:81  },
};

// ─── Distritos ────────────────────────────────────────────────────────────────
export interface DistritoMetrics {
  id:number; name:string; subalcaldia:string; consumoM3:number; presionPSI:number;
  poblacion:number; medidoresActivos:number; medidoresTotal:number;
  cobertura:number; calidad:number; temperatura:number; lat:number; lng:number;
  status:'normal'|'alta-demanda'|'critico'|'mantenimiento';
}

export const DISTRITOS_METRICS: DistritoMetrics[] = [
  { id:1,  name:'D-1 Norte',       subalcaldia:'Adela Zamudio', consumoM3:310, presionPSI:15.2, poblacion:52400, medidoresActivos:8120, medidoresTotal:8500,  cobertura:95.5, calidad:82, temperatura:18.2, lat:-17.338, lng:-66.163, status:'normal' },
  { id:2,  name:'D-2 Noroeste',    subalcaldia:'Adela Zamudio', consumoM3:265, presionPSI:14.8, poblacion:41200, medidoresActivos:6100, medidoresTotal:6400,  cobertura:95.3, calidad:85, temperatura:17.8, lat:-17.348, lng:-66.178, status:'normal' },
  { id:3,  name:'D-3 Quillacollo', subalcaldia:'Adela Zamudio', consumoM3:290, presionPSI:13.5, poblacion:48600, medidoresActivos:7200, medidoresTotal:7600,  cobertura:94.7, calidad:79, temperatura:18.5, lat:-17.358, lng:-66.155, status:'normal' },
  { id:4,  name:'D-4 Oeste',       subalcaldia:'Tunari',        consumoM3:285, presionPSI:11.8, poblacion:44800, medidoresActivos:6600, medidoresTotal:7100,  cobertura:92.9, calidad:76, temperatura:19.1, lat:-17.378, lng:-66.180, status:'mantenimiento' },
  { id:5,  name:'D-5 Sureste',     subalcaldia:'Tunari',        consumoM3:320, presionPSI:16.1, poblacion:55200, medidoresActivos:8400, medidoresTotal:8800,  cobertura:95.4, calidad:88, temperatura:17.5, lat:-17.365, lng:-66.140, status:'normal' },
  { id:6,  name:'D-6 Sur',         subalcaldia:'Tunari',        consumoM3:275, presionPSI:12.9, poblacion:43100, medidoresActivos:6300, medidoresTotal:6700,  cobertura:94.0, calidad:81, temperatura:19.8, lat:-17.395, lng:-66.155, status:'normal' },
  { id:7,  name:'D-7 Valle H.',    subalcaldia:'Valle Hermoso', consumoM3:230, presionPSI:10.5, poblacion:38000, medidoresActivos:5400, medidoresTotal:5900,  cobertura:91.5, calidad:74, temperatura:20.2, lat:-17.410, lng:-66.168, status:'normal' },
  { id:8,  name:'D-8 Temporal',    subalcaldia:'Valle Hermoso', consumoM3:195, presionPSI:9.8,  poblacion:32400, medidoresActivos:4500, medidoresTotal:5100,  cobertura:88.2, calidad:71, temperatura:21.0, lat:-17.425, lng:-66.148, status:'mantenimiento' },
  { id:9,  name:'D-9 Molle',       subalcaldia:'Molle',         consumoM3:410, presionPSI:14.2, poblacion:58800, medidoresActivos:8700, medidoresTotal:9200,  cobertura:94.5, calidad:80, temperatura:18.8, lat:-17.372, lng:-66.130, status:'alta-demanda' },
  { id:10, name:'D-10 Central',    subalcaldia:'Molle',         consumoM3:520, presionPSI:12.5, poblacion:64500, medidoresActivos:9600, medidoresTotal:10200, cobertura:94.1, calidad:78, temperatura:19.4, lat:-17.388, lng:-66.162, status:'critico' },
  { id:11, name:'D-11 Itocta',     subalcaldia:'Itocta',        consumoM3:245, presionPSI:13.8, poblacion:40200, medidoresActivos:5800, medidoresTotal:6100,  cobertura:95.0, calidad:83, temperatura:18.0, lat:-17.402, lng:-66.145, status:'normal' },
  { id:12, name:'D-12 Industrial', subalcaldia:'Itocta',        consumoM3:480, presionPSI:11.2, poblacion:35600, medidoresActivos:5100, medidoresTotal:5400,  cobertura:94.4, calidad:65, temperatura:20.8, lat:-17.415, lng:-66.130, status:'critico' },
  { id:13, name:'D-13 Lacma N.',   subalcaldia:'Lacma',         consumoM3:215, presionPSI:10.9, poblacion:37200, medidoresActivos:5300, medidoresTotal:5700,  cobertura:93.0, calidad:77, temperatura:19.2, lat:-17.395, lng:-66.175, status:'normal' },
  { id:14, name:'D-14 Lacma S.',   subalcaldia:'Lacma',         consumoM3:342, presionPSI:13.1, poblacion:46800, medidoresActivos:6900, medidoresTotal:7300,  cobertura:94.5, calidad:82, temperatura:18.6, lat:-17.408, lng:-66.188, status:'normal' },
];

// ─── Serie histórica ciudad ───────────────────────────────────────────────────
export const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export const CONSUMO_HISTORICO_CIUDAD = MONTHS_ES.map((month, i) => ({
  month,
  consumo: Math.round(3800 + Math.sin(i * 0.5) * 400 + (Math.sin(i * 7.3) * 10000 % 300 - 150)),
  temperatura: Math.round(14 + Math.sin(i * 0.52 + 1) * 5),
  contaminacion: Math.round(35 + Math.cos(i * 0.4) * 12),
}));

// ─── Proyección demanda 5 años ────────────────────────────────────────────────
export const DEMANDA_PROYECCION = Array.from({ length:6 }, (_, i) => {
  const demanda = Math.round(4382 * Math.pow(1.026, i));
  const capacidad = 5200 + i * 120;
  return { year: 2025 + i, demanda, capacidad, brecha: capacidad - demanda };
});

// ─── Financiero ───────────────────────────────────────────────────────────────
export const CIERRE_FINANCIERO_6M = [
  { month:'Dic-2024', facturado:4820500, cobrado:4215200, pendiente:421300, incobrables:184000 },
  { month:'Ene-2025', facturado:4910300, cobrado:4308100, pendiente:438200, incobrables:164000 },
  { month:'Feb-2025', facturado:4765800, cobrado:4195400, pendiente:412000, incobrables:158400 },
  { month:'Mar-2025', facturado:5012400, cobrado:4430600, pendiente:445200, incobrables:136600 },
  { month:'Abr-2025', facturado:5128600, cobrado:4512800, pendiente:472100, incobrables:143700 },
  { month:'May-2025', facturado:5243100, cobrado:4580900, pendiente:498200, incobrables:164000 },
];

export const TOP_MOROSOS = [
  { contrato:'CBB-00182341', ci:'5521834', nombre:'Comercializadora Andina SRL', zona:'Zona 2', distrito:10, categoria:'Comercial'         as TarifaCategoria, deudaTotal:18420, mesesDeuda:8,  ultimoPago:'2024-09-10', medidorSerie:'ITC100-882341' },
  { contrato:'CBB-00291122', ci:'4812003', nombre:'Industrias El Prado Ltda.',   zona:'Zona 1', distrito:12, categoria:'Industrial'          as TarifaCategoria, deudaTotal:32100, mesesDeuda:11, ultimoPago:'2024-06-10', medidorSerie:'OY1320-229912' },
  { contrato:'CBB-00448821', ci:'7123456', nombre:'Torres Mamani, Roberto',      zona:'Zona 3', distrito:9,  categoria:'R4-Residencial Alta' as TarifaCategoria, deudaTotal:4280,  mesesDeuda:6,  ultimoPago:'2024-11-10', medidorSerie:'WP20-448821' },
  { contrato:'CBB-00551230', ci:'6234512', nombre:'Hostal Cochabamba Center',    zona:'Zona 1', distrito:10, categoria:'Comercial'           as TarifaCategoria, deudaTotal:9850,  mesesDeuda:7,  ultimoPago:'2024-10-10', medidorSerie:'Siconia-551230' },
  { contrato:'CBB-00672341', ci:'8901234', nombre:'Quispe Flores, Ana María',    zona:'Zona 4', distrito:5,  categoria:'R3-Residencial'      as TarifaCategoria, deudaTotal:1960,  mesesDeuda:4,  ultimoPago:'2025-01-10', medidorSerie:'LAIN-672341' },
  { contrato:'CBB-00781122', ci:'3456789', nombre:'Agencia de Viajes Andes',     zona:'Zona 2', distrito:3,  categoria:'Comercial'           as TarifaCategoria, deudaTotal:6720,  mesesDeuda:5,  ultimoPago:'2024-12-10', medidorSerie:'ITC100-781122' },
  { contrato:'CBB-00891230', ci:'9012345', nombre:'Construcciones J&R SAC',      zona:'Zona 1', distrito:12, categoria:'Industrial'          as TarifaCategoria, deudaTotal:24500, mesesDeuda:9,  ultimoPago:'2024-08-10', medidorSerie:'OY1320-891230' },
];

// ─── Ciudadanos mock (repositorio Cassandra simulado) ─────────────────────────
export interface Ciudadano {
  contrato:string; ci:string; nombre:string; direccion:string;
  zona:string; distrito:number; categoria:TarifaCategoria;
  medidorSerie:string; medidorModelo:MeterModel; instalacion:string;
  consumoActualM3:number; consumoAnteriorM3:number;
  estado:'al-dia'|'moroso'|'suspendido'; deudaTotal:number;
}

const CIUDADANOS: Ciudadano[] = [
  { contrato:'CBB-00123456', ci:'7890123', nombre:'García Vargas, María Elena',  direccion:'Av. Ayacucho 1234',       zona:'Zona 1', distrito:10, categoria:'R3-Residencial',      medidorSerie:'ITC100-123456',  medidorModelo:'ITC 100',  instalacion:'2021-03-15', consumoActualM3:22,  consumoAnteriorM3:19,  estado:'al-dia',    deudaTotal:0     },
  { contrato:'CBB-00291122', ci:'4812003', nombre:'Industrias El Prado Ltda.',   direccion:'Av. Blanco Galindo Km 8', zona:'Zona 1', distrito:12, categoria:'Industrial',           medidorSerie:'OY1320-229912', medidorModelo:'OY1320',   instalacion:'2019-08-01', consumoActualM3:145, consumoAnteriorM3:138, estado:'moroso',    deudaTotal:32100 },
  { contrato:'CBB-00448821', ci:'7123456', nombre:'Torres Mamani, Roberto',      direccion:'Calle Lanza 456',         zona:'Zona 3', distrito:9,  categoria:'R4-Residencial Alta', medidorSerie:'WP20-448821',   medidorModelo:'WP20',     instalacion:'2022-05-20', consumoActualM3:58,  consumoAnteriorM3:51,  estado:'moroso',    deudaTotal:4280  },
  { contrato:'CBB-00561234', ci:'5567890', nombre:'Quispe Laura, Pedro',         direccion:'Calle Baptista 789',      zona:'Zona 2', distrito:5,  categoria:'R2-Social',           medidorSerie:'LAIN-561234',   medidorModelo:'LAIN IoT', instalacion:'2023-01-10', consumoActualM3:13,  consumoAnteriorM3:12,  estado:'al-dia',    deudaTotal:0     },
  { contrato:'CBB-00672341', ci:'8901234', nombre:'Quispe Flores, Ana María',    direccion:'Pasaje Sucre 23',         zona:'Zona 4', distrito:5,  categoria:'R3-Residencial',      medidorSerie:'LAIN-672341',   medidorModelo:'LAIN IoT', instalacion:'2022-11-30', consumoActualM3:18,  consumoAnteriorM3:17,  estado:'moroso',    deudaTotal:1960  },
  { contrato:'CBB-00781122', ci:'3456789', nombre:'Agencia de Viajes Andes',     direccion:'Plaza 14 de Septiembre',  zona:'Zona 2', distrito:3,  categoria:'Comercial',           medidorSerie:'ITC100-781122', medidorModelo:'ITC 100',  instalacion:'2020-06-15', consumoActualM3:38,  consumoAnteriorM3:35,  estado:'moroso',    deudaTotal:6720  },
  { contrato:'CBB-00891230', ci:'9012345', nombre:'Construcciones J&R SAC',      direccion:'Av. Industrial 890',      zona:'Zona 1', distrito:12, categoria:'Industrial',          medidorSerie:'OY1320-891230', medidorModelo:'OY1320',   instalacion:'2018-03-20', consumoActualM3:210, consumoAnteriorM3:198, estado:'suspendido',deudaTotal:24500 },
];

// Simula SELECT FROM ciudadanos WHERE id_servicio = ? OR ci = ? OR medidor_serie = ?
export function buscarCiudadano(query: string): Ciudadano | null {
  const q = query.trim().toLowerCase();
  return CIUDADANOS.find(c =>
    c.contrato.toLowerCase() === q ||
    c.ci === q ||
    c.medidorSerie.toLowerCase() === q
  ) || null;
}

// ─── Radiobases LoRaWAN ───────────────────────────────────────────────────────
function rng(seed: number) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

export interface Radiobase {
  id:string; lat:number; lng:number;
  medidoresConectados:number; uptimePct:number;
  erroresPct:number; status:'online'|'degraded'|'offline';
}

export const RADIOBASES: Radiobase[] = Array.from({ length:32 }, (_, i) => {
  const up = 94 + rng(i * 13) * 6;
  return {
    id: `RB-${String(i+1).padStart(3,'0')}`,
    lat: -17.38 + (rng(i*7) - 0.5) * 0.24,
    lng: -66.15 + (rng(i*11) - 0.5) * 0.24,
    medidoresConectados: Math.round(3000 + rng(i*5) * 1000),
    uptimePct: parseFloat(up.toFixed(1)),
    erroresPct: parseFloat((rng(i*17) * 0.1 + 0.02).toFixed(3)),
    status: up > 98 ? 'online' : up > 95 ? 'degraded' : 'offline',
  };
});

// ─── KPI Ciudad ───────────────────────────────────────────────────────────────
export const KPI_CIUDAD = {
  poblacionBeneficiaria: 633800,
  medidoresInstalados: 120000,
  coberturaPct: 94.2,
  radiobasesActivas: 29,
};
