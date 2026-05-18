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

// ─── Tarifario SEMAPA (Tarifario.csv) ─────────────────────────────────────────
// cargo_fijo cubre los primeros 12m³ base
// tramos: 13-25 | 26-50 | >50 m³
export interface TarifaDetalle {
  readonly cargo_fijo:       number;   // Bs
  readonly tramo1_limite:    number;   // m³ máx tramo 1 (sobre los 12 base)
  readonly tramo1_precio:    number;   // Bs/m³
  readonly tramo2_limite:    number;   // m³ máx tramo 2 acumulado
  readonly tramo2_precio:    number;   // Bs/m³
  readonly tramo3_precio:    number;   // Bs/m³ (>tramo2_limite)
}

export const TARIFARIO: Record<TarifaCategoria, TarifaDetalle> = {
  'R1-Preferencial':        { cargo_fijo:  8.50, tramo1_limite:10, tramo1_precio:0.90, tramo2_limite:20, tramo2_precio:1.20, tramo3_precio:2.10 },
  'R2-Social':              { cargo_fijo: 10.00, tramo1_limite:15, tramo1_precio:1.10, tramo2_limite:25, tramo2_precio:1.60, tramo3_precio:2.50 },
  'R3-Residencial':         { cargo_fijo: 12.50, tramo1_limite:20, tramo1_precio:1.40, tramo2_limite:35, tramo2_precio:2.10, tramo3_precio:3.20 },
  'R4-Residencial Alta':    { cargo_fijo: 15.00, tramo1_limite:20, tramo1_precio:1.80, tramo2_limite:45, tramo2_precio:2.80, tramo3_precio:4.50 },
  'Comercial':              { cargo_fijo: 25.00, tramo1_limite:30, tramo1_precio:2.50, tramo2_limite:60, tramo2_precio:3.80, tramo3_precio:5.20 },
  'CE-Comercial Especial':  { cargo_fijo: 35.00, tramo1_limite:30, tramo1_precio:3.00, tramo2_limite:70, tramo2_precio:4.50, tramo3_precio:6.00 },
  'Industrial':             { cargo_fijo: 45.00, tramo1_limite:50, tramo1_precio:3.20, tramo2_limite:100,tramo2_precio:4.60, tramo3_precio:6.80 },
  'P-Provisional':          { cargo_fijo: 20.00, tramo1_limite:15, tramo1_precio:2.20, tramo2_limite:30, tramo2_precio:3.20, tramo3_precio:5.00 },
  'S-Social':               { cargo_fijo:  6.00, tramo1_limite: 8, tramo1_precio:0.70, tramo2_limite:15, tramo2_precio:1.00, tramo3_precio:1.80 },
};

export const CATEGORIAS_LIST = Object.keys(TARIFARIO) as TarifaCategoria[];

// ─── Algoritmo de facturación (Tarifario.csv rules) ──────────────────────────
/**
 * Calcula la factura mensual aplicando el tarifario de 9 categorías.
 * - cargo_fijo: cubre los primeros 12m³
 * - Si consumo > 12m³: aplica precio por tramos sobre el excedente
 * - Si consumo > 45m³: marca como excesivo (ONU)
 */
export function calcularFactura(categoria: TarifaCategoria, consumoM3: number): Factura {
  const t            = TARIFARIO[categoria];
  const excesivo     = esConsumoExcesivo(consumoM3);
  const excedente    = Math.max(0, consumoM3 - 12); // primeros 12m³ cubiertos por cargo fijo
  const desglose: TramoFactura[] = [];
  let cargo_consumo  = 0;
  let tramo_activo: 1 | 2 | 3 = 1;

  if (excedente > 0) {
    // Tramo 1
    const t1m3 = Math.min(excedente, t.tramo1_limite);
    if (t1m3 > 0) {
      const sub = parseFloat((t1m3 * t.tramo1_precio).toFixed(2));
      desglose.push({ tramo: 1, m3: t1m3, precio: t.tramo1_precio, subtotal: sub });
      cargo_consumo += sub;
      tramo_activo   = 1;
    }

    // Tramo 2
    if (excedente > t.tramo1_limite) {
      const t2m3 = Math.min(excedente - t.tramo1_limite, t.tramo2_limite - t.tramo1_limite);
      const sub  = parseFloat((t2m3 * t.tramo2_precio).toFixed(2));
      desglose.push({ tramo: 2, m3: t2m3, precio: t.tramo2_precio, subtotal: sub });
      cargo_consumo += sub;
      tramo_activo   = 2;
    }

    // Tramo 3
    if (excedente > t.tramo2_limite) {
      const t3m3 = excedente - t.tramo2_limite;
      const sub  = parseFloat((t3m3 * t.tramo3_precio).toFixed(2));
      desglose.push({ tramo: 3, m3: t3m3, precio: t.tramo3_precio, subtotal: sub });
      cargo_consumo += sub;
      tramo_activo   = 3;
    }
  }

  return {
    categoria,
    consumoM3,
    esExcesivo:   excesivo,
    cargo_fijo:   t.cargo_fijo,
    cargo_consumo: parseFloat(cargo_consumo.toFixed(2)),
    total:         parseFloat((t.cargo_fijo + cargo_consumo).toFixed(2)),
    tramo_activo,
    desglose,
  };
}

// ─── Datos de Distritos (14 distritos Cochabamba) ────────────────────────────
export const DISTRITOS: DistritoMetrics[] = [
  { id:1,  name:'D-1 Norte',        subalcaldia:'Adela Zamudio', consumoM3:310, presionPSI:15.2, poblacion:52400,  medidoresActivos:8120,  medidoresTotal:8500,  cobertura:95.5, calidadICA:82, temperatura:18.2, status:'normal' },
  { id:2,  name:'D-2 Noroeste',     subalcaldia:'Adela Zamudio', consumoM3:265, presionPSI:14.8, poblacion:41200,  medidoresActivos:6100,  medidoresTotal:6400,  cobertura:95.3, calidadICA:85, temperatura:17.8, status:'normal' },
  { id:3,  name:'D-3 Quillacollo',  subalcaldia:'Adela Zamudio', consumoM3:290, presionPSI:13.5, poblacion:48600,  medidoresActivos:7200,  medidoresTotal:7600,  cobertura:94.7, calidadICA:79, temperatura:18.5, status:'normal' },
  { id:4,  name:'D-4 Oeste',        subalcaldia:'Tunari',        consumoM3:285, presionPSI:11.8, poblacion:44800,  medidoresActivos:6600,  medidoresTotal:7100,  cobertura:92.9, calidadICA:76, temperatura:19.1, status:'mantenimiento' },
  { id:5,  name:'D-5 Sureste',      subalcaldia:'Tunari',        consumoM3:320, presionPSI:16.1, poblacion:55200,  medidoresActivos:8400,  medidoresTotal:8800,  cobertura:95.4, calidadICA:88, temperatura:17.5, status:'normal' },
  { id:6,  name:'D-6 Sur',          subalcaldia:'Tunari',        consumoM3:275, presionPSI:12.9, poblacion:43100,  medidoresActivos:6300,  medidoresTotal:6700,  cobertura:94.0, calidadICA:81, temperatura:19.8, status:'normal' },
  { id:7,  name:'D-7 Valle H.',     subalcaldia:'Valle Hermoso', consumoM3:230, presionPSI:10.5, poblacion:38000,  medidoresActivos:5400,  medidoresTotal:5900,  cobertura:91.5, calidadICA:74, temperatura:20.2, status:'normal' },
  { id:8,  name:'D-8 Temporal',     subalcaldia:'Valle Hermoso', consumoM3:195, presionPSI:9.8,  poblacion:32400,  medidoresActivos:4500,  medidoresTotal:5100,  cobertura:88.2, calidadICA:71, temperatura:21.0, status:'mantenimiento' },
  { id:9,  name:'D-9 Molle',        subalcaldia:'Molle',         consumoM3:410, presionPSI:14.2, poblacion:58800,  medidoresActivos:8700,  medidoresTotal:9200,  cobertura:94.5, calidadICA:80, temperatura:18.8, status:'alta-demanda' },
  { id:10, name:'D-10 Central',     subalcaldia:'Molle',         consumoM3:520, presionPSI:12.5, poblacion:64500,  medidoresActivos:9600,  medidoresTotal:10200, cobertura:94.1, calidadICA:78, temperatura:19.4, status:'critico' },
  { id:11, name:'D-11 Itocta',      subalcaldia:'Itocta',        consumoM3:245, presionPSI:13.8, poblacion:40200,  medidoresActivos:5800,  medidoresTotal:6100,  cobertura:95.0, calidadICA:83, temperatura:18.0, status:'normal' },
  { id:12, name:'D-12 Industrial',  subalcaldia:'Itocta',        consumoM3:480, presionPSI:11.2, poblacion:35600,  medidoresActivos:5100,  medidoresTotal:5400,  cobertura:94.4, calidadICA:65, temperatura:20.8, status:'critico' },
  { id:13, name:'D-13 Lacma N.',    subalcaldia:'Lacma',         consumoM3:215, presionPSI:10.9, poblacion:37200,  medidoresActivos:5300,  medidoresTotal:5700,  cobertura:93.0, calidadICA:77, temperatura:19.2, status:'normal' },
  { id:14, name:'D-14 Lacma S.',    subalcaldia:'Lacma',         consumoM3:342, presionPSI:13.1, poblacion:46800,  medidoresActivos:6900,  medidoresTotal:7300,  cobertura:94.5, calidadICA:82, temperatura:18.6, status:'normal' },
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
  { contrato:'CBB-00291122', ci:'4812003', nombre:'Industrias El Prado Ltda.',    direccion:'Av. Blanco Galindo Km 8',  zona:'Zona 1', distritoId:12, categoria:'Industrial',           medidorSerie:'OY1320-229912',   medidorModelo:'OY1320',   instalacion:'2019-08-01', estadoServicio:'moroso',    consumoActualM3:145, consumoAnteriorM3:138, deudaTotal:32100 },
  { contrato:'CBB-00448821', ci:'7123456', nombre:'Torres Mamani, Roberto',       direccion:'Calle Lanza 456',          zona:'Zona 3', distritoId:9,  categoria:'R4-Residencial Alta', medidorSerie:'WP20-448821',     medidorModelo:'WP20',     instalacion:'2022-05-20', estadoServicio:'moroso',    consumoActualM3:58,  consumoAnteriorM3:51,  deudaTotal:4280  },
  { contrato:'CBB-00561234', ci:'5567890', nombre:'Quispe Laura, Pedro',          direccion:'Calle Baptista 789',       zona:'Zona 2', distritoId:5,  categoria:'R2-Social',           medidorSerie:'LAIN-561234',     medidorModelo:'LAIN IoT', instalacion:'2023-01-10', estadoServicio:'al-dia',    consumoActualM3:13,  consumoAnteriorM3:12,  deudaTotal:0     },
  { contrato:'CBB-00672341', ci:'8901234', nombre:'Quispe Flores, Ana María',     direccion:'Pasaje Sucre 23',          zona:'Zona 4', distritoId:5,  categoria:'R3-Residencial',      medidorSerie:'LAIN-672341',     medidorModelo:'LAIN IoT', instalacion:'2022-11-30', estadoServicio:'moroso',    consumoActualM3:18,  consumoAnteriorM3:17,  deudaTotal:1960  },
  { contrato:'CBB-00781122', ci:'3456789', nombre:'Agencia de Viajes Andes',      direccion:'Plaza 14 de Septiembre',  zona:'Zona 2', distritoId:3,  categoria:'Comercial',           medidorSerie:'ITC100-781122',   medidorModelo:'ITC 100',  instalacion:'2020-06-15', estadoServicio:'moroso',    consumoActualM3:38,  consumoAnteriorM3:35,  deudaTotal:6720  },
  { contrato:'CBB-00891230', ci:'9012345', nombre:'Construcciones J&R SAC',       direccion:'Av. Industrial 890',       zona:'Zona 1', distritoId:12, categoria:'Industrial',          medidorSerie:'OY1320-891230',   medidorModelo:'OY1320',   instalacion:'2018-03-20', estadoServicio:'suspendido', consumoActualM3:210, consumoAnteriorM3:198, deudaTotal:24500 },
  { contrato:'CBB-00334455', ci:'2234567', nombre:'Mamani Condori, Lucía',        direccion:'Calle Colombia 331',       zona:'Zona 3', distritoId:1,  categoria:'R1-Preferencial',     medidorSerie:'Siconia-334455',  medidorModelo:'Siconia',  instalacion:'2023-07-01', estadoServicio:'al-dia',    consumoActualM3:10,  consumoAnteriorM3:9,   deudaTotal:0     },
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
  { contrato:'CBB-00891230', nombre:'Construcciones J&R SAC',    zona:'Zona 1', distritoId:12, categoria:'Industrial',          deudaTotal:24500, mesesDeuda:9,  ultimoPago:'2024-08-10', medidorSerie:'OY1320-891230' },
  { contrato:'CBB-00291122', nombre:'Industrias El Prado Ltda.',  zona:'Zona 1', distritoId:12, categoria:'Industrial',          deudaTotal:32100, mesesDeuda:11, ultimoPago:'2024-06-10', medidorSerie:'OY1320-229912' },
  { contrato:'CBB-00781122', nombre:'Agencia de Viajes Andes',    zona:'Zona 2', distritoId:3,  categoria:'Comercial',           deudaTotal:6720,  mesesDeuda:5,  ultimoPago:'2024-12-10', medidorSerie:'ITC100-781122' },
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
