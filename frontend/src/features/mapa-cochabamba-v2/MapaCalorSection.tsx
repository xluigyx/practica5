import { useEffect, useMemo, useState } from 'react';
import { Database, MapPin, Thermometer } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { COCHABAMBA_ZONE_PATHS, type ZonePath } from './cochabamba-zone-paths-v2';
import {
  COMUNAS,
  DISTRITO_BOUNDARIES,
  getComunaByDistritoId,
  getDistritoById,
} from './semapa-territory-v2';

/*
  Original heatmap component:
  - Full backup: MapaCalorSection.backup.tsx
  - Previous render path used api.distritos() + <CochabambaMapV2 metric="consumo"
    defaultViewMode="heatmap" lockViewMode />.
  - To revert quickly, replace this file with the backup or restore that component.
*/

const API_BASE = String(((import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000')).replace(/\/$/, '');
const PERIOD = '2026-02';
const VIEWBOX_W = 918;
const VIEWBOX_H = 1297;

type ApiStatus = 'loading' | 'ready' | 'empty' | 'error';

interface HeatmapZoneRow {
  zona: string;
  zona_key: string;
  distrito_id: number | null;
  consumo: number;
  medidores: number;
}

interface HeatmapResponse {
  periodo: string;
  total_consumo_m3: number;
  total_zonas: number;
  data: HeatmapZoneRow[];
}

interface HoverState {
  x: number;
  y: number;
  zone: ZonePath;
  row: HeatmapZoneRow | null;
  distritoNombre: string;
}

function fmtNumber(value: number): string {
  return Number(value ?? 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeText(value: string): string {
  return value
    .replace(/ÃƒÂ‘|Ã‘|Ñ/g, 'N')
    .replace(/ÃƒÂ“|Ã“|Ó/g, 'O')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${lerp(a[0], b[0], t)}, ${lerp(a[1], b[1], t)}, ${lerp(a[2], b[2], t)})`;
}

function heatColor(value: number | null, min: number, max: number): string {
  if (value == null) return '#d8dee9';
  const ratio = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (ratio < 0.5) {
    return mix([22, 163, 74], [250, 204, 21], ratio * 2);
  }
  return mix([250, 204, 21], [220, 38, 38], (ratio - 0.5) * 2);
}

function readableStroke(value: number | null, min: number, max: number): string {
  if (value == null) return '#94a3b8';
  const ratio = max === min ? 0.5 : (value - min) / (max - min);
  return ratio > 0.62 ? '#7f1d1d' : '#14532d';
}

function buildDistrictName(row: HeatmapZoneRow | null | undefined, districtId: number): string {
  const id = row?.distrito_id ?? districtId;
  const boundary = getDistritoById(id);
  if (boundary) return boundary.nombre;
  return getDistritoById(districtId)?.nombre ?? `Distrito ${districtId}`;
}

function HoverTooltip({ hover }: { hover: HoverState | null }) {
  if (!hover) return null;

  const comuna = getComunaByDistritoId(hover.zone.districtId);
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-xl border border-outline-variant bg-surface-container-high/95 px-4 py-3 shadow-xl backdrop-blur"
      style={{ left: hover.x + 16, top: hover.y - 18, minWidth: 220 }}
    >
      <p className="text-sm font-bold text-on-surface leading-tight">{hover.zone.zoneName}</p>
      <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
        <span>D{hover.zone.districtId}</span>
        <span className="opacity-40">|</span>
        <span>{comuna?.nombre ?? 'Sin comuna'}</span>
      </div>
      <p className="mt-2 text-xs text-on-surface-variant">{hover.distritoNombre}</p>
      <div className="mt-3 rounded-lg bg-surface-container px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Consumo real</p>
        <p className="font-mono text-base font-extrabold text-on-surface">
          {hover.row == null ? 'Sin dato' : `${fmtNumber(hover.row.consumo)} m3`}
        </p>
        {hover.row && (
          <p className="mt-1 text-[10px] font-semibold text-on-surface-variant">
            {hover.row.medidores.toLocaleString('es-BO')} medidores asociados
          </p>
        )}
      </div>
    </div>
  );
}

function HeatLegend({ min, mid, max }: { min: number; mid: number; max: number }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <div className="mb-3 flex items-center gap-2">
        <Thermometer className="h-3.5 w-3.5 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Escala por consumo mensual real
        </p>
      </div>
      <div className="h-3 rounded-full bg-[linear-gradient(90deg,#16a34a_0%,#facc15_50%,#dc2626_100%)]" />
      <div className="mt-2 grid grid-cols-3 text-[10px] font-bold text-on-surface-variant">
        <span>Bajo: {fmtNumber(min)} m3</span>
        <span className="text-center">Medio: {fmtNumber(mid)} m3</span>
        <span className="text-right">Alto: {fmtNumber(max)} m3</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-on-surface-variant">
        <span className="inline-block h-3 w-3 rounded-sm border border-outline-variant bg-[#d8dee9]" />
        <span>Sin dato directo para el periodo o nombre de zona no asociado.</span>
      </div>
    </div>
  );
}

export default function MapaCalorSection() {
  const [rows, setRows] = useState<HeatmapZoneRow[]>([]);
  const [status, setStatus] = useState<ApiStatus>('loading');
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE}/api/consultas/heatmap-zonas?periodo=${PERIOD}`)
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`);
        return response.json() as Promise<HeatmapResponse>;
      })
      .then((payload) => {
        if (!mounted) return;
        const usableRows = payload.data ?? [];
        setRows(usableRows);
        setStatus(usableRows.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        if (mounted) setStatus('error');
      });

    return () => { mounted = false; };
  }, []);

  const rowByZone = useMemo(() => {
    const map = new Map<string, HeatmapZoneRow>();
    rows.forEach((row) => map.set(row.zona_key || normalizeText(row.zona), row));
    return map;
  }, [rows]);

  const values = useMemo(
    () => rows.map((row) => row.consumo).filter((value) => Number.isFinite(value)),
    [rows],
  );

  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const mid = values.length ? (min + max) / 2 : 0;

  const rankedRows = useMemo(
    () => [...rows].sort((a, b) => b.consumo - a.consumo),
    [rows],
  );

  const selectedZone = selectedZoneId ? COCHABAMBA_ZONE_PATHS.find((zone) => zone.id === selectedZoneId) ?? null : null;
  const selectedRow = selectedZone ? rowByZone.get(normalizeText(selectedZone.zoneName)) ?? null : null;

  return (
    <section className="mt-8 space-y-6 border-t border-outline-variant pt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <Thermometer className="h-3.5 w-3.5" /> Analisis termico
          </span>
          <h2 className="mt-0.5 text-xl font-bold text-on-surface">Mapa de calor SVG - Consumo real</h2>
          <p className="text-sm text-on-surface-variant">
            Periodo {PERIOD} - colores calculados desde Cassandra por zona.
          </p>
        </div>
        <span
          className={cn(
            'w-fit rounded-lg border px-3 py-1.5 text-[10px] font-bold',
            status === 'ready' ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-400' :
            status === 'error' ? 'border-red-400/25 bg-red-500/10 text-red-400' :
            status === 'empty' ? 'border-amber-400/25 bg-amber-500/10 text-amber-400' :
            'border-outline-variant bg-surface-container text-on-surface-variant',
          )}
        >
          {status === 'ready' ? 'Cassandra: consumo real' :
           status === 'error' ? 'Error de API' :
           status === 'empty' ? 'Sin datos' :
           'Cargando datos'}
        </span>
      </div>

      {status !== 'ready' && (
        <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low">
          <div className="flex flex-col items-center gap-3 text-center">
            <Database className="h-8 w-8 text-on-surface-variant" />
            <p className="text-sm font-bold text-on-surface">
              {status === 'loading' ? 'Consultando consumo por zona...' :
               status === 'empty' ? 'No hay consumo para el periodo' :
               'No se pudo consultar el backend'}
            </p>
            <p className="max-w-md text-xs text-on-surface-variant">
              Endpoint usado: /api/consultas/heatmap-zonas?periodo={PERIOD}
            </p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low lg:col-span-8">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-3.5">
              <div>
                <h3 className="text-sm font-bold text-on-surface">SVG Cochabamba coloreado por consumo</h3>
                <p className="text-xs text-on-surface-variant">
                  Cada path usa id, data-name y data-district para asociarse al consumo real.
                </p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] font-bold text-primary">
                {rows.length} zonas con dato
              </span>
            </div>

            <div className="relative h-[780px] min-h-[520px] bg-[radial-gradient(ellipse_80%_70%_at_50%_38%,#eef6ff_0%,#f8fbff_64%,#eef4ff_100%)]">
              <svg
                viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-full w-full"
                role="img"
                aria-label="Mapa de calor de consumo real por zona en Cochabamba"
              >
                <defs>
                  <pattern id="heat-carto-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect x={0} y={0} width={VIEWBOX_W} height={VIEWBOX_H} fill="transparent" />
                <rect x={0} y={0} width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#heat-carto-grid)" opacity="0.35" />

                {COCHABAMBA_ZONE_PATHS.map((zone) => {
                  const row = rowByZone.get(normalizeText(zone.zoneName)) ?? null;
                  const consumo = row?.consumo ?? null;
                  const selected = selectedZoneId === zone.id;
                  const dimmed = selectedZoneId != null && !selected;
                  const fill = heatColor(consumo, min, max);
                  const stroke = selected ? '#111827' : readableStroke(consumo, min, max);
                  const districtName = buildDistrictName(row, zone.districtId);

                  return (
                    <path
                      key={zone.id}
                      id={zone.id}
                      data-name={zone.zoneName}
                      data-district={zone.districtId}
                      data-consumo={consumo ?? undefined}
                      d={zone.d}
                      fill={fill}
                      fillOpacity={dimmed ? 0.36 : 0.92}
                      stroke={stroke}
                      strokeWidth={selected ? 2.6 : 0.8}
                      strokeLinejoin="round"
                      style={{
                        cursor: 'pointer',
                        filter: selected ? 'drop-shadow(0 4px 10px rgba(17,24,39,0.35)) brightness(1.04)' : 'none',
                        transition: 'fill 220ms ease, fill-opacity 180ms ease, stroke-width 160ms ease, filter 160ms ease',
                      }}
                      onMouseEnter={(event) => setHover({
                        x: event.clientX,
                        y: event.clientY,
                        zone,
                        row,
                        distritoNombre: districtName,
                      })}
                      onMouseMove={(event) => setHover((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setSelectedZoneId((current) => current === zone.id ? null : zone.id)}
                    >
                      <title>{`${zone.zoneName} - ${districtName} - ${consumo == null ? 'sin dato' : `${fmtNumber(consumo)} m3`}`}</title>
                    </path>
                  );
                })}

                {DISTRITO_BOUNDARIES.map((district) => {
                  const hasRows = rows.some((row) => row.distrito_id === district.id);
                  const selected = selectedZone?.districtId === district.id;
                  return (
                    <text
                      key={`label-${district.id}`}
                      x={district.centroid[0]}
                      y={district.centroid[1]}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={selected ? 20 : 14}
                      fontFamily="'Inter', system-ui, sans-serif"
                      fontWeight={selected ? 900 : 800}
                      fill={hasRows ? '#0f172a' : '#64748b'}
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth={selected ? 5 : 4}
                      paintOrder="stroke fill"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      D{district.id}
                    </text>
                  );
                })}
              </svg>
              <HoverTooltip hover={hover} />
            </div>
          </div>

          <aside className="space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Zona seleccionada
              </p>
              {selectedZone == null ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-on-surface-variant">
                  <MapPin className="h-4 w-4" />
                  Haz clic en una zona del SVG.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-lg font-extrabold text-on-surface">{selectedZone.zoneName}</p>
                    <p className="text-sm font-bold text-on-surface">{buildDistrictName(selectedRow, selectedZone.districtId)}</p>
                  </div>
                  <div className="rounded-lg bg-surface-container px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Consumo total</p>
                    <p className="font-mono text-xl font-extrabold text-on-surface">
                      {selectedRow ? `${fmtNumber(selectedRow.consumo)} m3` : 'Sin dato'}
                    </p>
                    {selectedRow && (
                      <p className="mt-1 text-[10px] font-semibold text-on-surface-variant">
                        {selectedRow.medidores.toLocaleString('es-BO')} medidores asociados
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-md border border-outline-variant bg-surface-container px-2 py-1 text-[10px] font-semibold text-on-surface-variant">
                      path id: {selectedZone.id}
                    </span>
                    <span className="rounded-md border border-outline-variant bg-surface-container px-2 py-1 text-[10px] font-semibold text-on-surface-variant">
                      data-district: {selectedZone.districtId}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Ranking consumo por zona {PERIOD}
              </p>
              <div className="mt-4 space-y-2">
                {rankedRows.slice(0, 8).map((row, index) => {
                  const pct = max > 0 ? (row.consumo / max) * 100 : 0;
                  return (
                    <button
                      key={row.zona_key}
                      type="button"
                      onClick={() => {
                        const zone = COCHABAMBA_ZONE_PATHS.find((path) => normalizeText(path.zoneName) === row.zona_key);
                        if (zone) setSelectedZoneId(zone.id);
                      }}
                      className="grid w-full grid-cols-[24px_1fr_88px] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-container"
                    >
                      <span className="text-right text-[10px] font-bold text-on-surface-variant">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-on-surface">{row.zona}</span>
                        <span className="mt-1 block h-2 rounded-full bg-surface-container-high">
                          <span
                            className="block h-2 rounded-full"
                            style={{ width: `${pct}%`, background: heatColor(row.consumo, min, max) }}
                          />
                        </span>
                      </span>
                      <span className="text-right font-mono text-xs font-bold text-on-surface">
                        {fmtNumber(row.consumo)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <HeatLegend min={min} mid={mid} max={max} />

            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Comunas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {COMUNAS.map((comuna) => (
                  <span key={comuna.id} className="rounded-md border border-outline-variant bg-surface-container px-2 py-1 text-[10px] font-semibold text-on-surface-variant">
                    {comuna.nombre}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
