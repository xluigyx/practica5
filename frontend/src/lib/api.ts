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

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const api = {
  distritos:    () => get<DistritoRaw[]>('/distritos'),
  medActivos:   () => get<{ total: number; data: unknown[] }>('/consultas/4'),
  medFuera:     () => get<{ total: number; data: unknown[] }>('/consultas/5'),
  modeloFallos: () => get<{ data: ModeloFalloRaw[] }>('/consultas/6'),
  medErrores:   () => get<MedidorErrorRaw[]>('/medidores/errores'),
  medEstados:   () => get<{ total: number; data: EstadoMedidorRaw[] }>('/medidores/estados'),
  morosos:        () => get<MorosoRaw[]>('/morosos'),
  cierre:         () => get<CierreRaw[]>('/cierre'),
  radiobases:     () => get<RadiobaseRaw[]>('/radiobases'),
  erroresCodigos: () => get<Record<string, string>>('/errores/codigos'),
};
