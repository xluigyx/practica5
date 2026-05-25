// frontend/src/lib/api.ts — Capa de acceso al backend SEMAPA

const BASE = ((import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000') + '/api';

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`API ${r.status} ${path}`);
  return r.json();
}

// ── Tipos raw (Cassandra → Express → JSON) ────────────────────────────────────

export interface DistritoRaw {
  id: number;
  nombre: string;
  subalcaldia: string;
  consumo_m3: number | null;
  presion_psi: number | null;
  poblacion: number;
  medidores_total: number;
  cobertura_pct: number;
  calidad_ica: number;
  temperatura_c: number;
  status: string | null;
}

export interface ModeloFalloRaw {
  modelo: string;
  total: number;
  fallos: number;
  tasa_fallo_pct: number;
}

export interface EstadoMedidorRaw {
  estado: string;
  count: number;
  pct: number;
}

export interface MedidorErrorRaw {
  serie: string;
  modelo: string;
  estado: string;
  distrito_id: number;
  zona: string;
  ultima_lectura: string | null;
  codigo_error: number;
}

export interface MorosoRaw {
  contrato: string;
  nombre: string;
  zona: string;
  distrito_id: number;
  categoria: string;
  deuda_total: number;
  meses_deuda: number;
  ultimo_pago: string;
  medidor_serie: string;
}

export interface CierreRaw {
  periodo: string;   // YYYY-MM
  facturado: number;
  cobrado: number;
  pendiente: number;
  incobrables: number;
  eficiencia: number;
}

export interface RadiobaseRaw {
  id: string;
  errores_pct: number;
  lat: number;
  lng: number;
  medidores_conectados: number;
  status: string;
  uptime_pct: number;
}

// ── Tipos consultas analíticas (queries.js) ───────────────────────────────────

export interface Consulta2Row {
  distrito: string;
  S1: number;
  S2: number;
  S3: number;
  S4: number;
}

export interface Consulta3Row {
  contrato: string;
  tarifa: string;
  consumo_m3: number;
  limite_onu: number;
  exceso_pct: number;
}

export interface Consulta8Row {
  zona: string;
  anomalos: number;
  modelos: string;
}

export interface Consulta13Row {
  distrito: string;
  zona: string;
  medidores_con_falla: number;
  recomendacion: string;
}

export interface Consulta18Row {
  distrito: string;
  [year: string]: string | number;
}

export interface Consulta22Row {
  categoria: string;
  alias: string;
  consumo_m3: number;
  ingresos_bs: number;
}

export interface Consulta23Row {
  contrato: string;
  nombre: string;
  categoria: string;
  consumo_real_m3: number;
  consumo_min_m3: number;
  monto_bs: number;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const api = {
  // Core
  distritos:      () => get<DistritoRaw[]>('/distritos'),
  medActivos:     () => get<{ total: number; data: unknown[] }>('/consultas/4'),
  medFuera:       () => get<{ total: number; data: unknown[] }>('/consultas/5'),
  modeloFallos:   () => get<{ data: ModeloFalloRaw[] }>('/consultas/6'),
  medErrores:     () => get<MedidorErrorRaw[]>('/medidores/errores'),
  medEstados:     () => get<{ total: number; data: EstadoMedidorRaw[] }>('/medidores/estados'),
  morosos:        () => get<MorosoRaw[]>('/morosos'),
  cierre:         () => get<CierreRaw[]>('/cierre'),
  radiobases:     () => get<RadiobaseRaw[]>('/radiobases'),
  erroresCodigos: () => get<Record<string, string>>('/errores/codigos'),
  // Consultas analíticas
  consulta2:  () => get<{ data: Consulta2Row[] }>('/consultas/2'),
  consulta3:  (limite = 20) => get<{ total: number; data: Consulta3Row[] }>(`/consultas/3?limite=${limite}`),
  consulta8:  () => get<{ total_anomalos: number; data: Consulta8Row[] }>('/consultas/8'),
  consulta13: () => get<{ total_con_falla: number; data: Consulta13Row[] }>('/consultas/13'),
  consulta18: () => get<{ data: Consulta18Row[] }>('/consultas/18'),
  consulta22: () => get<{ total_bs: number; data: Consulta22Row[] }>('/consultas/22'),
  consulta23: (limite = 30) => get<{ total: number; data: Consulta23Row[] }>(`/consultas/23?limite=${limite}`),
};
