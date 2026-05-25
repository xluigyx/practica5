// ============================================================
// SEMAPA COCHABAMBA â INTERFACES TYPESCRIPT ESTRICTAS
// PrÃ¡ctica 5 â Tipado completo para Cassandra schema
// ============================================================

// âââ CategorÃ­as tarifarias (9 categorÃ­as SEMAPA) ââââââââââââââââââââââââââââââ
export type TarifaCategoria =
  | 'R1-Preferencial'
  | 'R2-Social'
  | 'R3-Residencial'
  | 'R4-Residencial Alta'
  | 'Comercial'
  | 'CE-Comercial Especial'
  | 'Industrial'
  | 'P-Provisional'
  | 'S-Social';

// âââ Estado medidor/servicio ââââââââââââââââââââââââââââââââââââââââââââââââââ
export type EstadoMedidor   = 'activo' | 'inactivo' | 'suspendido' | 'mantenimiento';
export type EstadoServicio  = 'al-dia' | 'moroso' | 'suspendido';
export type StatusRed       = 'online' | 'degraded' | 'offline';
export type StatusDistrito  = 'normal' | 'alta-demanda' | 'critico' | 'mantenimiento';

// âââ Modelo de Medidor ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export type ModeloMedidor = 'ITC 100' | 'Siconia' | 'OY1320' | 'WP20' | 'LAIN IoT';

// âââ Error codes de medidor (SEMAPA spec) âââââââââââââââââââââââââââââââââââââ
export type CodigoError = 1 | 2 | 3 | 4 | 5;
// 1=Lectura | 2=CalibraciÃ³n | 3=AlimentaciÃ³n | 4=Conectividad | 5=ConfiguraciÃ³n

export interface ErrorMedidor {
  readonly codigo: CodigoError;
  readonly descripcion: string;
  readonly critico: boolean; // errores 3,4,5 son crÃ­ticos (requieren mantenimiento)
}

export const ERROR_CODES: Record<CodigoError, ErrorMedidor> = {
  1: { codigo: 1, descripcion: 'Error de Lectura',    critico: false },
  2: { codigo: 2, descripcion: 'Error de CalibraciÃ³n',critico: false },
  3: { codigo: 3, descripcion: 'Error de AlimentaciÃ³n',critico: true },
  4: { codigo: 4, descripcion: 'Error de Conectividad',critico: true },
  5: { codigo: 5, descripcion: 'Error de ConfiguraciÃ³n',critico: true },
};

// âââ Medidor inteligente ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export interface Medidor {
  readonly serie:          string;          // PK Cassandra: UUID/serie
  readonly modelo:         ModeloMedidor;
  readonly estado:         EstadoMedidor;
  readonly distritoId:     number;          // 1-14
  readonly zona:           string;
  readonly instalacion:    string;          // ISO date string
  readonly antiguedadAnios: number;         // aÃ±os desde instalaciÃ³n
  readonly ultimaLectura:  string;          // ISO timestamp
  readonly codigoError:    CodigoError | null;
  readonly firmwareVersion:string;
  readonly bateriaPct:     number;          // 0-100
}

// âââ Lectura de medidor (registro Cassandra) ââââââââââââââââââââââââââââââââââ
export interface Lectura {
  readonly serieMedidor:   string;          // FK â Medidor
  readonly timestamp:      string;          // ISO timestamp (horaria)
  readonly consumoM3:      number;          // mÂ³ en esta lectura
  readonly presionPSI:     number;
  readonly temperatura:    number;          // Â°C ambiente
  readonly esExcesivo:     boolean;         // consumo > 45mÂ³/mes ONU
  readonly esDuplicado:    boolean;         // marcado por limpieza 0.07%
}

// âââ Inmueble / Contrato ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export interface Inmueble {
  readonly contrato:        string;          // CBB-XXXXXXXX
  readonly ci:              string;          // CÃ©dula/NIT
  readonly nombre:          string;
  readonly direccion:       string;
  readonly zona:            string;
  readonly distritoId:      number;
  readonly categoria:       TarifaCategoria;
  readonly medidorSerie:    string;          // FK â Medidor
  readonly medidorModelo:   ModeloMedidor;
  readonly instalacion:     string;          // fecha instalaciÃ³n
  readonly estadoServicio:  EstadoServicio;
  readonly consumoActualM3: number;          // lectura mensual actual
  readonly consumoAnteriorM3: number;
  readonly deudaTotal:      number;          // Bs acumulados
}

// âââ Tramo de facturaciÃ³n âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export interface TramoFactura {
  readonly tramo:    1 | 2 | 3;
  readonly m3:       number;
  readonly precio:   number;           // Bs/mÂ³
  readonly subtotal: number;           // Bs
}

// âââ Factura calculada ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export interface Factura {
  readonly categoria:     TarifaCategoria;
  readonly consumoM3:     number;
  readonly esExcesivo:    boolean;       // > 45mÂ³ ONU
  readonly cargo_fijo:    number;        // Bs (cubre 12mÂ³ base)
  readonly cargo_consumo: number;        // Bs (excedente por tramos)
  readonly total:         number;        // Bs
  readonly tramo_activo:  1 | 2 | 3;
  readonly desglose:      TramoFactura[];
}

// âââ Radiobase LoRaWAN ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export interface Radiobase {
  readonly id:                   string;   // RB-001 .. RB-032
  readonly lat:                  number;
  readonly lng:                  number;
  readonly medidoresConectados:  number;
  readonly uptimePct:            number;
  readonly erroresPct:           number;
  readonly status:               StatusRed;
}

// âââ MÃ©tricas de Distrito âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
  readonly temperatura:       number;     // Â°C
  readonly status:            StatusDistrito;
}

// âââ Stats de modelo de medidor âââââââââââââââââââââââââââââââââââââââââââââââ
export interface ModeloStats {
  readonly modelo:             ModeloMedidor;
  readonly total:              number;
  readonly activos:            number;
  readonly avgAge:             number;    // aÃ±os
  readonly tasaFallo:          number;    // %
  readonly erroresAlimentacion:number;    // error code 3
  readonly erroresConectividad:number;    // error code 4
  readonly erroresConfig:      number;    // error code 5
  readonly bateriaPctPromedio: number;
}

// âââ Moroso âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

// âââ Registro de cierre mensual âââââââââââââââââââââââââââââââââââââââââââââââ
export interface CierreMensual {
  readonly periodo:      string;          // e.g. "May-2025"
  readonly facturado:    number;          // Bs
  readonly cobrado:      number;          // Bs
  readonly pendiente:    number;          // Bs
  readonly incobrables:  number;          // Bs
  readonly eficiencia:   number;          // %
}

// âââ Paquete LoRaWAN crudo ââââââââââââââââââââââââââââââââââââââââââââââââââââ
export interface PaqueteLora {
  readonly serieMedidor: string;
  readonly radibaseId:   string;
  readonly timestamp:    number;          // Unix ms
  readonly consumo:      number;
  readonly rssi:         number;
}
