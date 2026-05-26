import { useState, useCallback, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import type { DistritoRaw } from '@/src/lib/api';
import {
  COMUNAS,
  getComunaByDistritoId,
  getDistritoById,
  type MapMetric,
} from './semapa-territory-v2';
import type { DistritoMetrics, StatusDistrito } from './semapa-map-types-v2';
import CochabambaMapV2 from './CochabambaMapV2';

// ─── Conversion: raw Cassandra row → DistritoMetrics (no mock fallback) ──────

const VALID_STATUS: StatusDistrito[] = ['normal', 'alta-demanda', 'critico', 'mantenimiento'];
function toStatus(s: string | null): StatusDistrito {
  return s && VALID_STATUS.includes(s as StatusDistrito) ? (s as StatusDistrito) : 'normal';
}

function rawToDistrito(raw: DistritoRaw): DistritoMetrics {
  const total   = raw.medidores_total ?? 0;
  const cobert  = raw.cobertura_pct   ?? 0;
  return {
    id:               raw.id,
    name:             raw.nombre,
    subalcaldia:      raw.subalcaldia,
    consumoM3:        raw.consumo_m3   ?? 0,
    presionPSI:       raw.presion_psi  ?? 0,
    poblacion:        raw.poblacion    ?? 0,
    medidoresTotal:   total,
    medidoresActivos: Math.round(total * cobert / 100),
    cobertura:        cobert,
    calidadICA:       raw.calidad_ica  ?? 0,
    temperatura:      raw.temperatura_c ?? 0,
    status:           toStatus(raw.status),
  };
}

// ─── Config visual ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusDistrito, { color: string; bg: string; label: string }> = {
  'normal':        { color:'#059669', bg:'rgba(5,150,105,0.10)',  label:'Normal' },
  'alta-demanda':  { color:'#d97706', bg:'rgba(217,119,6,0.10)',  label:'Alta Demanda' },
  'critico':       { color:'#dc2626', bg:'rgba(220,38,38,0.10)',  label:'Crítico' },
  'mantenimiento': { color:'#7c3aed', bg:'rgba(124,58,237,0.10)', label:'Mantenimiento' },
};

const METRIC_OPTIONS: { value: MapMetric; label: string }[] = [
  { value:'consumo',   label:'Consumo'    },
  { value:'cobertura', label:'Cobertura'  },
  { value:'poblacion', label:'Población'  },
  { value:'medidores', label:'Medidores'  },
  { value:'ica',       label:'Calidad ICA'},
  { value:'estres',    label:'Estrés'     },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricSelector({ value, onChange }: { value: MapMetric; onChange: (m: MapMetric) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {METRIC_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'text-[10px] font-bold px-2.5 py-1 rounded-md transition-all border',
            value === opt.value
              ? 'bg-primary text-on-primary border-primary'
              : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-on-surface'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ZoneList({ zonas, comunaColor }: { zonas: string[]; comunaColor?: string }) {
  const dotColor = comunaColor ?? 'var(--color-primary)';
  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <MapPin className="w-3 h-3" /> Zonas ({zonas.length})
      </p>
      <div className="space-y-1">
        {zonas.map(z => (
          <div
            key={z}
            className="flex items-center gap-2.5 text-xs text-on-surface-variant rounded-md px-2.5 py-1.5 hover:bg-surface-container-low/50 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor, opacity: 0.8 }} />
            <span className="leading-tight">{z}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistrictDetailPanel({
  district,
  loading,
}: {
  district: DistritoMetrics | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="glass-card rounded-xl p-8 flex items-center justify-center border border-outline-variant">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-on-surface-variant">Consultando Cassandra...</p>
        </div>
      </div>
    );
  }

  if (!district) {
    return (
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
  }

  const st = STATUS_CFG[district.status];
  const boundary = getDistritoById(district.id);
  const comuna = getComunaByDistritoId(district.id);
  const medPct = (district.medidoresActivos / district.medidoresTotal) * 100;

  return (
    <div
      key={district.id}
      className="glass-card rounded-xl border border-outline-variant overflow-hidden"
      style={{
        animation: 'panelSlideIn 0.28s ease-out both',
        borderLeft: `3px solid ${comuna?.color ?? 'transparent'}`,
      }}
    >
      {comuna && (
        <div style={{ height: 3, background: `linear-gradient(90deg, ${comuna.color} 0%, ${comuna.color}30 100%)` }} />
      )}
      <div className="p-5 overflow-y-auto max-h-[580px]">
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
            { l:'Consumo',     v:`${district.consumoM3} m³/s`,              c: district.consumoM3 > 450 ? '#ef4444' : '#60a5fa' },
            { l:'Presión',     v:`${district.presionPSI} PSI`,               c:'#22d3ee' },
            { l:'Población',   v: district.poblacion.toLocaleString('es-BO'),c:'#34d399' },
            { l:'Cobertura',   v:`${district.cobertura}%`,                   c:'#a78bfa' },
            { l:'Calidad ICA', v:`${district.calidadICA}/100`,               c: district.calidadICA >= 80 ? '#34d399' : district.calidadICA >= 70 ? '#f59e0b' : '#ef4444' },
            { l:'Temperatura', v:`${district.temperatura}°C`,                c:'#f87171' },
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
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : medPct >= 88
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
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

        {boundary && <ZoneList zonas={boundary.zonas} comunaColor={comuna?.color} />}
      </div>
    </div>
  );
}

// ─── Main wrapper ─────────────────────────────────────────────────────────────

export default function MapaCochabambaV2Section() {
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<MapMetric>('consumo');
  const [distritos, setDistritos] = useState<DistritoMetrics[]>([]);
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  // Fetch real data from Cassandra via backend — no mock fallback
  useEffect(() => {
    api.distritos()
      .then((rawList) => {
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

  return (
    <section className="space-y-6 mt-8 pt-8 border-t border-outline-variant">
      {/* Section header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-bold text-secondary uppercase tracking-widest">Mapa Interactivo V2</span>
          <h2 className="text-xl font-bold text-on-surface mt-0.5">Mapa Interactivo Cochabamba — Versión Actualizada</h2>
          <p className="text-sm text-on-surface-variant">6 Comunas · 15 Distritos · 54 Zonas SVG</p>
        </div>
        {/* Data source badge */}
        <span
          className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
          style={
            apiStatus === 'ready'
              ? { background:'rgba(5,150,105,0.10)', color:'#059669', border:'1px solid rgba(5,150,105,0.25)' }
              : apiStatus === 'error'
              ? { background:'rgba(220,38,38,0.10)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.25)' }
              : apiStatus === 'empty'
              ? { background:'rgba(245,158,11,0.10)', color:'#d97706', border:'1px solid rgba(245,158,11,0.25)' }
              : { background:'rgba(100,116,139,0.10)', color:'#64748b', border:'1px solid rgba(100,116,139,0.25)' }
          }
        >
          {apiStatus === 'ready'   ? '● Cassandra'
          : apiStatus === 'error'  ? '● Error de conexión'
          : apiStatus === 'empty'  ? '● Sin datos en BD'
          :                          '● Cargando...'}
        </span>
      </div>

      {/* Loading / empty / error states */}
      {apiStatus !== 'ready' && (
        <div className="glass-card rounded-xl border border-outline-variant flex items-center justify-center" style={{ minHeight: 220 }}>
          {apiStatus === 'loading' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-on-surface-variant">Consultando Cassandra...</p>
            </div>
          )}
          {apiStatus === 'empty' && (
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-2xl">🗄️</div>
              <p className="text-sm font-bold text-on-surface">Base de datos vacía</p>
              <p className="text-xs text-on-surface-variant opacity-70">No hay distritos registrados en Cassandra. Ejecuta el seeder para poblar los datos.</p>
            </div>
          )}
          {apiStatus === 'error' && (
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-2xl">⚠️</div>
              <p className="text-sm font-bold text-on-surface">Sin conexión al backend</p>
              <p className="text-xs text-on-surface-variant opacity-70">No se pudo conectar con la API en el puerto 4000. Verifica que el contenedor esté corriendo.</p>
            </div>
          )}
        </div>
      )}

      {/* Mapa + Panel — solo cuando hay datos reales */}
      {apiStatus === 'ready' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mapa interactivo */}
        <div className="lg:col-span-7 glass-card rounded-xl overflow-hidden border border-outline-variant flex flex-col">
          <div className="px-5 py-3.5 border-b border-outline-variant">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Mapa Interactivo — Cochabamba</h3>
                <p className="text-xs text-on-surface-variant">Nivel 1: comunas → Nivel 2: distritos → panel: zonas</p>
              </div>
            </div>
            <MetricSelector value={metric} onChange={setMetric} />
          </div>
          <div style={{ height: 860 }}>
            <CochabambaMapV2
              distritos={distritos}
              selectedDistritoId={sel}
              onSelectDistrito={handleSelect}
              metric={metric}
              className="h-full"
            />
          </div>
        </div>

        {/* Panel lateral */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <DistrictDetailPanel district={district} loading={loading} />

          {/* Ranking consumo */}
          <div className="glass-card rounded-xl p-5 border border-outline-variant">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">Ranking Consumo</p>
            <div className="space-y-2">
              {[...distritos].sort((a, b) => b.consumoM3 - a.consumoM3).slice(0, 5).map(d => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleSelect(d.id)}
                >
                  <span className="text-[10px] font-bold w-7 text-on-surface-variant text-right">D{d.id}</span>
                  <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(d.consumoM3 / Math.max(...distritos.map(x => x.consumoM3))) * 100}%`,
                        background: d.id === sel ? '#3b82f6' : STATUS_CFG[d.status].color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono text-on-surface w-16 text-right">{d.consumoM3} m³/s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Leyenda de comunas — solo cuando hay datos */}
      {apiStatus === 'ready' && (
        <div className="glass-card rounded-xl p-4 border border-outline-variant">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">Comunas / Subalcaldías</p>
          <div className="flex flex-wrap gap-3">
            {COMUNAS.map(c => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ background: c.color }} />
                <span className="text-xs text-on-surface-variant font-medium">{c.nombre}</span>
                <span className="text-[10px] text-on-surface-variant opacity-60">
                  ({c.distritoIds.map(id => `D${id}`).join(', ')})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
