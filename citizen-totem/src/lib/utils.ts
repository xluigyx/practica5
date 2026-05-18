import type { PaqueteLora } from './types';

// ─── CSS class merge ──────────────────────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false | 0)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================
// FILTRO DE INGESTA LORAWAN — LIMPIEZA 0.07% DUPLICADOS
// Simula el procesamiento de 21.6M registros/mes de 32 radiobases
// Cassandra query pattern: SELECT … WHERE sensor_id=? AND ts=?
// ============================================================

/**
 * Filtra registros duplicados que llegan cuando dos radiobases LoRaWAN
 * capturan la misma transmisión. Duplicados esperados: 0.07% del total.
 *
 * @param paquetes - Array raw de paquetes LoRaWAN recibidos
 * @returns { limpios, duplicados, tasaReal }
 */
export function filtrarDuplicadosLora(paquetes: PaqueteLora[]): {
  limpios:    PaqueteLora[];
  duplicados: PaqueteLora[];
  tasaReal:   number;           // porcentaje efectivo de duplicados
} {
  const seen   = new Map<string, PaqueteLora>();
  const duplicados: PaqueteLora[] = [];

  for (const p of paquetes) {
    // Clave de deduplicación: medidor + ventana de 5 minutos
    const ventana = Math.floor(p.timestamp / (5 * 60 * 1000));
    const key     = `${p.serieMedidor}_${ventana}`;

    if (seen.has(key)) {
      duplicados.push(p);
    } else {
      seen.set(key, p);
    }
  }

  const limpios  = Array.from(seen.values());
  const tasaReal = paquetes.length > 0
    ? (duplicados.length / paquetes.length) * 100
    : 0;

  return { limpios, duplicados, tasaReal };
}

/**
 * Genera un lote simulado de paquetes LoRaWAN con ~0.07% de duplicados.
 * Patrón: 21.6M/mes ÷ 30 días ÷ 24 horas = ~30,000 paquetes/hora
 */
export function generarPaquetesSimulados(cantidad = 1000): {
  paquetes:   PaqueteLora[];
  stats: { total: number; estimados_dup: number; tasa_dup_pct: number };
} {
  const modelos = ['ITC100', 'Siconia', 'OY1320', 'WP20', 'LAIN'];
  const now     = Date.now();
  const paquetes: PaqueteLora[] = [];

  for (let i = 0; i < cantidad; i++) {
    const serie   = `${modelos[i % 5]}-${String(10000 + i).padStart(6, '0')}`;
    const ts      = now - Math.floor(Math.random() * 3600_000);
    paquetes.push({
      serieMedidor: serie,
      radibaseId:   `RB-${String(Math.floor(i % 32) + 1).padStart(3, '0')}`,
      timestamp:    ts,
      consumo:      parseFloat((Math.random() * 5 + 0.5).toFixed(3)),
      rssi:         -(60 + Math.floor(Math.random() * 40)),
    });
    // Inyectar ~0.07% duplicados (de radiobase alternativa)
    if (Math.random() < 0.0007) {
      paquetes.push({
        serieMedidor: serie,
        radibaseId:   `RB-${String(Math.floor((i + 1) % 32) + 1).padStart(3, '0')}`,
        timestamp:    ts + Math.floor(Math.random() * 120_000), // ±2 min
        consumo:      parseFloat((Math.random() * 5 + 0.5).toFixed(3)),
        rssi:         -(60 + Math.floor(Math.random() * 40)),
      });
    }
  }

  const estimados_dup  = Math.round(cantidad * 0.0007);
  return {
    paquetes,
    stats: { total: paquetes.length, estimados_dup, tasa_dup_pct: 0.07 },
  };
}

// ============================================================
// DETECCIÓN DE ANOMALÍAS — CONSUMO EXCESIVO
// Parámetro ONU: >45m³/mes es consumo excesivo per cápita
// ============================================================

export const UMBRAL_EXCESO_ONU_M3 = 45;

/**
 * Determina si un consumo mensual supera el umbral ONU (45m³).
 */
export function esConsumoExcesivo(consumoM3: number): boolean {
  return consumoM3 > UMBRAL_EXCESO_ONU_M3;
}

/**
 * Clasifica el nivel de consumo para UI/alertas.
 */
export type NivelConsumo = 'normal' | 'elevado' | 'excesivo';

export function clasificarConsumo(consumoM3: number): NivelConsumo {
  if (consumoM3 > UMBRAL_EXCESO_ONU_M3) return 'excesivo';
  if (consumoM3 > 35)                    return 'elevado';
  return 'normal';
}

export const NIVEL_COLORES: Record<NivelConsumo, string> = {
  normal:   '#10b981',
  elevado:  '#f59e0b',
  excesivo: '#ef4444',
};

// ============================================================
// FORMATEO Y HELPERS
// ============================================================

export function formatBs(value: number, decimals = 2): string {
  return `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatM3(value: number): string {
  return `${value.toFixed(1)} m³`;
}

export function formatPorcentaje(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Convierte string ISO date a antigüedad en años */
export function calcularAntiguedadAnios(fechaISO: string): number {
  const fecha  = new Date(fechaISO);
  const ahora  = new Date();
  const ms     = ahora.getTime() - fecha.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Virtualización simple: extrae un slice de datos para tabla paginada
 * sin bloquear el hilo principal (sin usar Worker aquí, pero ready para Web Worker).
 */
export function paginar<T>(
  data: T[],
  pagina: number,
  tamano = 25,
): { items: T[]; total: number; totalPaginas: number; pagina: number } {
  const total       = data.length;
  const totalPaginas = Math.ceil(total / tamano);
  const inicio      = (pagina - 1) * tamano;
  const items       = data.slice(inicio, inicio + tamano);
  return { items, total, totalPaginas, pagina };
}
