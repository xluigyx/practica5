import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Map as MapIcon, ZoomIn, ZoomOut, RotateCcw, Layers, BarChart2 } from 'lucide-react';
import { COCHABAMBA_ZONE_PATHS, type ZonePath } from './cochabamba-zone-paths-v2';
import {
  COMUNAS,
  getComunaByDistritoId,
  type MapMetric, MAP_METRIC_LABELS, MAP_METRIC_INVERT,
} from './semapa-territory-v2';
import type { DistritoMetrics } from './semapa-map-types-v2';
import { cn } from '@/src/lib/utils';

// âââ Toggles ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const DEBUG_ZONES = false;
const SHOW_DISTRICT_LABELS = true;

// âââ Constants ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const VB_W = 918;
const VB_H = 1297;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 6;
const ZOOM_STEP = 1.35;

// âââ Pastel district colors (familia cromÃ¡tica por comuna) ââââââââââââââââââââ
const DISTRICT_PASTEL: Record<number, string> = {
  1:  '#BFE8B8', // Tunari  â D1  (verde suave)
  2:  '#A9DFA2', // Tunari  â D2  (verde medio)
  13: '#8FD48A', // Tunari  â D13 (verde mÃ¡s oscuro)
  3:  '#BFD8F2', // Molle   â D3  (azul suave)
  4:  '#9FC5E8', // Molle   â D4  (azul medio)
  10: '#F8E7A3', // Adela Z â D10 (amarillo suave)
  11: '#F5D87A', // Adela Z â D11 (amarillo medio)
  12: '#F2C85E', // Adela Z â D12 (Ã¡mbar)
  6:  '#AEE3E0', // Valle H â D6  (celeste suave)
  7:  '#8DD6D2', // Valle H â D7  (turquesa medio)
  14: '#70C7C4', // Valle H â D14 (turquesa mÃ¡s oscuro)
  5:  '#F6C6A6', // Alejo C â D5  (naranja suave)
  8:  '#F0AA7E', // Alejo C â D8  (naranja medio)
  9:  '#D8BDE8', // Itocta  â D9  (lila suave)
  15: '#C7A3DA', // Itocta  â D15 (lila medio)
};

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
type ViewMode = 'commune' | 'heatmap';

interface TooltipState {
  x: number; y: number;
  zoneName: string;
  districtId: number;
  districtName: string;
  communeName: string;
  communeColor: string;
  metricLabel: string;
  metricValue: string;
  status?: string;
}

interface Props {
  distritos: DistritoMetrics[];
  selectedDistritoId: number | null;
  onSelectDistrito: (id: number | null) => void;
  metric: MapMetric;
  className?: string;
  defaultViewMode?: ViewMode;
  lockViewMode?: boolean;
}

// âââ Color helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function lerpRgb(a: [number,number,number], b: [number,number,number], t: number): string {
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
}

// Paleta heatmap pastel: menta â amarillo â Ã¡mbar â coral
function lightHeatColor(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const stops: [number,number,number][] = [
    [187, 247, 208], // #bbf7d0 â menta
    [254, 249, 195], // #fef9c3 â amarillo muy suave
    [253, 230, 138], // #fde68a â Ã¡mbar suave
    [252, 165, 165], // #fca5a5 â coral suave
  ];
  const seg = Math.min(2, Math.floor(c * 3));
  return lerpRgb(stops[seg], stops[seg + 1], (c * 3) - seg);
}

function getMetricValue(d: DistritoMetrics, metric: MapMetric): number {
  switch (metric) {
    case 'consumo':   return d.consumoM3;
    case 'cobertura': return d.cobertura;
    case 'poblacion': return d.poblacion;
    case 'medidores': return (d.medidoresActivos / d.medidoresTotal) * 100;
    case 'ica':       return d.calidadICA;
    case 'estres':    return d.consumoM3 / d.poblacion * 1000;
    default:          return d.consumoM3;
  }
}

function formatMetricValue(v: number, metric: MapMetric): string {
  switch (metric) {
    case 'consumo':   return `${v} mÂ³/s`;
    case 'cobertura': return `${v.toFixed(1)}%`;
    case 'poblacion': return v.toLocaleString('es-BO');
    case 'medidores': return `${v.toFixed(1)}%`;
    case 'ica':       return `${v}/100`;
    case 'estres':    return v.toFixed(2);
    default:          return String(v);
  }
}

// âââ Status labels ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const STATUS_META: Record<string, { label: string; color: string }> = {
  'normal':        { label: 'Normal',        color: '#059669' },
  'alta-demanda':  { label: 'Alta Demanda',  color: '#d97706' },
  'critico':       { label: 'CrÃ­tico',       color: '#dc2626' },
  'mantenimiento': { label: 'Mantenimiento', color: '#7c3aed' },
};

// âââ Tooltip ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Tooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;
  const st = state.status ? STATUS_META[state.status] : null;
  return (
    <div className="pointer-events-none fixed z-50" style={{ left: state.x + 16, top: state.y - 14 }}>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${state.communeColor}40`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px ${state.communeColor}15`,
          minWidth: 200,
          maxWidth: 252,
          fontSize: 12,
        }}
      >
        <div style={{ height: 3, background: `linear-gradient(90deg, ${state.communeColor} 0%, ${state.communeColor}30 100%)` }} />
        <div style={{ padding: '12px 14px 14px' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', lineHeight: 1.3, marginBottom: 8 }}>
            {state.zoneName}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>D{state.districtId}</span>
            <span style={{ fontSize: 10, color: '#475569' }}>Â·</span>
            <span style={{ fontSize: 10, color: '#64748b', flexShrink: 1, minWidth: 0 }}>{state.districtName}</span>
            <span style={{
              marginLeft: 'auto', fontSize: 9, fontWeight: 700,
              padding: '2px 6px', borderRadius: 4,
              background: `${state.communeColor}22`, color: state.communeColor, flexShrink: 0,
            }}>
              {state.communeName}
            </span>
          </div>
          <div style={{ borderTop: `1px solid rgba(255,255,255,0.07)`, marginBottom: 10 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {state.metricLabel}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#f8fafc' }}>
              {state.metricValue}
            </span>
          </div>
          {st && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: `${st.color}22`, color: st.color,
              }}>
                {st.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// âââ Main component âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function CochabambaMapV2({
  distritos, selectedDistritoId, onSelectDistrito, metric, className,
  defaultViewMode, lockViewMode,
}: Props) {
  // ââ State ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const [hoveredDistrictId, setHoveredDistrictId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode ?? 'commune');
  const [zoomPct, setZoomPct] = useState(100);
  const [districtCentroids, setDistrictCentroids] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [districtBBoxes, setDistrictBBoxes] = useState<Map<number, { minX: number; minY: number; maxX: number; maxY: number }>>(new Map());

  // ââ Refs for smooth animation (no React re-render per frame) âââââââââââââââ
  const tZoom = useRef(1);       // target values
  const tPanX = useRef(0);
  const tPanY = useRef(0);
  const cZoom = useRef(1);       // current animated values
  const cPanX = useRef(0);
  const cPanY = useRef(0);

  const dragRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null);
  const isDragging = useRef(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ââ Fade-in on mount âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  // ââ RAF animation loop â smooth zoom/pan via direct setAttribute âââââââââââ
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      // Exponential ease: ~18% closer per frame at 60fps â ~300ms feel
      const k = 1 - Math.pow(0.82, dt);
      cZoom.current += (tZoom.current - cZoom.current) * k;
      cPanX.current += (tPanX.current - cPanX.current) * k;
      cPanY.current += (tPanY.current - cPanY.current) * k;
      const z = cZoom.current;
      const vpW = VB_W / z;
      const vpH = VB_H / z;
      const px = Math.max(-VB_W * 0.4, Math.min(VB_W * 0.4, cPanX.current));
      const py = Math.max(-VB_H * 0.4, Math.min(VB_H * 0.4, cPanY.current));
      const vb = `${VB_W / 2 - vpW / 2 - px} ${VB_H / 2 - vpH / 2 - py} ${vpW} ${vpH}`;
      svgRef.current?.setAttribute('viewBox', vb);
      const pct = Math.round(z * 100);
      setZoomPct(prev => prev !== pct ? pct : prev);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ââ Compute district bboxes & centroids via getBBox (post-mount) âââââââââââ
  useEffect(() => {
    if (!svgRef.current) return;
    const paths = svgRef.current.querySelectorAll<SVGPathElement>('[data-district]');
    const bboxMap = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();
    paths.forEach(p => {
      const id = parseInt(p.dataset.district!, 10);
      try {
        const bb = p.getBBox();
        const prev = bboxMap.get(id) ?? { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        bboxMap.set(id, {
          minX: Math.min(prev.minX, bb.x),
          minY: Math.min(prev.minY, bb.y),
          maxX: Math.max(prev.maxX, bb.x + bb.width),
          maxY: Math.max(prev.maxY, bb.y + bb.height),
        });
      } catch { /* non-browser */ }
    });
    const centroids = new Map<number, { x: number; y: number }>();
    bboxMap.forEach((bb, id) => centroids.set(id, { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 }));
    setDistrictCentroids(centroids);
    setDistrictBBoxes(bboxMap);
  }, []);

  // ââ Memoised heatmap fills (recomputed when metric changes) ââââââââââââââââ
  const districtFills = useMemo(() => {
    const vals = distritos.map(d => getMetricValue(d, metric));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return new Map(distritos.map(d => {
      const raw = getMetricValue(d, metric);
      const t = max === min ? 0.5 : (raw - min) / (max - min);
      return [d.id, lightHeatColor(MAP_METRIC_INVERT[metric] ? 1 - t : t)];
    }));
  }, [distritos, metric]);

  // ââ Zone fill resolver âââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const getZoneFill = useCallback((districtId: number): string => {
    if (viewMode === 'commune') return DISTRICT_PASTEL[districtId] ?? '#d1d5db';
    return districtFills.get(districtId) ?? '#d1fce7';
  }, [viewMode, districtFills]);

  // ââ Zoom / pan controls ââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const zoomIn  = useCallback(() => { tZoom.current = Math.min(MAX_ZOOM, tZoom.current * ZOOM_STEP); }, []);
  const zoomOut = useCallback(() => { tZoom.current = Math.max(MIN_ZOOM, tZoom.current / ZOOM_STEP); }, []);
  const resetView = useCallback(() => { tZoom.current = 1; tPanX.current = 0; tPanY.current = 0; }, []);

  // ââ Pan drag âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, px: tPanX.current, py: tPanY.current };
    isDragging.current = false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / tZoom.current;
    const dy = (e.clientY - dragRef.current.startY) / tZoom.current;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
    if (isDragging.current) {
      tPanX.current = dragRef.current.px + dx;
      tPanY.current = dragRef.current.py + dy;
    }
  }, []);

  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // ââ Wheel zoom âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      tZoom.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, tZoom.current * factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ââ Zone hover handlers ââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const handleZoneEnter = useCallback((e: React.MouseEvent, zone: ZonePath) => {
    const commune = getComunaByDistritoId(zone.districtId);
    const distrito = distritos.find(d => d.id === zone.districtId);
    const metricVal = distrito ? formatMetricValue(getMetricValue(distrito, metric), metric) : 'â';
    setHoveredDistrictId(zone.districtId);
    setTooltip({
      x: e.clientX, y: e.clientY,
      zoneName: zone.zoneName,
      districtId: zone.districtId,
      districtName: distrito?.name ?? `D-${zone.districtId}`,
      communeName: commune?.nombre ?? 'â',
      communeColor: commune?.color ?? '#6b7280',
      metricLabel: MAP_METRIC_LABELS[metric],
      metricValue: metricVal,
      status: distrito?.status,
    });
  }, [distritos, metric]);

  const handleZoneMove = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  const handleZoneLeave = useCallback(() => {
    setHoveredDistrictId(null);
    setTooltip(null);
  }, []);

  // ââ Zone click â select + zoom âââââââââââââââââââââââââââââââââââââââââââââ
  const handleZoneClick = useCallback((e: React.MouseEvent, districtId: number) => {
    if (isDragging.current) return;
    const newSel = districtId === selectedDistritoId ? null : districtId;
    onSelectDistrito(newSel);

    if (newSel !== null) {
      const bbox = districtBBoxes.get(newSel);
      if (bbox) {
        const pad = 55;
        const bw = bbox.maxX - bbox.minX + pad * 2;
        const bh = bbox.maxY - bbox.minY + pad * 2;
        const cx = (bbox.minX + bbox.maxX) / 2;
        const cy = (bbox.minY + bbox.maxY) / 2;
        const newZ = Math.min(MAX_ZOOM, Math.min(VB_W / bw, VB_H / bh) * 0.92);
        tZoom.current = newZ;
        tPanX.current = VB_W / 2 - cx;
        tPanY.current = VB_H / 2 - cy;
      }
    } else {
      tZoom.current = 1;
      tPanX.current = 0;
      tPanY.current = 0;
    }
  }, [selectedDistritoId, onSelectDistrito, districtBBoxes]);

  // ââ Breadcrumb data ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const selectedCommune = selectedDistritoId ? getComunaByDistritoId(selectedDistritoId) : null;
  const selectedDistrict = selectedDistritoId ? distritos.find(d => d.id === selectedDistritoId) : null;
  const districtShortName = selectedDistrict?.name.replace(/^D-\d+\s+/, '') ?? '';
  const hasSelection = selectedDistritoId !== null;

  // ââ Render âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  return (
    <div className={cn('relative flex flex-col h-full', className)}>

      {/* ââ Breadcrumb ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-outline-variant bg-surface-container-low/40 flex-shrink-0 overflow-hidden">
        <MapIcon className="w-3.5 h-3.5 text-on-surface-variant flex-shrink-0" />
        <span className="text-xs font-bold text-on-surface flex-shrink-0">Cochabamba</span>

        {selectedCommune && selectedDistrict ? (
          <>
            <span className="text-on-surface-variant/40 text-sm flex-shrink-0">âº</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: `${selectedCommune.color}25`, color: selectedCommune.colorDark, border: `1px solid ${selectedCommune.color}50` }}
            >
              {selectedCommune.nombre}
            </span>
            <span className="text-[11px] font-semibold text-on-surface truncate">
              D{selectedDistritoId} Â· {districtShortName}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-on-surface-variant">54 zonas Â· 15 distritos Â· 6 comunas</span>
        )}

        {/* View mode toggle */}
        {!lockViewMode && <button
          onClick={() => setViewMode(v => v === 'commune' ? 'heatmap' : 'commune')}
          title={viewMode === 'commune' ? 'Cambiar a heatmap' : 'Cambiar a comunas'}
          className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-md border transition-all duration-150"
          style={viewMode === 'commune'
            ? { background: 'rgba(0,52,111,0.08)', color: '#00346f', border: '1px solid rgba(0,52,111,0.2)' }
            : { background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }
          }
        >
          {viewMode === 'commune' ? <Layers className="w-2.5 h-2.5" /> : <BarChart2 className="w-2.5 h-2.5" />}
          {viewMode === 'commune' ? 'Comunas' : 'Heatmap'}
        </button>}

        {/* Reset / ver completo */}
        {hasSelection && (
          <button
            onClick={() => { onSelectDistrito(null); tZoom.current = 1; tPanX.current = 0; tPanY.current = 0; }}
            className="flex-shrink-0 text-[9px] font-semibold text-on-surface-variant hover:text-primary bg-surface-container hover:bg-surface-container-high px-2 py-1 rounded-md border border-outline-variant transition-all duration-150 flex items-center gap-1"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Ver completo
          </button>
        )}

        <span className="flex-shrink-0 text-[9px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/50">
          {MAP_METRIC_LABELS[metric]}
        </span>
      </div>

      {/* ââ Map area ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
      <div
        ref={svgContainerRef}
        className="flex-1 min-h-0 relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 38%, #dde8ff 0%, #eef3ff 60%, #f0f4ff 100%)',
          cursor: dragRef.current ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          style={{ display: 'block', userSelect: 'none', opacity: mounted ? 1 : 0, transition: 'opacity 0.7s ease' }}
        >
          <defs>
            {/* Subtle cartographic grid â light theme */}
            <pattern id="carto-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#b8ccf0" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background */}
          <rect x={0} y={0} width={VB_W} height={VB_H} fill="transparent" />
          <rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#carto-grid)" opacity="0.45" />

          {/* ââ Zone fill pass âââââââââââââââââââââââââââââââââââââââââââââââ */}
          {COCHABAMBA_ZONE_PATHS.map((zone) => {
            const commune = getComunaByDistritoId(zone.districtId);
            const communeColorDark = commune?.colorDark ?? '#374151';
            const isHov = zone.districtId === hoveredDistrictId;
            const isSel = zone.districtId === selectedDistritoId;
            const fill = getZoneFill(zone.districtId);

            // Opacity: dim non-selected when something is selected
            const opacity = hasSelection ? (isSel ? 1 : 0.38) : 1;

            // Stroke: 3 levels â zone / district hover / district selected
            const stroke = isSel
              ? communeColorDark
              : isHov
                ? `${communeColorDark}cc`
                : `${communeColorDark}40`;
            const strokeWidth = isSel ? 2 : isHov ? 1.4 : 0.65;

            // CSS filter for hover/select glow
            const cssFilter = isSel
              ? `drop-shadow(0 2px 8px ${communeColorDark}55) brightness(1.06)`
              : isHov
                ? `drop-shadow(0 1px 4px ${communeColorDark}33) brightness(1.04)`
                : 'none';

            if (DEBUG_ZONES) {
              return (
                <path
                  key={zone.id}
                  data-district={zone.districtId}
                  d={zone.d}
                  fill={fill}
                  fillOpacity={0.35}
                  stroke={communeColorDark}
                  strokeWidth={1}
                  strokeLinejoin="round"
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onMouseEnter={e => handleZoneEnter(e, zone)}
                  onMouseMove={handleZoneMove}
                  onMouseLeave={handleZoneLeave}
                  onClick={e => handleZoneClick(e, zone.districtId)}
                />
              );
            }

            return (
              <path
                key={zone.id}
                data-district={zone.districtId}
                d={zone.d}
                fill={fill}
                fillOpacity={opacity}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'all',
                  filter: cssFilter,
                  transition: [
                    'fill 0.4s ease-out',
                    'fill-opacity 0.25s ease',
                    'opacity 0.25s ease',
                    'stroke 0.2s ease',
                    'stroke-width 0.15s ease',
                    'filter 0.2s ease',
                  ].join(', '),
                  paintOrder: 'stroke fill',
                }}
                onMouseEnter={e => handleZoneEnter(e, zone)}
                onMouseMove={handleZoneMove}
                onMouseLeave={handleZoneLeave}
                onClick={e => handleZoneClick(e, zone.districtId)}
              />
            );
          })}

          {/* ââ Selection accent ring (rendered above all zones) âââââââââââââ */}
          {selectedDistritoId !== null &&
            COCHABAMBA_ZONE_PATHS
              .filter(z => z.districtId === selectedDistritoId)
              .map(zone => {
                const commune = getComunaByDistritoId(zone.districtId);
                return (
                  <path
                    key={`ring-${zone.id}`}
                    d={zone.d}
                    fill="none"
                    stroke={commune?.colorDark ?? '#1e3a5f'}
                    strokeWidth={3.5}
                    strokeOpacity={0.55}
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  />
                );
              })
          }

          {/* ââ District labels D1âD15 âââââââââââââââââââââââââââââââââââââââ */}
          {SHOW_DISTRICT_LABELS && !DEBUG_ZONES &&
            Array.from(districtCentroids.entries()).map(([id, pos]) => {
              const commune = getComunaByDistritoId(id);
              const isSel = id === selectedDistritoId;
              const isHov = id === hoveredDistrictId;
              const labelZoom = cZoom.current > 0.01 ? cZoom.current : 1;
              const fs = (isSel ? 18 : isHov ? 14 : 12) / labelZoom;
              const textColor = isSel ? (commune?.colorDark ?? '#1e3654') : (commune?.colorDark ?? '#374151');
              const haloColor = 'rgba(240,244,255,0.92)';
              return (
                <text
                  key={`dlbl-${id}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fs}
                  fontFamily="'Inter', system-ui, sans-serif"
                  fontWeight={isSel ? '900' : '700'}
                  letterSpacing="-0.3"
                  fill={textColor}
                  stroke={haloColor}
                  strokeWidth={(isSel ? 4.5 : 3.5) / labelZoom}
                  paintOrder="stroke fill"
                  style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    transition: 'font-size 0.2s ease',
                  }}
                >
                  D{id}
                </text>
              );
            })
          }

          {/* ââ Debug zone id labels âââââââââââââââââââââââââââââââââââââââââââ */}
          {DEBUG_ZONES && COCHABAMBA_ZONE_PATHS.map(zone => (
            <React.Fragment key={`dbg-${zone.id}`}>
              <ZoneDebugLabel d={zone.d} label={zone.id} />
            </React.Fragment>
          ))}

          {/* ââ Compass ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
          <g transform="translate(882, 48)" style={{ pointerEvents: 'none' }}>
            <circle cx="0" cy="0" r="18" fill="rgba(240,244,255,0.9)" stroke="#c5d5f080" strokeWidth="1" />
            <polygon points="0,-12 -4,-3 0,0 4,-3" fill="#1e3a5f" />
            <polygon points="0,12 -4,3 0,0 4,3" fill="#94a3b8" />
            <text x="0" y="-15" textAnchor="middle" style={{ fontSize: 8, fill: '#1e3a5f', fontWeight: 700, fontFamily: 'system-ui' }}>N</text>
          </g>
        </svg>

        {/* ââ Zoom controls ââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
          {([
            { label: 'Acercar',     icon: ZoomIn,    action: zoomIn,    sz: 'w-3.5 h-3.5' },
            { label: 'Alejar',      icon: ZoomOut,   action: zoomOut,   sz: 'w-3.5 h-3.5' },
            { label: 'Restablecer', icon: RotateCcw, action: resetView, sz: 'w-3 h-3' },
          ] as const).map(({ label, icon: Icon, action, sz }) => (
            <button
              key={label}
              onClick={action}
              title={label}
              className="w-8 h-8 rounded-lg bg-white/85 border border-outline-variant/60 text-on-surface-variant hover:text-primary hover:bg-white hover:border-primary/40 flex items-center justify-center transition-all duration-150 shadow-sm backdrop-blur-sm active:scale-95"
            >
              <Icon className={sz} />
            </button>
          ))}
        </div>

        {/* ââ Zoom badge âââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <div className="absolute bottom-3 right-3 text-[10px] font-bold tabular-nums text-on-surface-variant bg-white/80 border border-outline-variant/50 rounded-md px-2.5 py-1 shadow-sm backdrop-blur-sm">
          {zoomPct}%
        </div>
      </div>

      {/* ââ Legend ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
      <div className="px-4 pt-2.5 pb-3 border-t border-outline-variant bg-surface-container-low/20 flex-shrink-0 space-y-2">
        {/* Heatmap bar â only in heatmap mode */}
        {viewMode === 'heatmap' && (
          <div className="flex items-start gap-3">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider flex-shrink-0 pt-0.5 w-[66px]">
              {MAP_METRIC_LABELS[metric]}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="h-2 rounded-full"
                style={{ background: 'linear-gradient(to right, #bbf7d0, #fef9c3, #fde68a, #fca5a5)' }}
              />
              <div className="flex justify-between mt-0.5">
                {(MAP_METRIC_INVERT[metric]
                  ? ['Bajo', 'Normal', 'Alto', 'â  CrÃ­t.']
                  : ['â  CrÃ­t.', 'Alto', 'Normal', 'Bajo']
                ).map((l, i) => (
                  <span key={i} className="text-[8px] text-on-surface-variant/55">{l}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Commune chips with district pastel swatches */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {COMUNAS.map(c => (
            <div key={c.id} className="flex items-center gap-1.5">
              {/* Mini district color swatches */}
              <div className="flex gap-0.5 items-center">
                {c.distritoIds.map(id => (
                  <div
                    key={id}
                    className="rounded-sm"
                    style={{
                      width: 8, height: 8,
                      background: viewMode === 'commune' ? DISTRICT_PASTEL[id] : c.color,
                      border: `1px solid ${c.colorDark}30`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[9px] font-medium text-on-surface-variant/70 leading-none">{c.nombre}</span>
            </div>
          ))}
        </div>
      </div>

      <Tooltip state={tooltip} />
    </div>
  );
}

// âââ Debug zone label âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ZoneDebugLabel({ d, label }: { d: string; label: string }) {
  const ref = useRef<SVGPathElement>(null);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      const bb = ref.current.getBBox();
      setCenter({ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
    } catch { /* non-browser */ }
  }, []);
  return (
    <>
      <path ref={ref} d={d} fill="none" stroke="none" style={{ pointerEvents: 'none' }} />
      {center && (
        <text
          x={center.x} y={center.y}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={8} fontFamily="monospace" fontWeight="700"
          fill="#1e293b" stroke="white" strokeWidth={2.5} paintOrder="stroke fill"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {label}
        </text>
      )}
    </>
  );
}
