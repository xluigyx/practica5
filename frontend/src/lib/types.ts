// ============================================================
// SEMAPA COCHABAMBA — INTERFACES TYPESCRIPT ESTRICTAS
// Práctica 5 — Tipado completo para Cassandra schema
// ============================================================

// ─── Categorías tarifarias (9 categorías SEMAPA) ──────────────────────────────
export type TarifaCategoria =
  | 'R1-Residencial'
  | 'R2-Residencial'
  | 'R3-Residencial'
  | 'R4-Residencial Alta'
  | 'C-Comercial'
  | 'CE-Comercial Especial'
  | 'I-Industrial'
  | 'P-Preferencial'
  | 'S-Social';

// ─── Estado medidor/servicio ──────────────────────────────────────────────────
export type EstadoMedidor   = 'activo' | 'inactivo' | 'suspendido' | 'mantenimiento';
export type EstadoServicio  = 'al-dia' | 'moroso' | 'suspendido';
export type StatusRed       = 'online' | 'degraded' | 'offline';
export type StatusDistrito  = 'normal' | 'alta-demanda' | 'critico' | 'mantenimiento';

// ─── Modelo de Medidor ────────────────────────────────────────────────────────
export type ModeloMedidor = 'ITC 100' | 'Siconia' | 'OY1320' | 'WP20' | 'LAIN IoT';

// ─── Error codes de medidor (SEMAPA spec — 7 códigos oficiales) ───────────────
export type CodigoError = 1 | 2 | 3 | 4 | 5 | 6 | 7;
// 1=Automático(OK) | 2=Manual | 3=Alimentación | 4=Conectividad | 5=Config | 6=Obstrucción | 7=Firmware

export interface ErrorMedidor {
  readonly codigo: CodigoError;
  readonly descripcion: string;
  readonly critico: boolean; // errores 3-7 son críticos (requieren mantenimiento)
}

export const ERROR_CODES: Record<CodigoError, ErrorMedidor> = {
  1: { codigo: 1, descripcion: 'Automático (Bien)',                       critico: false },
  2: { codigo: 2, descripcion: 'Manual',                                  critico: false },
  3: { codigo: 3, descripcion: 'Falla en la alimentación eléctrica',      critico: true  },
  4: { codigo: 4, descripcion: 'Fallo en la conectividad de red',         critico: true  },
  5: { codigo: 5, descripcion: 'Configuración incorrecta del sensor o gateway', critico: true },
  6: { codigo: 6, descripcion: 'Obstrucción o daño en el caudalímetro',  critico: true  },
  7: { codigo: 7, descripcion: 'Problemas de firmware o software embebido', critico: true },
};

// ─── Medidor inteligente ──────────────────────────────────────────────────────
export interface Medidor {
  readonly serie:          string;          // PK Cassandra: UUID/serie
  readonly modelo:         ModeloMedidor;
  readonly estado:         EstadoMedidor;
  readonly distritoId:     number;          // 1-14
  readonly zona:           string;
  readonly instalacion:    string;          // ISO date string
  readonly antiguedadAnios: number;         // años desde instalación
  readonly ultimaLectura:  string;          // ISO timestamp
  readonly codigoError:    CodigoError | null;
  readonly firmwareVersion:string;
  readonly bateriaPct:     number;          // 0-100
}

// ─── Lectura de medidor (registro Cassandra) ──────────────────────────────────
export interface Lectura {
  readonly serieMedidor:   string;          // FK → Medidor
  readonly timestamp:      string;          // ISO timestamp (horaria)
  readonly consumoM3:      number;          // m³ en esta lectura
  readonly presionPSI:     number;
  readonly temperatura:    number;          // °C ambiente
  readonly esExcesivo:     boolean;         // consumo > 45m³/mes ONU
  readonly esDuplicado:    boolean;         // marcado por limpieza 0.07%
}

// ─── Inmueble / Contrato ──────────────────────────────────────────────────────
export interface Inmueble {
  readonly contrato:        string;          // CBB-XXXXXXXX
  readonly ci:              string;          // Cédula/NIT
  readonly nombre:          string;
  readonly direccion:       string;
  readonly zona:            string;
  readonly distritoId:      number;
  readonly categoria:       TarifaCategoria;
  readonly medidorSerie:    string;          // FK → Medidor
  readonly medidorModelo:   ModeloMedidor;
  readonly instalacion:     string;          // fecha instalación
  readonly estadoServicio:  EstadoServicio;
  readonly consumoActualM3: number;          // lectura mensual actual
  readonly consumoAnteriorM3: number;
  readonly deudaTotal:      number;          // Bs acumulados
}

// ─── Tramo de facturación ─────────────────────────────────────────────────────
export interface TramoFactura {
  readonly tramo:    1 | 2 | 3 | 4 | 5 | 6;
  readonly m3:       number;
  readonly precio:   number;           // Bs/m³
  readonly subtotal: number;           // Bs
}

// ─── Factura calculada ────────────────────────────────────────────────────────
export interface Factura {
  readonly categoria:     TarifaCategoria;
  readonly consumoM3:     number;
  readonly esExcesivo:    boolean;       // > 45m³ ONU
  readonly cargo_fijo:    number;        // Bs (cubre 12m³ base)
  readonly cargo_consumo: number;        // Bs (excedente por tramos)
  readonly total:         number;        // Bs
  readonly tramo_activo:  1 | 2 | 3 | 4 | 5 | 6;
  readonly desglose:      TramoFactura[];
}

// ─── Radiobase LoRaWAN ────────────────────────────────────────────────────────
export interface Radiobase {
  readonly id:                   string;   // RB-001 .. RB-032
  readonly lat:                  number;
  readonly lng:                  number;
  readonly medidoresConectados:  number;
  readonly uptimePct:            number;
  readonly erroresPct:           number;
  readonly status:               StatusRed;
}

// ─── Métricas de Distrito ─────────────────────────────────────────────────────
export interface DistritoMetrics {
  readonly id:                number;     // 1-14
  readonly name:              string;
  readonly subalcaldia:       string;
  readonly consumoM3:         number;
  readonly presionPSI:        number;
  readonly poblacion:         number;
  readonly medidoresActivos:  number;
  readonly medidoresTotal:    number;
  readonly cobertura:         number;     // %
  readonly calidadICA:        number;     // 0-100
  readonly temperatura:       number;     // °C
  readonly status:            StatusDistrito;
}

// ─── Stats de modelo de medidor ───────────────────────────────────────────────
export interface ModeloStats {
  readonly modelo:             ModeloMedidor;
  readonly total:              number;
  readonly activos:            number;
  readonly avgAge:             number;    // años
  readonly tasaFallo:          number;    // %
  readonly erroresAlimentacion:number;    // error code 3
  readonly erroresConectividad:number;    // error code 4
  readonly erroresConfig:      number;    // error code 5
  readonly bateriaPctPromedio: number;
}

// ─── Moroso ───────────────────────────────────────────────────────────────────
export interface Moroso {
  readonly contrato:     string;
  readonly nombre:       string;
  readonly zona:         string;
  readonly distritoId:   number;
  readonly categoria:    TarifaCategoria;
  readonly deudaTotal:   number;
  readonly mesesDeuda:   number;
  readonly ultimoPago:   string;
  readonly medidorSerie: string;
}

// ─── Registro de cierre mensual ───────────────────────────────────────────────
export interface CierreMensual {
  readonly periodo:      string;          // e.g. "May-2025"
  readonly facturado:    number;          // Bs
  readonly cobrado:      number;          // Bs
  readonly pendiente:    number;          // Bs
  readonly incobrables:  number;          // Bs
  readonly eficiencia:   number;          // %
}

// ─── Paquete LoRaWAN crudo ────────────────────────────────────────────────────
export interface PaqueteLora {
  readonly serieMedidor: string;
  readonly radibaseId:   string;
  readonly timestamp:    number;          // Unix ms
  readonly consumo:      number;
  readonly rssi:         number;
}
