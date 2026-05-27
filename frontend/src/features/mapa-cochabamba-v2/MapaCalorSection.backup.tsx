import { useState, useCallback, useEffect } from 'react';
import { Thermometer, MapPin } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import type { DistritoRaw } from '@/src/lib/api';
import {
  COMUNAS,
  getComunaByDistritoId,
  getDistritoById,
} from './semapa-territory-v2';
import type { DistritoMetrics, StatusDistrito } from './semapa-map-types-v2';
import CochabambaMapV2 from './CochabambaMapV2';

const VALID_STATUS: StatusDistrito[] = ['normal', 'alta-demanda', 'critico', 'mantenimiento'];

// Futuro: la capa de calor puede mejorar usando puntos por sensor/medidor con intensidad ponderada.
function toStatus(s: string | null): StatusDistrito {
  return s && VALID_STATUS.includes(s as StatusDistrito) ? (s as StatusDistrito) : 'normal';
}

function round2(value: number | null | undefined): number {
  return Number(Number(value ?? 0).toFixed(2));
}

function fmt2(value: number): string {
  return Number(value ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rawToDistrito(raw: DistritoRaw): DistritoMetrics {
  const total  = raw.medidores_total ?? 0;
  const cobert = round2(raw.cobertura_pct);
  return {
    id:               raw.id,
    name:             raw.nombre,
    subalcaldia:      raw.subalcaldia,
    consumoM3:        round2(raw.consumo_m3),
    presionPSI:       round2(raw.presion_psi),
    poblacion:        raw.poblacion     ?? 0,
    medidoresTotal:   total,
    medidoresActivos: Math.round(total * cobert / 100),
    cobertura:        cobert,
    calidadICA:       raw.calidad_ica   ?? 0,
    temperatura:      round2(raw.temperatura_c),
    status:           toStatus(raw.status),
  };
}

const STATUS_CFG: Record<StatusDistrito, { color: string; bg: string; label: string }> = {
  'normal':        { color:'#059669', bg:'rgba(5,150,105,0.10)',  label:'Normal' },
  'alta-demanda':  { color:'#d97706', bg:'rgba(217,119,6,0.10)',  label:'Alta Demanda' },
  'critico':       { color:'#dc2626', bg:'rgba(220,38,38,0.10)',  label:'Crítico' },
  'mantenimiento': { color:'#7c3aed', bg:'rgba(124,58,237,0.10)', label:'Mantenimiento' },
};

// Gradient legend — paleta pastel menta → amarillo → ámbar → coral
const LEGEND_STOPS = [
  { label: 'Bajo',   color: '#bbf7d0' },
  { label: 'Medio',  color: '#fde68a' },
  { label: 'Alto',   color: '#fca5a5' },
];

function HeatLegend({ min, max }: { min: number; max: number }) {
  return (
    <div className="glass-card rounded-xl p-4 border border-outline-variant">
      <div className="flex items-center gap-2 mb-3">
        <Thermometer className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          Escala de Calor — Consumo m³/s
        </p>
      </div>
      <div
        className="h-3 rounded-full w-full mb-2"
        style={{ background: 'linear-gradient(90deg, #bbf7d0 0%, #fef9c3 40%, #fde68a 70%, #fca5a5 100%)' }}
      />
      <div className="flex justify-between text-[9px] font-bold text-on-surface-variant">
        <span>{fmt2(min)} m³/s</span>
        <span style={{ color: '#fde68a' }}>Medio</span>
        <span style={{ color: '#fca5a5' }}>{fmt2(max)} m³/s</span>
      </div>
      <div className="flex gap-4 mt-3 flex-wrap">
        {LEGEND_STOPS.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
            <span className="text-[9px] text-on-surface-variant font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistrictPanel({ district, loading }: { district: DistritoMetrics | null; loading: boolean }) {
  if (loading) return (
    <div className="glass-card rounded-xl p-8 flex items-center justify-center border border-outline-variant">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-on-surface-variant">Consultando Cassandra…</p>
      </div>
    </div>
  );

  if (!district) return (
    <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center border border-outline-variant gap-3 text-center min-h-[180px]">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <MapPin className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-bold text-on-surface">Selecciona un distrito</p>
        <p className="text-xs text-on-surface-variant mt-1 opacity-70">Haz clic en cualquier zona del mapa</p>
      </div>
    </div>
  );

  const st = STATUS_CFG[district.status];
  const boundary = getDistritoById(district.id);
  const comuna = getComunaByDistritoId(district.id);
  const medPct = district.medidoresTotal > 0 ? (district.medidoresActivos / district.medidoresTotal) * 100 : 0;

  return (
    <div
      className="glass-card rounded-xl border border-outline-variant overflow-hidden"
      style={{
        animation: 'panelSlideIn 0.28s ease-out both',
        borderLeft: `3px solid ${comuna?.color ?? 'transparent'}`,
      }}
    >
      {comuna && (
        <div style={{ height: 3, background: `linear-gradient(90deg, ${comuna.color} 0%, ${comuna.color}30 100%)` }} />
      )}
      <div className="p-5 overflow-y-auto max-h-[540px]">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0">
            {comuna && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded mb-1.5 inline-block tracking-wider"
                style={{ background: `${comuna.color}20`, color: comuna.color, border: `1px solid ${comuna.color}40` }}
              >
                {comuna.nombre.toUpperCase()}
              </span>
            )}
            <h3 className="text-base font-bold text-on-surface leading-tight">{district.name}</h3>
            <p className="text-[10px] text-on-surface-variant mt-0.5 opacity-70">Subalcaldía {district.subalcaldia}</p>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5"
            style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30` }}
          >
            {st.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { l:'Consumo',     v:`${fmt2(district.consumoM3)} m³/s`,          c: district.consumoM3 > 450 ? '#ef4444' : '#60a5fa' },
            { l:'Presión',     v:`${fmt2(district.presionPSI)} PSI`,           c:'#22d3ee' },
            { l:'Población',   v: district.poblacion.toLocaleString('es-BO'), c:'#34d399' },
            { l:'Cobertura',   v:`${fmt2(district.cobertura)}%`,               c:'#a78bfa' },
            { l:'Calidad ICA', v:`${district.calidadICA}/100`,                c: district.calidadICA >= 80 ? '#34d399' : district.calidadICA >= 70 ? '#f59e0b' : '#ef4444' },
            { l:'Temperatura', v:`${fmt2(district.temperatura)}°C`,            c:'#f87171' },
          ].map(({ l, v, c }) => (
            <div
              key={l}
              className="relative rounded-lg p-2.5 overflow-hidden"
              style={{ background: `${c}09`, border: `1px solid ${c}25` }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg" style={{ background: `${c}cc` }} />
              <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wide mb-1.5 pl-1.5 opacity-70">{l}</p>
              <p className="text-sm font-bold font-mono pl-1.5" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-on-surface-variant opacity-80">Medidores activos</span>
            <span className="font-bold text-on-surface tabular-nums">
              {district.medidoresActivos.toLocaleString()} <span className="text-on-surface-variant font-normal">/</span> {district.medidoresTotal.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${medPct}%`,
                background: medPct >= 95
                  ? 'linear-gradient(90deg,#10b981,#34d399)'
                  : medPct >= 88
                    ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                    : 'linear-gradient(90deg,#ef4444,#f87171)',
              }}
            />
          </div>
          <p className="text-[9px] text-on-surface-variant mt-1 text-right opacity-60">{medPct.toFixed(1)}%</p>
        </div>

        {district.consumoM3 > 450 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-error-container/20 border border-error/25 text-xs font-bold text-error flex items-center gap-2">
            <span>⚠</span>
            <span>Consumo excesivo — umbral ONU (&gt;45 m³/conexión/mes)</span>
          </div>
        )}

        {boundary && (
          <div className="mt-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Zonas ({boundary.zonas.length})
            </p>
            <div className="space-y-1">
              {boundary.zonas.map(z => (
                <div key={z} className="flex items-center gap-2.5 text-xs text-on-surface-variant rounded-md px-2.5 py-1.5 hover:bg-surface-container-low/50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: comuna?.color ?? '#6b7280', opacity: 0.8 }} />
                  <span className="leading-tight">{z}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapaCalorSection() {
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [distritos, setDistritos] = useState<DistritoMetrics[]>([]);
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    api.distritos()
      .then(rawList => {
        if (rawList.length > 0) {
          setDistritos(rawList.map(rawToDistrito));
          setApiStatus('ready');
        } else {
          setApiStatus('empty');
        }
      })
      .catch(() => setApiStatus('error'));
  }, []);

  const district = distritos.find(d => d.id === sel) ?? null;

  const handleSelect = useCallback((id: number | null) => {
    if (id === null) { setSel(null); return; }
    setLoading(true);
    setSel(id);
    setTimeout(() => setLoading(false), 280);
  }, []);

  const cMin = distritos.length ? Math.min(...distritos.map(d => d.consumoM3)) : 0;
  const cMax = distritos.length ? Math.max(...distritos.map(d => d.consumoM3)) : 0;

  return (
    <section className="space-y-6 mt-8 pt-8 border-t border-outline-variant">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5" /> Análisis Térmico
          </span>
          <h2 className="text-xl font-bold text-on-surface mt-0.5">Mapa de Calor — Consumo por Distrito</h2>
          <p className="text-sm text-on-surface-variant">
            Intensidad cromática proporcional al consumo m³/s · {distritos.length} distritos
          </p>
        </div>
        <span
          className={cn(
            'text-[10px] font-bold px-3 py-1.5 rounded-lg border',
            apiStatus === 'ready'   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/25' :
            apiStatus === 'error'   ? 'bg-red-500/10 text-red-400 border-red-400/25' :
            apiStatus === 'empty'   ? 'bg-amber-500/10 text-amber-400 border-amber-400/25' :
            'bg-surface-container text-on-surface-variant border-outline-variant'
          )}
        >
          {apiStatus === 'ready'   ? '● Cassandra'
          : apiStatus === 'error'  ? '● Error de conexión'
          : apiStatus === 'empty'  ? '● Sin datos en BD'
          :                          '● Cargando…'}
        </span>
      </div>

      {/* Loading / empty / error */}
      {apiStatus !== 'ready' && (
        <div className="glass-card rounded-xl border border-outline-variant flex items-center justify-center" style={{ minHeight: 220 }}>
          {apiStatus === 'loading' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-on-surface-variant">Consultando Cassandra…</p>
            </div>
          )}
          {apiStatus === 'empty' && (
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-2xl">🗄️</div>
              <p className="text-sm font-bold text-on-surface">Base de datos vacía</p>
              <p className="text-xs text-on-surface-variant opacity-70">No hay distritos en Cassandra. Ejecuta el seeder.</p>
            </div>
          )}
          {apiStatus === 'error' && (
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-2xl">⚠️</div>
              <p className="text-sm font-bold text-on-surface">Sin conexión al backend</p>
              <p className="text-xs text-on-surface-variant opacity-70">Verifica que el contenedor API esté corriendo en el puerto 4000.</p>
            </div>
          )}
        </div>
      )}

      {/* Mapa de calor + panel lateral */}
      {apiStatus === 'ready' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mapa SVG locked en heatmap */}
          <div className="lg:col-span-7 glass-card rounded-xl overflow-hidden border border-outline-variant flex flex-col">
            <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Mapa de Calor SVG — Cochabamba</h3>
                <p className="text-xs text-on-surface-variant">
                  15 distritos · 54 zonas · paleta menta → ámbar → coral
                </p>
              </div>
              <div
                className="text-[9px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <Thermometer className="w-2.5 h-2.5" /> Heatmap activo
              </div>
            </div>
            <div style={{ height: 860 }}>
              <CochabambaMapV2
                distritos={distritos}
                selectedDistritoId={sel}
                onSelectDistrito={handleSelect}
                metric="consumo"
                defaultViewMode="heatmap"
                lockViewMode={true}
                className="h-full"
              />
            </div>
          </div>

          {/* Panel lateral */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <DistrictPanel district={district} loading={loading} />

            {/* Ranking consumo */}
            <div className="glass-card rounded-xl p-5 border border-outline-variant">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                Ranking Consumo m³/s
              </p>
              <div className="space-y-2">
                {[...distritos]
                  .sort((a, b) => b.consumoM3 - a.consumoM3)
                  .slice(0, 7)
                  .map((d, i) => {
                    const pct = cMax > 0 ? (d.consumoM3 / cMax) * 100 : 0;
                    const barColor = pct > 75 ? '#fca5a5' : pct > 50 ? '#fde68a' : pct > 25 ? '#fef9c3' : '#bbf7d0';
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleSelect(d.id)}
                      >
                        <span className="text-[10px] font-bold w-5 text-on-surface-variant text-right">{i + 1}</span>
                        <span className="text-[10px] font-bold w-6 text-on-surface-variant">D{d.id}</span>
                        <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                        <span className="text-xs font-bold font-mono text-on-surface w-16 text-right">
                          {fmt2(d.consumoM3)} m³/s
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda de calor */}
      {apiStatus === 'ready' && <HeatLegend min={cMin} max={cMax} />}
    </section>
  );
}
