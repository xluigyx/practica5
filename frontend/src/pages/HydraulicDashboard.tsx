import React, { useState, useCallback } from 'react';
import { Users, Droplets, Activity, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/src/lib/utils';
import { DISTRITOS, HISTORICO_CIUDAD } from '@/src/lib/semapa-data';
import type { DistritoMetrics, StatusDistrito } from '@/src/lib/types';

const STATUS_CFG: Record<StatusDistrito, { color: string; bg: string; label: string }> = {
  'normal':        { color:'#10b981', bg:'rgba(16,185,129,0.12)', label:'Normal' },
  'alta-demanda':  { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'Alta Demanda' },
  'critico':       { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  label:'Crítico' },
  'mantenimiento': { color:'#8b5cf6', bg:'rgba(139,92,246,0.12)',label:'Mantenimiento' },
};

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

// SVG Heatmap con datos reales de los 14 distritos
function HeatmapSVG({ selected, onSelect }: { selected: number | null; onSelect: (id: number) => void }) {
  const lats = DISTRITOS.map(d => d.id * 3 + 50);
  const lngs = DISTRITOS.map(d => d.id * 25 + 20);
  const cMax = Math.max(...DISTRITOS.map(d => d.consumoM3));
  const cMin = Math.min(...DISTRITOS.map(d => d.consumoM3));
  const heat = (c: number) => {
    const t = (c - cMin) / (cMax - cMin);
    return t > 0.75 ? '#ef4444' : t > 0.5 ? '#f59e0b' : t > 0.25 ? '#06b6d4' : '#10b981';
  };

  return (
    <svg viewBox="0 0 400 320" className="w-full h-full">
      <defs>
        <radialGradient id="hm-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0d1f3c" /><stop offset="100%" stopColor="#080c14" />
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="400" height="320" fill="url(#hm-bg)" rx="8" />
      {[60,120,180,240,300].map(y => <line key={y} x1="10" y1={y} x2="390" y2={y} stroke="#1e2d45" strokeWidth="0.5"/>)}
      {[50,100,150,200,250,300,350].map(x => <line key={x} x1={x} y1="10" x2={x} y2="310" stroke="#1e2d45" strokeWidth="0.5"/>)}

      {DISTRITOS.map((d, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 55 + col * 90, y = 55 + row * 70;
        const c = heat(d.consumoM3);
        const r = 12 + ((d.consumoM3 - cMin) / (cMax - cMin)) * 14;
        const isSel = selected === d.id;
        return (
          <g key={d.id} onClick={() => onSelect(d.id)} style={{ cursor: 'pointer' }}>
            <circle cx={x} cy={y} r={r + 8} fill={c} opacity={0.08} />
            <circle cx={x} cy={y} r={r} fill={c} opacity={isSel ? 0.9 : 0.65} filter="url(#glow)"
              stroke={isSel ? '#fff' : 'transparent'} strokeWidth={isSel ? 2 : 0} />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 8, fill: '#fff', fontWeight: 700, pointerEvents: 'none' }}>
              D{d.id}
            </text>
            {d.consumoM3 > 450 && (
              <circle cx={x + r - 2} cy={y - r + 2} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1} />
            )}
          </g>
        );
      })}

      {/* Leyenda */}
      <g transform="translate(10,290)">
        {[{ c:'#10b981',l:'<250' },{ c:'#06b6d4',l:'250-350' },{ c:'#f59e0b',l:'350-450' },{ c:'#ef4444',l:'>450' }].map(({c,l},i)=>(
          <g key={i} transform={`translate(${i*95},0)`}>
            <circle cx="5" cy="5" r="4" fill={c} opacity="0.85"/>
            <text x="13" y="9" style={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}>{l} m³/s</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function HydraulicDashboard() {
  const [sel, setSel] = useState<number | null>(10);
  const [loading, setLoading] = useState(false);
  const district = DISTRITOS.find(d => d.id === sel) ?? null;
  const totalConsumo = DISTRITOS.reduce((s, d) => s + d.consumoM3, 0);

  const handleSelect = useCallback((id: number) => {
    setLoading(true);
    setSel(id);
    setTimeout(() => setLoading(false), 300); // simula latencia Cassandra
  }, []);

  const KPIs = [
    { label:'Población Beneficiaria', value:'650,240', icon:Users,         color:'#3b82f6' },
    { label:'Consumo Total Ciudad',   value:`${totalConsumo} m³/s`, icon:Droplets, color:'#06b6d4' },
    { label:'Medidores Activos',      value:'115,800', icon:Activity,      color:'#10b981' },
    { label:'Alertas Críticas',       value:'2',       icon:AlertTriangle, color:'#ef4444' },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Alcaldía de Cochabamba</span>
          <h2 className="text-2xl font-bold text-on-surface mt-0.5">Dashboard de Inteligencia Hídrica</h2>
          <p className="text-sm text-on-surface-variant">14 Distritos · 56 Zonas · 120,000 Medidores IoT</p>
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

      {/* Mapa + Detalle */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-card rounded-xl overflow-hidden border border-outline-variant">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Mapa de Calor — Consumo por Distrito</h3>
              <p className="text-xs text-on-surface-variant">Haz clic en un nodo para ver detalles</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(STATUS_CFG) as [StatusDistrito, typeof STATUS_CFG[StatusDistrito]][]).map(([k, v]) => (
                <span key={k} className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: v.bg, color: v.color }}>{v.label}</span>
              ))}
            </div>
          </div>
          <div className="h-[340px] p-2">
            <HeatmapSVG selected={sel} onSelect={handleSelect} />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          {loading ? (
            <div className="glass-card rounded-xl p-8 flex items-center justify-center border border-outline-variant flex-1">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs text-on-surface-variant">Consultando Cassandra...</p>
              </div>
            </div>
          ) : district ? (
            <>
              <div className="glass-card rounded-xl p-5 border border-outline-variant">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{district.subalcaldia}</p>
                    <h3 className="text-lg font-bold text-on-surface">{district.name}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: STATUS_CFG[district.status].bg, color: STATUS_CFG[district.status].color }}>
                    {STATUS_CFG[district.status].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l:'Consumo', v:`${district.consumoM3} m³/s`, c: district.consumoM3>450?'#ef4444':'#60a5fa' },
                    { l:'Presión', v:`${district.presionPSI} PSI`,  c:'#22d3ee' },
                    { l:'Población', v:district.poblacion.toLocaleString(), c:'#34d399' },
                    { l:'Cobertura', v:`${district.cobertura}%`, c:'#a78bfa' },
                    { l:'Calidad ICA', v:`${district.calidadICA}/100`, c: district.calidadICA>=80?'#34d399':'#f59e0b' },
                    { l:'Temperatura', v:`${district.temperatura}°C`, c:'#f87171' },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">{l}</p>
                      <p className="text-sm font-bold font-mono" style={{ color: c }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-on-surface-variant">Medidores activos</span>
                    <span className="font-bold text-on-surface">{district.medidoresActivos.toLocaleString()} / {district.medidoresTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${(district.medidoresActivos / district.medidoresTotal) * 100}%` }} />
                  </div>
                </div>
                {district.consumoM3 > 450 && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-error-container/20 border border-error/20 text-xs font-bold text-error">
                    ⚠ Consumo excesivo detectado — parámetro ONU (&gt;45 m³/conexión/mes)
                  </div>
                )}
              </div>

              {/* Mini ranking */}
              <div className="glass-card rounded-xl p-5 border border-outline-variant">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">Ranking Consumo</p>
                <div className="space-y-2">
                  {[...DISTRITOS].sort((a, b) => b.consumoM3 - a.consumoM3).slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center gap-2 cursor-pointer" onClick={() => handleSelect(d.id)}>
                      <span className="text-[10px] font-bold w-7 text-on-surface-variant text-right">D{d.id}</span>
                      <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width:`${(d.consumoM3/520)*100}%`, background: d.id===sel?'#3b82f6':STATUS_CFG[d.status].color }} />
                      </div>
                      <span className="text-xs font-bold font-mono text-on-surface w-16 text-right">{d.consumoM3} m³/s</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl p-8 flex items-center justify-center border border-outline-variant">
              <p className="text-sm text-on-surface-variant">Selecciona un distrito</p>
            </div>
          )}
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

      {/* Tabla 14 distritos */}
      <section className="glass-card rounded-xl overflow-hidden border border-outline-variant mb-8">
        <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">Desglose Operativo — 14 Distritos</h3>
          <span className="text-[10px] text-on-surface-variant">Cassandra: SELECT … WHERE distrito_id=? AND periodo=?</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low/50">
              <tr>{['Distrito','Subalcaldía','Consumo','Presión','Población','Cobertura','ICA','Estado'].map(h=><th key={h} className="px-5 py-4">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {DISTRITOS.map(d => {
                const st = STATUS_CFG[d.status];
                return (
                  <tr key={d.id} className={cn('hover:bg-surface-container transition-colors cursor-pointer', sel===d.id?'bg-primary/5':'')}
                    onClick={() => handleSelect(d.id)}>
                    <td className="px-5 py-3 font-bold text-sm text-primary">{d.name}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{d.subalcaldia}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-sm font-bold font-mono', d.consumoM3>450?'text-error':'text-on-surface')}>{d.consumoM3}</span>
                      {d.consumoM3>450&&<span className="ml-2 text-[9px] font-bold bg-error-container/20 text-error px-1.5 py-0.5 rounded">ONU</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant font-mono">{d.presionPSI}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{d.poblacion.toLocaleString()}</td>
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
