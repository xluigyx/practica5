-- ============================================================
-- SEMAPA COCHABAMBA — Schema Cassandra
-- Keyspace: semapa | RF=2 (2 nodos)
-- ============================================================

CREATE KEYSPACE IF NOT EXISTS semapa
  WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 2}
  AND durable_writes = true;

USE semapa;

-- ── Distritos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS distritos (
  id              INT PRIMARY KEY,
  nombre          TEXT,
  subalcaldia     TEXT,
  consumo_m3      FLOAT,
  presion_psi     FLOAT,
  poblacion       INT,
  medidores_total INT,
  cobertura_pct   FLOAT,
  calidad_ica     INT,
  temperatura_c   FLOAT,
  status          TEXT
);

-- ── Medidores (PK: serie) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS medidores (
  serie             TEXT PRIMARY KEY,
  modelo            TEXT,
  estado            TEXT,
  distrito_id       INT,
  zona              TEXT,
  instalacion       DATE,
  ultima_lectura    TIMESTAMP,
  codigo_error      INT,
  firmware          TEXT,
);
-- ── Lecturas horarias (21.6M/mes) — Partition by medidor+mes ─
CREATE TABLE IF NOT EXISTS lecturas (
  medidor_serie   TEXT,
  periodo         TEXT,     -- YYYY-MM
  timestamp_ts    TIMESTAMP,
  consumo_m3      FLOAT,
  presion_psi     FLOAT,
  temperatura_c   FLOAT,
  es_duplicado    BOOLEAN,
  es_excesivo     BOOLEAN,
  PRIMARY KEY ((medidor_serie, periodo), timestamp_ts)
) WITH CLUSTERING ORDER BY (timestamp_ts DESC)
  AND default_time_to_live = 7776000;  -- 90 días TTL

-- ── Consumo agregado por distrito (consulta Alcaldía) ────────
CREATE TABLE IF NOT EXISTS consumo_distrito_8h (
  distrito_id     INT,
  fecha_hora      TIMESTAMP,
  consumo_total   FLOAT,
  consumo_avg     FLOAT,
  presion_avg     FLOAT,
  medidores_ok    INT,
  medidores_error INT,
  PRIMARY KEY (distrito_id, fecha_hora)
) WITH CLUSTERING ORDER BY (fecha_hora DESC);

-- ── Inmuebles / Contratos (PK: contrato) ────────────────────
CREATE TABLE IF NOT EXISTS inmuebles (
  contrato              TEXT PRIMARY KEY,
  ci                    TEXT,
  nombre                TEXT,
  direccion             TEXT,
  zona                  TEXT,
  distrito_id           INT,
  categoria             TEXT,
  medidor_serie         TEXT,
  medidor_modelo        TEXT,
  instalacion           TEXT,
  estado_servicio       TEXT,
  consumo_actual_m3     FLOAT,
  consumo_anterior_m3   FLOAT,
  deuda_total           FLOAT
);

-- Índices secundarios para búsqueda del Tótem
CREATE INDEX IF NOT EXISTS idx_inmueble_ci     ON inmuebles (ci);
CREATE INDEX IF NOT EXISTS idx_inmueble_medidor ON inmuebles (medidor_serie);

-- ── Morosos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS morosos (
  contrato      TEXT PRIMARY KEY,
  nombre        TEXT,
  zona          TEXT,
  distrito_id   INT,
  categoria     TEXT,
  deuda_total   FLOAT,
  meses_deuda   INT,
  ultimo_pago   TEXT,
  medidor_serie TEXT
);

-- ── Cierre mensual ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cierre_mensual (
  periodo       TEXT PRIMARY KEY,
  facturado     FLOAT,
  cobrado       FLOAT,
  pendiente     FLOAT,
  incobrables   FLOAT,
  eficiencia    FLOAT,
  cerrado_en    TIMESTAMP
);

-- ── Radiobases LoRaWAN ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS radiobases (
  id                    TEXT PRIMARY KEY,
  lat                   FLOAT,
  lng                   FLOAT,
  medidores_conectados  INT,
  uptime_pct            FLOAT,
  errores_pct           FLOAT,
  status                TEXT
);

-- ── Errores IoT (códigos 3/4/5) ───────────────────────────────
CREATE TABLE IF NOT EXISTS errores_iot (
  medidor_serie   TEXT,
  timestamp_ts    TIMESTAMP,
  codigo_error    INT,
  descripcion     TEXT,
  resuelto        BOOLEAN,
  PRIMARY KEY (medidor_serie, timestamp_ts)
) WITH CLUSTERING ORDER BY (timestamp_ts DESC);

-- Registros de pagos criptográficos verificados por el backend
CREATE TABLE IF NOT EXISTS pagos_bnb (
  contrato       TEXT,
  timestamp_ts   TIMESTAMP,
  meses_pagados  INT,
  monto_bs       FLOAT,
  monto_bnb      FLOAT,
  tx_hash        TEXT,
  estado         TEXT,
  PRIMARY KEY (contrato, timestamp_ts)
) WITH CLUSTERING ORDER BY (timestamp_ts DESC);

-- ── Infraestructuras / Catastro urbano ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS infraestructuras (
  numero_catastro   TEXT PRIMARY KEY,
  propietario       TEXT,
  ci                TEXT,
  direccion         TEXT,
  zona              TEXT,
  distrito          INT,
  manzano           INT,
  lote              INT,
  superficie_m2     FLOAT,
  area_construida   FLOAT,
  uso_suelo         TEXT,
  matricula_ddrr    TEXT,
  valor_catastral   FLOAT,
  impuesto_anual    FLOAT,
  latitud           FLOAT,
  longitud          FLOAT
);

-- Índice por zona para consultas geográficas
CREATE INDEX IF NOT EXISTS idx_infra_zona     ON infraestructuras (zona);
CREATE INDEX IF NOT EXISTS idx_infra_distrito ON infraestructuras (distrito);

-- Registro de notificaciones realmente despachadas por el consumidor Kafka
CREATE TABLE IF NOT EXISTS notificaciones_despacho (
  contrato       TEXT,
  canal          TEXT,
  periodo        TEXT,
  timestamp_ts   TIMESTAMP,
  destino        TEXT,
  mensaje        TEXT,
  estado         TEXT,
  PRIMARY KEY (contrato, timestamp_ts)
) WITH CLUSTERING ORDER BY (timestamp_ts DESC);

