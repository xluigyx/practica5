import { useState, useCallback } from 'react';
import { Users, Droplets, Activity, AlertTriangle, TrendingUp, Download, MapPin } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/src/lib/utils';
import { DISTRITOS, HISTORICO_CIUDAD } from '@/src/lib/semapa-data';
import {
  COMUNAS,
  getComunaByDistritoId, getDistritoById,
  type MapMetric,
} from '@/src/lib/semapa-territory';
import type { DistritoMetrics, StatusDistrito } from '@/src/lib/types';
import CochabambaMap from '@/src/components/CochabambaMap';

// ─── Config visual ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusDistrito, { color: string; bg: string; label: string }> = {
  'normal':        { color:'#059669', bg:'rgba(5,150,105,0.10)',  label:'Normal' },
  'alta-demanda':  { color:'#d97706', bg:'rgba(217,119,6,0.10)',  label:'Alta Demanda' },
  'critico':       { color:'#dc2626', bg:'rgba(220,38,38,0.10)',  label:'Crítico' },
  'mantenimiento': { color:'#7c3aed', bg:'rgba(124,58,237,0.10)', label:'Mantenimiento' },
};

const METRIC_OPTIONS: { value: MapMetric; label: string; short: string }[] = [
  { value:'consumo',   label:'Consumo',   short:'m³/s' },
  { value:'cobertura', label:'Cobertura',  short:'%' },
  { value:'poblacion', label:'Población',  short:'hab' },
  { value:'medidores', label:'Medidores',  short:'%' },
  { value:'ica',       label:'Calidad ICA',short:'/100' },
  { value:'estres',    label:'Estrés',     short:'idx' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 shadow-xl text-xs">
      <p className="font-bold text-on-surface-variant mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: <span className="text-on-surface">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

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
            className="flex items-center gap-2.5 text-xs text-on-surface-variant rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-container-low/50"
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
  const territoryBoundary = getDistritoById(district.id);
  const comuna = getComunaByDistritoId(district.id);
  const medidoresPct = (district.medidoresActivos / district.medidoresTotal) * 100;

  return (
    // key on outer wrapper so React re-mounts on district change → triggers CSS transition
    <div
      key={district.id}
      className="glass-card rounded-xl border border-outline-variant overflow-hidden"
      style={{
        animation: 'panelSlideIn 0.28s ease-out both',
        borderLeft: `3px solid ${comuna?.color ?? 'transparent'}`,
      }}
    >
      {/* Commune color accent strip */}
      {comuna && (
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${comuna.color} 0%, ${comuna.color}30 100%)`,
          }}
        />
      )}

      <div className="p-5 overflow-y-auto max-h-[580px]">
        {/* Header */}
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

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: 'Consumo',     v: `${district.consumoM3} m³/s`,              c: district.consumoM3 > 450 ? '#ef4444' : '#60a5fa' },
            { l: 'Presión',     v: `${district.presionPSI} PSI`,               c: '#22d3ee' },
            { l: 'Población',   v: district.poblacion.toLocaleString('es-BO'), c: '#34d399' },
            { l: 'Cobertura',   v: `${district.cobertura}%`,                   c: '#a78bfa' },
            { l: 'Calidad ICA', v: `${district.calidadICA}/100`,              c: district.calidadICA >= 80 ? '#34d399' : district.calidadICA >= 70 ? '#f59e0b' : '#ef4444' },
            { l: 'Temperatura', v: `${district.temperatura}°C`,               c: '#f87171' },
          ].map(({ l, v, c }) => (
            <div
              key={l}
              className="relative rounded-lg p-2.5 overflow-hidden"
              style={{ background: `${c}09`, border: `1px solid ${c}25` }}
            >
              {/* Accent left bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
                style={{ background: `${c}cc` }}
              />
              <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wide mb-1.5 pl-1.5 opacity-70">{l}</p>
              <p className="text-sm font-bold font-mono pl-1.5" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Medidores progress */}
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
                width: `${medidoresPct}%`,
                background: medidoresPct >= 95
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : medidoresPct >= 88
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}
            />
          </div>
          <p className="text-[9px] text-on-surface-variant mt-1 text-right opacity-60">{medidoresPct.toFixed(1)}%</p>
        </div>

        {/* ONU alert */}
        {district.consumoM3 > 450 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-error-container/20 border border-error/25 text-xs font-bold text-error flex items-center gap-2">
            <span>⚠</span>
            <span>Consumo excesivo — umbral ONU (&gt;45 m³/conexión/mes)</span>
          </div>
        )}

        {/* Zone list */}
        {territoryBoundary && <ZoneList zonas={territoryBoundary.zonas} comunaColor={comuna?.color} />}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function HydraulicDashboard() {
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<MapMetric>('consumo');

  const district = DISTRITOS.find(d => d.id === sel) ?? null;
  const totalConsumo = DISTRITOS.reduce((s, d) => s + d.consumoM3, 0);
  const alertas = DISTRITOS.filter(d => d.status === 'critico').length;

  const handleSelect = useCallback((id: number | null) => {
    if (id === null) { setSel(null); return; }
    setLoading(true);
    setSel(id);
    setTimeout(() => setLoading(false), 280);
  }, []);

  const KPIs = [
    { label:'Población Beneficiaria', value:'678,740',         icon:Users,         color:'#3b82f6' },
    { label:'Consumo Total Ciudad',   value:`${totalConsumo} m³/s`, icon:Droplets, color:'#06b6d4' },
    { label:'Medidores Activos',      value:'119,600',         icon:Activity,      color:'#10b981' },
    { label:'Alertas Críticas',       value:String(alertas),   icon:AlertTriangle, color:'#ef4444' },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Alcaldía de Cochabamba · SEMAPA</span>
          <h2 className="text-2xl font-bold text-on-surface mt-0.5">Dashboard de Inteligencia Hídrica</h2>
          <p className="text-sm text-on-surface-variant">
            6 Comunas · 15 Distritos · 120,000 Medidores IoT
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold hover:brightness-110 transition-all">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPIs.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5 rounded-xl border border-outline-variant">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <TrendingUp className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-on-surface">{value}</p>
          </div>
        ))}
      </section>

      {/* Mapa + Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
            <CochabambaMap
              distritos={DISTRITOS}
              selectedDistritoId={sel}
              onSelectDistrito={handleSelect}
              metric={metric}
              className="h-full"
            />
          </div>
        </div>

        {/* Panel lateral */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <DistrictDetailPanel
            district={district}
            loading={loading}
          />

          {/* Mini ranking consumo */}
          <div className="glass-card rounded-xl p-5 border border-outline-variant">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">Ranking Consumo</p>
            <div className="space-y-2">
              {[...DISTRITOS].sort((a, b) => b.consumoM3 - a.consumoM3).slice(0, 5).map(d => (
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
                        width:`${(d.consumoM3/520)*100}%`,
                        background: d.id===sel?'#3b82f6':STATUS_CFG[d.status].color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono text-on-surface w-16 text-right">{d.consumoM3} m³/s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leyenda de comunas */}
      <section className="glass-card rounded-xl p-4 border border-outline-variant">
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
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5 border border-outline-variant">
          <h3 className="text-sm font-bold text-on-surface mb-1">Correlación Temperatura vs Consumo</h3>
          <p className="text-xs text-on-surface-variant mb-4">Serie histórica anual</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={HISTORICO_CIUDAD} margin={{ top:5, right:10, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="mes" tick={{ fill:'#4b5875', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fill:'#4b5875', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill:'#4b5875', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTip />} />
              <Legend formatter={v => <span style={{ color:'#94a3b8', fontSize:11 }}>{v}</span>} />
              <Line yAxisId="l" type="monotone" dataKey="consumoM3"   name="Consumo (m³)" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="temperatura" name="Temp (°C)"    stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card rounded-xl p-5 border border-outline-variant">
          <h3 className="text-sm font-bold text-on-surface mb-1">Contaminación ICA vs Consumo</h3>
          <p className="text-xs text-on-surface-variant mb-4">Correlación mensual</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={HISTORICO_CIUDAD} margin={{ top:5, right:10, left:-10, bottom:0 }}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="mes" tick={{ fill:'#4b5875', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#4b5875', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTip />} />
              <Legend formatter={v => <span style={{ color:'#94a3b8', fontSize:11 }}>{v}</span>} />
              <Area type="monotone" dataKey="consumoM3"    name="Consumo (m³)"  stroke="#06b6d4" fill="url(#gA)" strokeWidth={2} />
              <Area type="monotone" dataKey="contaminacion" name="ICA Contam."   stroke="#ef4444" fill="url(#gB)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Tabla 15 distritos */}
      <section className="glass-card rounded-xl overflow-hidden border border-outline-variant mb-8">
        <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">Desglose Operativo — 15 Distritos</h3>
          <span className="text-[10px] text-on-surface-variant">Cassandra: SELECT … WHERE distrito_id=?</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low/50">
              <tr>{['Distrito','Comuna','Consumo','Presión','Población','Cobertura','ICA','Estado'].map(h=><th key={h} className="px-5 py-4">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {DISTRITOS.map(d => {
                const st = STATUS_CFG[d.status];
                const c = getComunaByDistritoId(d.id);
                return (
                  <tr key={d.id} className={cn('hover:bg-surface-container transition-colors cursor-pointer', sel===d.id?'bg-primary/5':'')}
                    onClick={() => handleSelect(d.id)}>
                    <td className="px-5 py-3 font-bold text-sm text-primary">{d.name}</td>
                    <td className="px-5 py-3 text-xs">
                      {c && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background:`${c.color}22`, color: c.color }}>
                          {c.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-sm font-bold font-mono', d.consumoM3>450?'text-error':'text-on-surface')}>{d.consumoM3}</span>
                      {d.consumoM3>450&&<span className="ml-2 text-[9px] font-bold bg-error-container/20 text-error px-1.5 py-0.5 rounded">ONU</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant font-mono">{d.presionPSI}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{d.poblacion.toLocaleString('es-BO')}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width:`${d.cobertura}%` }} />
                        </div>
                        <span className="text-xs font-bold text-on-surface">{d.cobertura}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-bold text-sm" style={{ color: d.calidadICA>=80?'#34d399':d.calidadICA>=70?'#f59e0b':'#ef4444' }}>{d.calidadICA}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background:st.bg, color:st.color }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
