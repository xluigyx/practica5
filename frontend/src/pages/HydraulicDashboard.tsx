import React, { useState, useEffect, useCallback } from 'react';
import MapaCochabambaV2Section from '@/src/features/mapa-cochabamba-v2/MapaCochabambaV2Section';
import MapaCalorSection from '@/src/features/mapa-cochabamba-v2/MapaCalorSection';
import { Users, Droplets, Activity, AlertTriangle, TrendingUp, Download, Wrench, RefreshCw, Sparkles, BarChart2, Database } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/src/lib/utils';
import type { DistritoMetrics, StatusDistrito } from '@/src/lib/types';
import { api } from '@/src/lib/api';
import type { DistritoRaw, EstadoMedidorRaw, Consulta3Row, Consulta18Row } from '@/src/lib/api';

const STATUS_CFG: Record<StatusDistrito, { color: string; bg: string; label: string }> = {
  'normal':        { color:'#059669', bg:'rgba(5,150,105,0.10)',   label:'Normal' },
  'alta-demanda':  { color:'#d97706', bg:'rgba(217,119,6,0.10)',   label:'Alta Demanda' },
  'critico':       { color:'#dc2626', bg:'rgba(220,38,38,0.10)',   label:'Crítico' },
  'mantenimiento': { color:'#7c3aed', bg:'rgba(124,58,237,0.10)', label:'Mantenimiento' },
};

const VALID_STATUS: StatusDistrito[] = ['normal', 'alta-demanda', 'critico', 'mantenimiento'];
function toStatus(s: string | null, fallback: StatusDistrito): StatusDistrito {
  return (s && VALID_STATUS.includes(s as StatusDistrito)) ? s as StatusDistrito : fallback;
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
    status:           toStatus(raw.status, 'normal'),
  } as DistritoMetrics;
}

// ── Mapa burbuja de calor ─────────────────────────────────────────────────────
function HeatmapSVG({ selected, onSelect, distritos }: {
  selected: number | null;
  onSelect: (id: number) => void;
  distritos: DistritoMetrics[];
}) {
  if (distritos.length === 0) return (
    <svg viewBox="0 0 400 320" className="w-full h-full">
      <rect width="400" height="320" fill="#080c14" rx="8"/>
      <text x="200" y="160" textAnchor="middle" dominantBaseline="middle" fill="#4b5875" fontSize="14">
        Sin datos — tabla distritos vacía en Cassandra
      </text>
    </svg>
  );
  const cMax = Math.max(...distritos.map(d => d.consumoM3));
  const cMin = Math.min(...distritos.map(d => d.consumoM3));
  const heat = (c: number) => {
    const t = cMax === cMin ? 0 : (c - cMin) / (cMax - cMin);
    return t > 0.75 ? '#ef4444' : t > 0.5 ? '#f59e0b' : t > 0.25 ? '#06b6d4' : '#10b981';
  };
  return (
    <svg viewBox="0 0 400 320" className="w-full h-full">
      <defs>
        <radialGradient id="hm-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0d1f3c"/><stop offset="100%" stopColor="#080c14"/>
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="400" height="320" fill="url(#hm-bg)" rx="8"/>
      {[60,120,180,240,300].map(y => <line key={y} x1="10" y1={y} x2="390" y2={y} stroke="#1e2d45" strokeWidth="0.5"/>)}
      {[50,100,150,200,250,300,350].map(x => <line key={x} x1={x} y1="10" x2={x} y2="310" stroke="#1e2d45" strokeWidth="0.5"/>)}
      {distritos.map((d, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 55 + col * 90, y = 55 + row * 70;
        const c = heat(d.consumoM3);
        const range = cMax - cMin || 1;
        const r = 12 + ((d.consumoM3 - cMin) / range) * 14;
        const isSel = selected === d.id;
        return (
          <g key={d.id} onClick={() => onSelect(d.id)} style={{ cursor:'pointer' }}>
            <circle cx={x} cy={y} r={r+8} fill={c} opacity={0.07}/>
            <circle cx={x} cy={y} r={r}   fill={c} opacity={isSel ? 0.9 : 0.65} filter="url(#glow)"
              stroke={isSel ? '#fff' : 'transparent'} strokeWidth={isSel ? 2 : 0}/>
            <text x={x} y={y+1} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize:8, fill:'#fff', fontWeight:700, pointerEvents:'none' }}>D{d.id}</text>
            {d.consumoM3 > 450 && <circle cx={x+r-2} cy={y-r+2} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1}/>}
          </g>
        );
      })}
      <g transform="translate(10,290)">
        {[{c:'#10b981',l:'<25%'},{c:'#06b6d4',l:'25-50%'},{c:'#f59e0b',l:'50-75%'},{c:'#ef4444',l:'>75%'}].map(({c,l},i)=>(
          <g key={i} transform={`translate(${i*95},0)`}>
            <circle cx="5" cy="5" r="4" fill={c} opacity="0.85"/>
            <text x="13" y="9" style={{fontSize:9,fill:'#94a3b8',fontWeight:600}}>{l} consumo</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ── Tooltip oscuro ────────────────────────────────────────────────────────────
const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 shadow-xl text-xs border border-outline-variant/50">
      <p className="font-bold text-on-surface-variant mb-2 text-[10px] uppercase tracking-wide">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color:p.color }} className="font-semibold mt-0.5">
          {p.name}: <span className="text-on-surface">{typeof p.value === 'number' ? fmt2(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Consultas analíticas ──────────────────────────────────────────────────────
function ConsultasAnalíticasSection() {
  const [q18, setQ18] = useState<{ year: string; demanda_m3: number }[]>([]);
  const [q3, setQ3]   = useState<Consulta3Row[]>([]);
  const [q3total, setQ3total] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    Promise.all([api.consulta18(), api.consulta3(15)])
      .then(([res18, res3]) => {
        const years = ['2025','2026','2027','2028','2029'];
        const cityProjection = years.map(year => ({
          year,
          demanda_m3: res18.data.reduce((s, row) => s + ((row[`${year}_m3`] as number) || 0), 0),
        }));
        setQ18(cityProjection);
        setQ3(res3.data);
        setQ3total(res3.total);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return (
    <section className="glass-card rounded-2xl p-8 flex items-center justify-center border border-outline-variant">
      <div className="flex items-center gap-3 text-on-surface-variant">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"/>
        <span className="text-sm">Ejecutando consultas analíticas en Cassandra…</span>
      </div>
    </section>
  );

  if (error) return (
    <section className="glass-card rounded-2xl p-6 border border-red-200/50 bg-red-50/30">
      <p className="text-sm text-error font-bold">Error al ejecutar consultas — verifica conexión con Cassandra</p>
    </section>
  );

  return (
    <section className="space-y-5">
      <div className="section-title">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary"/>
            <h3 className="text-base font-bold text-on-surface">Consultas Analíticas</h3>
            <span className="text-[10px] font-bold chip-blue px-2.5 py-0.5 rounded-full">
              Consulta 3 · Consulta 18
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5 ml-6">Cassandra · Cálculos en tiempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-outline-variant">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Consulta 18</p>
          <h4 className="text-sm font-bold text-on-surface mb-0.5">Proyección de Demanda Hídrica 2025–2029</h4>
          <p className="text-xs text-on-surface-variant mb-4">Crecimiento 2.6%/año · Suma total ciudad</p>
          {q18.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-on-surface-variant text-sm">
              Sin lecturas en Cassandra para proyectar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={q18} margin={{top:5,right:10,left:10,bottom:0}}>
                <defs>
                  <linearGradient id="gDem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
                <XAxis dataKey="year" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}K`} tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<DarkTip/>}/>
                <Area type="monotone" dataKey="demanda_m3" name="Demanda ciudad (m³)" stroke="#3b82f6" fill="url(#gDem)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden border border-outline-variant flex flex-col">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between"
               style={{ background:'linear-gradient(180deg,rgba(237,241,255,0.7) 0%,rgba(255,255,255,0) 100%)' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Consulta 3</p>
              <h4 className="text-sm font-bold text-on-surface">Contratos con Consumo Excesivo &gt;45 m³</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">Parámetro ONU · Categoría Residencial</p>
            </div>
            {q3total > 0 && (
              <span className="text-[10px] font-bold chip-red px-2.5 py-1 rounded-xl">
                {q3total.toLocaleString()} contratos
              </span>
            )}
          </div>
          {q3.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm p-8">
              Sin contratos con consumo excesivo en el período activo
            </div>
          ) : (
            <div className="overflow-auto flex-1" style={{maxHeight:260}}>
              <table className="w-full text-left text-xs data-table">
                <thead>
                  <tr>
                    <th>Contrato</th><th>Tarifa</th>
                    <th className="text-right">Consumo m³</th>
                    <th className="text-right">Exceso %</th>
                  </tr>
                </thead>
                <tbody>
                  {q3.map((r,i) => (
                    <tr key={i}>
                      <td className="px-5 py-2.5 font-mono font-bold text-primary">{r.contrato}</td>
                      <td className="px-5 py-2.5 text-on-surface-variant">{r.tarifa}</td>
                      <td className="px-5 py-2.5 font-mono font-bold text-red-500 text-right">{fmt2(r.consumo_m3)}</td>
                      <td className="px-5 py-2.5 font-bold text-right" style={{color:r.exceso_pct>50?'#dc2626':'#d97706'}}>
                        +{fmt2(r.exceso_pct)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Dashboard principal ────────────────────────────────────────────────────────
export default function HydraulicDashboard() {
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'loading'|'ready'|'empty'|'error'>('loading');

  const [distritos, setDistritos]   = useState<DistritoMetrics[]>([]);
  const [medActivos, setMedActivos] = useState(0);
  const [medFuera, setMedFuera]     = useState(0);
  const [estados, setEstados]       = useState<EstadoMedidorRaw[]>([]);

  useEffect(() => {
    Promise.all([api.distritos(), api.medActivos(), api.medFuera()])
      .then(([apiDist, activos, fuera]) => {
        if (apiDist.length > 0) {
          const mapped = apiDist.map(rawToDistrito);
          setDistritos(mapped);
          setSel(mapped[0]?.id ?? null);
          setApiStatus('ready');
        } else {
          setApiStatus('empty');
        }
        setMedActivos(activos.total);
        setMedFuera(fuera.total);
      })
      .catch(() => setApiStatus('error'));
    api.medEstados().then(res => setEstados(res.data)).catch(() => {});
  }, []);

  const district = distritos.find(d => d.id === sel) ?? null;
  const totalConsumo   = distritos.reduce((s,d) => s + d.consumoM3, 0);
  const totalPoblacion = distritos.reduce((s,d) => s + d.poblacion, 0);
  const alertasCriticas = distritos.filter(d => d.status === 'critico').length;

  const handleSelect = useCallback((id: number) => {
    setLoading(true); setSel(id); setTimeout(() => setLoading(false), 300);
  }, []);

  const distChartData = distritos.map(d => ({
    name:`D${d.id}`, 'Consumo m³':d.consumoM3, 'Temp °C':d.temperatura, 'ICA':d.calidadICA,
  }));

  const KPIs = [
    { label:'Población Beneficiaria', value: apiStatus==='ready' ? totalPoblacion.toLocaleString() : '—', icon:Users,         color:'#3b82f6' },
    { label:'Consumo Total Ciudad',   value: apiStatus==='ready' ? `${fmt2(totalConsumo)} m³/s` : '—', icon:Droplets, color:'#06b6d4' },
    { label:'Medidores Activos',      value: medActivos > 0 ? medActivos.toLocaleString() : '—', icon:Activity,    color:'#10b981' },
    { label:'Alertas Críticas',       value: apiStatus==='ready' ? String(alertasCriticas) : '—', icon:AlertTriangle, color:'#ef4444' },
  ];

  const dbBadge =
    apiStatus==='ready'   ? { cls:'chip-teal',   dot:'bg-secondary animate-pulse', txt:'● Cassandra Online' } :
    apiStatus==='empty'   ? { cls:'chip-amber',  dot:'bg-amber-400',               txt:'● Sin datos en BD' } :
    apiStatus==='error'   ? { cls:'chip-red',    dot:'bg-error',                   txt:'● Error de conexión' } :
                            { cls:'',            dot:'bg-outline-variant animate-ping', txt:'● Cargando…' };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">

      {/* ── Hero banner ─── */}
      <div className="dash-banner p-6">
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
              Alcaldía de Cochabamba · GAMC
            </p>
            <h2 className="text-3xl font-extrabold text-on-surface leading-tight">
              Dashboard de Inteligencia Hídrica
            </h2>
            <p className="text-sm text-on-surface-variant mt-1.5">
              {distritos.length} Distritos · {(medActivos+medFuera)>0?(medActivos+medFuera).toLocaleString():'—'} Medidores IoT
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={cn('text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5', dbBadge.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', dbBadge.dot)}/>{dbBadge.txt}
            </span>
            <button className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-md shadow-primary/20">
              <Download className="w-4 h-4"/> Exportar
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPIs.map(({label,value,icon:Icon,color},i) => (
          <div key={label} className="stat-card rounded-2xl p-5" style={{ animationDelay:`${i*60}ms` }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background:`linear-gradient(90deg,${color},${color}50)` }}/>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${color}12`,border:`1px solid ${color}22`}}>
                <Icon className="w-5 h-5" style={{color}}/>
              </div>
              <TrendingUp className="w-4 h-4 text-outline-variant opacity-60"/>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-extrabold text-on-surface">{value}</p>
          </div>
        ))}
      </section>

      {/* ── Medidores por estado ─── */}
      {estados.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {([
            { estado:'Operativo',       icon:Activity,      color:'#10b981' },
            { estado:'Dañado',          icon:AlertTriangle, color:'#ef4444' },
            { estado:'Mantenimiento',   icon:Wrench,        color:'#f59e0b' },
            { estado:'Reacondicionado', icon:RefreshCw,     color:'#06b6d4' },
            { estado:'Nuevo',           icon:Sparkles,      color:'#3b82f6' },
          ] as const).map(({estado,icon:Icon,color}) => {
            const row = estados.find((e:EstadoMedidorRaw) => e.estado === estado);
            return (
              <div key={estado} className="stat-card rounded-2xl p-4">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:`linear-gradient(90deg,${color},${color}40)`}}/>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:`${color}12`,border:`1px solid ${color}22`}}>
                    <Icon className="w-4 h-4" style={{color}}/>
                  </div>
                </div>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Medidores {estado}</p>
                <p className="text-xl font-extrabold text-on-surface">{row ? row.count.toLocaleString() : '—'}</p>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Mapa de calor burbuja + Panel de detalle ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-card rounded-2xl overflow-hidden border border-outline-variant">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between"
               style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
            <div>
              <div className="section-title mb-0.5">
                <h3 className="text-sm font-bold text-on-surface">Mapa de Calor — Consumo por Distrito</h3>
              </div>
              <p className="text-xs text-on-surface-variant ml-3.5">Haz clic en un nodo para ver detalles</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(STATUS_CFG) as [StatusDistrito, typeof STATUS_CFG[StatusDistrito]][]).map(([k,v]) => (
                <span key={k} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{background:v.bg,color:v.color}}>{v.label}</span>
              ))}
            </div>
          </div>
          <div className="h-[340px] p-2">
            <HeatmapSVG selected={sel} onSelect={handleSelect} distritos={distritos}/>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          {loading ? (
            <div className="glass-card rounded-2xl p-8 flex items-center justify-center border border-outline-variant flex-1">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"/>
                <p className="text-xs text-on-surface-variant">Consultando Cassandra…</p>
              </div>
            </div>
          ) : district ? (
            <>
              <div className="glass-card rounded-2xl p-5 border border-outline-variant">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{district.subalcaldia}</p>
                    <h3 className="text-lg font-bold text-on-surface mt-0.5">{district.name}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{background:STATUS_CFG[district.status].bg,color:STATUS_CFG[district.status].color}}>
                    {STATUS_CFG[district.status].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {l:'Consumo',    v:`${fmt2(district.consumoM3)} m³/s`,  c:district.consumoM3>450?'#ef4444':'#60a5fa'},
                    {l:'Presión',    v:`${fmt2(district.presionPSI)} PSI`,   c:'#22d3ee'},
                    {l:'Población',  v:district.poblacion.toLocaleString(), c:'#34d399'},
                    {l:'Cobertura',  v:`${fmt2(district.cobertura)}%`,       c:'#a78bfa'},
                    {l:'Calidad ICA',v:`${district.calidadICA}/100`,   c:district.calidadICA>=80?'#34d399':'#f59e0b'},
                    {l:'Temperatura',v:`${fmt2(district.temperatura)}°C`,    c:'#f87171'},
                  ].map(({l,v,c}) => (
                    <div key={l} className="relative rounded-xl p-3 overflow-hidden" style={{background:`${c}08`,border:`1px solid ${c}20`}}>
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{background:`${c}aa`}}/>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-1 pl-1.5 tracking-wide">{l}</p>
                      <p className="text-sm font-bold font-mono pl-1.5" style={{color:c}}>{v}</p>
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
                      style={{width:`${district.medidoresTotal>0?(district.medidoresActivos/district.medidoresTotal)*100:0}%`}}/>
                  </div>
                </div>
                {district.consumoM3 > 450 && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-red-50/80 border border-red-200/60 text-xs font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5"/> Consumo excesivo — umbral ONU (&gt;45 m³/conexión/mes)
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl p-5 border border-outline-variant">
                <div className="section-title mb-3">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ranking Consumo</p>
                </div>
                <div className="space-y-2">
                  {[...distritos].sort((a,b)=>b.consumoM3-a.consumoM3).slice(0,5).map((d,i) => {
                    const maxC = distritos.length ? Math.max(...distritos.map(x=>x.consumoM3)) : 1;
                    return (
                      <div key={d.id} className="flex items-center gap-2 cursor-pointer group" onClick={()=>handleSelect(d.id)}>
                        <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0',
                          i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'text-on-surface-variant')}
                          style={i>2?{background:'rgba(0,52,111,0.08)'}:{}}>
                          {i+1}
                        </span>
                        <span className="text-[10px] font-bold w-6 text-on-surface-variant">D{d.id}</span>
                        <div className="flex-1 bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500 group-hover:opacity-90"
                            style={{width:`${maxC>0?(d.consumoM3/maxC)*100:0}%`,background:d.id===sel?'#3b82f6':STATUS_CFG[d.status].color}}/>
                        </div>
                        <span className="text-xs font-bold font-mono text-on-surface w-16 text-right">{fmt2(d.consumoM3)} m³/s</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card rounded-2xl p-8 flex items-center justify-center border border-outline-variant">
              {apiStatus==='loading' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"/>
                  <p className="text-xs text-on-surface-variant">Cargando distritos…</p>
                </div>
              ) : apiStatus==='empty' ? (
                <p className="text-sm text-on-surface-variant">Base de datos vacía — ejecuta el seeder</p>
              ) : apiStatus==='error' ? (
                <p className="text-sm text-error">No se pudo conectar con la API</p>
              ) : (
                <p className="text-sm text-on-surface-variant">Selecciona un distrito</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Gráficas correlación ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-outline-variant">
          <div className="section-title mb-1">
            <h3 className="text-sm font-bold text-on-surface">Temperatura vs Consumo por Distrito</h3>
          </div>
          <p className="text-xs text-on-surface-variant mb-4 ml-3.5">Datos en tiempo real desde Cassandra</p>
          {distChartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-on-surface-variant text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distChartData} margin={{top:5,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
                <XAxis dataKey="name" tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="l" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="r" orientation="right" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<DarkTip/>}/>
                <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                <Bar yAxisId="l" dataKey="Consumo m³" fill="#3b82f6" opacity={0.85} radius={[3,3,0,0]}/>
                <Bar yAxisId="r" dataKey="Temp °C"    fill="#f59e0b" opacity={0.75} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 border border-outline-variant">
          <div className="section-title mb-1">
            <h3 className="text-sm font-bold text-on-surface">Calidad ICA vs Consumo por Distrito</h3>
          </div>
          <p className="text-xs text-on-surface-variant mb-4 ml-3.5">Índice de Calidad del Agua · Cassandra</p>
          {distChartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-on-surface-variant text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distChartData} margin={{top:5,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
                <XAxis dataKey="name" tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="l" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="r" orientation="right" domain={[0,100]} tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<DarkTip/>}/>
                <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                <Bar yAxisId="l" dataKey="Consumo m³" fill="#06b6d4" opacity={0.85} radius={[3,3,0,0]}/>
                <Bar yAxisId="r" dataKey="ICA"         fill="#10b981" opacity={0.75} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Mapa de Calor SVG ─── */}
      <MapaCalorSection/>

      {/* ── Mapa Interactivo V2 ─── */}
      <MapaCochabambaV2Section/>

      {/* ── Consultas Analíticas ─── */}
      <ConsultasAnalíticasSection/>

      {/* ── Tabla 15 distritos ─── */}
      <section className="glass-card rounded-2xl overflow-hidden border border-outline-variant mb-8">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between"
             style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
          <div className="section-title mb-0">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Desglose Operativo — {distritos.length} Distritos</h3>
              <p className="text-[10px] text-on-surface-variant ml-3.5 mt-0.5">Cassandra: SELECT … FROM distritos</p>
            </div>
          </div>
          <Database className="w-4 h-4 text-outline-variant"/>
        </div>
        {distritos.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            {apiStatus==='loading' ? 'Cargando…' : apiStatus==='empty' ? 'Tabla distritos vacía — ejecuta el seeder' : 'Error de conexión con Cassandra'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left data-table">
              <thead>
                <tr>{['Distrito','Subalcaldía','Consumo','Presión','Población','Cobertura','ICA','Estado'].map(h=><th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {distritos.map(d => {
                  const st = STATUS_CFG[d.status];
                  return (
                    <tr key={d.id} className={cn('cursor-pointer', sel===d.id?'bg-primary/[0.04]':'')} onClick={()=>handleSelect(d.id)}>
                      <td className="px-5 py-3 font-bold text-sm text-primary">{d.name}</td>
                      <td className="px-5 py-3 text-sm text-on-surface-variant">{d.subalcaldia}</td>
                      <td className="px-5 py-3">
                        <span className={cn('text-sm font-bold font-mono',d.consumoM3>450?'text-error':'text-on-surface')}>{fmt2(d.consumoM3)}</span>
                        {d.consumoM3>450&&<span className="ml-2 text-[9px] font-bold chip-red px-1.5 py-0.5 rounded-full">ONU</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-on-surface-variant font-mono">{fmt2(d.presionPSI)}</td>
                      <td className="px-5 py-3 text-sm text-on-surface-variant">{d.poblacion.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-surface-container h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{width:`${d.cobertura}%`}}/>
                          </div>
                          <span className="text-xs font-bold text-on-surface">{fmt2(d.cobertura)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-bold text-sm" style={{color:d.calidadICA>=80?'#059669':d.calidadICA>=70?'#d97706':'#dc2626'}}>{d.calidadICA}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{background:st.bg,color:st.color}}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
