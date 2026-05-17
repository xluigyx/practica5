import React, { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, Droplets, Activity, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { DISTRITOS_METRICS, CONSUMO_HISTORICO_CIUDAD, type DistritoMetrics } from '../lib/semapa-data';

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:8, padding:'10px 14px' }}>
      <p style={{ color:'#94a3b8', fontSize:11, fontWeight:700, marginBottom:6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color:p.color, fontSize:12, fontWeight:600, margin:'2px 0' }}>
          {p.name}: <span style={{ color:'#f0f6ff' }}>{p.value?.toLocaleString?.()}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Status config ────────────────────────────────────────────────────────────
const SC = {
  'normal':        { color:'#10b981', bg:'rgba(16,185,129,0.15)', label:'Normal' },
  'alta-demanda':  { color:'#f59e0b', bg:'rgba(245,158,11,0.15)', label:'Alta Demanda' },
  'critico':       { color:'#ef4444', bg:'rgba(239,68,68,0.15)',  label:'Crítico' },
  'mantenimiento': { color:'#8b5cf6', bg:'rgba(139,92,246,0.15)', label:'Mantenimiento' },
} as const;

// ─── Mapa SVG interactivo ─────────────────────────────────────────────────────
function CochabambaMap({ selected, onSelect }: { selected:number|null; onSelect:(id:number)=>void }) {
  const s = (v:number,iMin:number,iMax:number,oMin:number,oMax:number) => oMin + ((v-iMin)/(iMax-iMin))*(oMax-oMin);
  const lats = DISTRITOS_METRICS.map(d=>d.lat), lngs = DISTRITOS_METRICS.map(d=>d.lng);
  const latMin=Math.min(...lats),latMax=Math.max(...lats),lngMin=Math.min(...lngs),lngMax=Math.max(...lngs);
  const toXY = (d:DistritoMetrics) => ({ x:s(d.lng,lngMin,lngMax,30,370), y:s(d.lat,latMax,latMin,30,310) });
  const cMax=Math.max(...DISTRITOS_METRICS.map(d=>d.consumoM3));
  const cMin=Math.min(...DISTRITOS_METRICS.map(d=>d.consumoM3));
  const heatColor=(c:number)=>{ const t=(c-cMin)/(cMax-cMin); return t>0.75?'#ef4444':t>0.5?'#f59e0b':t>0.25?'#06b6d4':'#10b981'; };

  return (
    <svg viewBox="0 0 400 350" className="w-full h-full">
      <defs>
        <filter id="gn"><feGaussianBlur stdDeviation="3" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="bg-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0d1f3c"/><stop offset="100%" stopColor="#080c14"/>
        </radialGradient>
      </defs>
      <rect width="400" height="350" fill="url(#bg-g)" rx="12"/>
      {[50,100,150,200,250,300].map(y=><line key={y} x1="20" y1={y} x2="380" y2={y} stroke="#1e2d45" strokeWidth="0.5"/>)}
      {[60,120,180,240,300,360].map(x=><line key={x} x1={x} y1="20" x2={x} y2="330" stroke="#1e2d45" strokeWidth="0.5"/>)}
      {DISTRITOS_METRICS.map((d,i)=>DISTRITOS_METRICS.slice(i+1).map(d2=>{
        const p1=toXY(d),p2=toXY(d2),dist=Math.hypot(p1.x-p2.x,p1.y-p2.y);
        if(dist>80) return null;
        return <line key={`${d.id}-${d2.id}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#1e2d45" strokeWidth="1" opacity="0.6"/>;
      }))}
      {DISTRITOS_METRICS.map(d=>{
        const{x,y}=toXY(d),color=heatColor(d.consumoM3),r=s(d.consumoM3,cMin,cMax,10,22),isSel=selected===d.id;
        return (
          <g key={d.id} onClick={()=>onSelect(d.id)} style={{cursor:'pointer'}}>
            <circle cx={x} cy={y} r={r+6} fill={color} opacity="0.1"/>
            <circle cx={x} cy={y} r={r} fill={color} opacity={isSel?0.9:0.65} filter="url(#gn)"
              stroke={isSel?'#fff':'transparent'} strokeWidth={isSel?2:0}/>
            <text x={x} y={y+1} textAnchor="middle" dominantBaseline="middle"
              style={{fontSize:8,fontWeight:700,fill:'#fff',pointerEvents:'none'}}>D{d.id}</text>
          </g>
        );
      })}
      <g transform="translate(12,295)">
        {[{c:'#10b981',l:'<250'},{c:'#06b6d4',l:'250-350'},{c:'#f59e0b',l:'350-450'},{c:'#ef4444',l:'>450'}].map(({c,l},i)=>(
          <g key={i} transform={`translate(${i*90},0)`}>
            <circle cx="5" cy="5" r="4" fill={c} opacity="0.8"/>
            <text x="12" y="9" style={{fontSize:9,fill:'#94a3b8',fontWeight:600}}>{l} m³/s</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AlcaldiaDashboard() {
  const [sel, setSel] = useState<number|null>(10);
  const selected = DISTRITOS_METRICS.find(d=>d.id===sel)||null;
  const totalConsumo = DISTRITOS_METRICS.reduce((s,d)=>s+d.consumoM3,0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{color:'#3b82f6'}}>
            Alcaldía Municipal · Cochabamba
          </p>
          <h1 className="text-2xl font-bold text-white">Dashboard de Inteligencia Hídrica</h1>
          <p className="text-sm mt-0.5" style={{color:'#4b5875'}}>14 Distritos · 56 Zonas · 120,000 Medidores</p>
        </div>
        <div className="flex gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{background:'rgba(16,185,129,0.1)',color:'#34d399',border:'1px solid rgba(16,185,129,0.2)'}}>
            <span className="status-dot online"/> Tiempo Real
          </span>
          <button className="btn-primary flex items-center gap-2 text-xs">
            <Download className="w-3.5 h-3.5"/> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {icon:Users,         label:'Población Beneficiaria', value:'633,800',            color:'#3b82f6', delay:0},
          {icon:Droplets,      label:'Consumo Total Ciudad',   value:`${totalConsumo} m³/s`,color:'#06b6d4', delay:80},
          {icon:Activity,      label:'Medidores Activos',      value:'115,800',            color:'#10b981', delay:160},
          {icon:AlertTriangle, label:'Alertas Críticas',       value:'2',                  color:'#ef4444', delay:240},
        ].map(({icon:Icon,label,value,color,delay})=>(
          <div key={label} className="glass-card rounded-xl p-5 animate-slide-up" style={{animationDelay:`${delay}ms`}}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{background:`${color}18`,border:`1px solid ${color}30`}}>
                <Icon className="w-4 h-4" style={{color}}/>
              </div>
              <TrendingUp className="w-4 h-4" style={{color:'#10b981'}}/>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'#4b5875'}}>{label}</p>
            <p className="metric-value text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Map + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{borderColor:'#1e2d45'}}>
            <div>
              <h2 className="text-sm font-bold text-white">Mapa de Calor · Consumo por Distrito</h2>
              <p className="text-xs mt-0.5" style={{color:'#4b5875'}}>Clic en un nodo para ver detalles</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(SC) as [keyof typeof SC, typeof SC[keyof typeof SC]][]).map(([k,v])=>(
                <span key={k} className="text-[10px] font-bold px-2 py-1 rounded"
                  style={{background:v.bg,color:v.color}}>{v.label}</span>
              ))}
            </div>
          </div>
          <div className="p-2 h-[360px]">
            <CochabambaMap selected={sel} onSelect={setSel}/>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          {selected ? (
            <>
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'#4b5875'}}>{selected.subalcaldia}</p>
                    <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                  </div>
                  <span className="badge text-[10px]"
                    style={{background:SC[selected.status].bg,color:SC[selected.status].color,
                      border:`1px solid ${SC[selected.status].color}40`}}>
                    {SC[selected.status].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {l:'Consumo',   v:`${selected.consumoM3} m³/s`,              c:'#60a5fa'},
                    {l:'Presión',   v:`${selected.presionPSI} PSI`,              c:'#22d3ee'},
                    {l:'Población', v:selected.poblacion.toLocaleString(),       c:'#34d399'},
                    {l:'Cobertura', v:`${selected.cobertura}%`,                  c:'#a78bfa'},
                    {l:'Calidad ICA',v:`${selected.calidad}/100`,               c:'#fbbf24'},
                    {l:'Temperatura',v:`${selected.temperatura} °C`,             c:'#f87171'},
                  ].map(({l,v,c})=>(
                    <div key={l} className="rounded-lg p-3" style={{background:'rgba(30,45,69,0.4)'}}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#4b5875'}}>{l}</p>
                      <p className="metric-value text-base font-bold" style={{color:c}}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{color:'#4b5875'}}>Medidores activos</span>
                    <span className="font-bold text-white">{selected.medidoresActivos.toLocaleString()} / {selected.medidoresTotal.toLocaleString()}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill"
                      style={{width:`${(selected.medidoresActivos/selected.medidoresTotal)*100}%`,
                        background:'linear-gradient(90deg,#3b82f6,#06b6d4)'}}/>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-5 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'#4b5875'}}>
                  Ranking · Consumo por Distrito
                </p>
                <div className="space-y-2">
                  {[...DISTRITOS_METRICS].sort((a,b)=>b.consumoM3-a.consumoM3).slice(0,6).map(d=>(
                    <div key={d.id} className="flex items-center gap-2 cursor-pointer" onClick={()=>setSel(d.id)}>
                      <span className="text-[10px] font-bold w-8 text-right" style={{color:'#4b5875'}}>D{d.id}</span>
                      <div className="flex-1 progress-bar" style={{height:8}}>
                        <div className="progress-bar-fill" style={{
                          width:`${(d.consumoM3/520)*100}%`,
                          background: d.id===sel ? 'linear-gradient(90deg,#3b82f6,#06b6d4)' : SC[d.status].color,
                        }}/>
                      </div>
                      <span className="text-xs font-bold metric-value w-16 text-right" style={{color:'#f0f6ff'}}>{d.consumoM3} m³/s</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl p-8 flex items-center justify-center h-full">
              <p className="text-sm" style={{color:'#4b5875'}}>Selecciona un distrito en el mapa</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Correlación: Temperatura vs Consumo</h3>
          <p className="text-xs mb-4" style={{color:'#4b5875'}}>Serie histórica anual</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={CONSUMO_HISTORICO_CIUDAD} margin={{top:5,right:10,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/>
              <XAxis dataKey="month" tick={{fill:'#4b5875',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="l" tick={{fill:'#4b5875',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="r" orientation="right" tick={{fill:'#4b5875',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<DarkTooltip/>}/>
              <Legend formatter={(v)=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
              <Line yAxisId="l" type="monotone" dataKey="consumo"     name="Consumo (m³)" stroke="#3b82f6" strokeWidth={2} dot={false}/>
              <Line yAxisId="r" type="monotone" dataKey="temperatura" name="Temp (°C)"    stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Correlación: Contaminación vs Consumo</h3>
          <p className="text-xs mb-4" style={{color:'#4b5875'}}>Índice ICA vs demanda mensual</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={CONSUMO_HISTORICO_CIUDAD} margin={{top:5,right:10,left:-10,bottom:0}}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/>
              <XAxis dataKey="month" tick={{fill:'#4b5875',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#4b5875',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<DarkTooltip/>}/>
              <Legend formatter={(v)=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
              <Area type="monotone" dataKey="consumo"      name="Consumo (m³)" stroke="#06b6d4" fill="url(#gC)" strokeWidth={2}/>
              <Area type="monotone" dataKey="contaminacion" name="ICA Contam."  stroke="#ef4444" fill="url(#gP)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla distritos */}
      <div className="glass-card rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{borderColor:'#1e2d45'}}>
          <h3 className="text-sm font-bold text-white">Tabla Operativa · 14 Distritos</h3>
          <span className="text-xs" style={{color:'#4b5875'}}>Cassandra: SELECT … WHERE distrito_id=? AND periodo=?</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>{['Distrito','Subalcaldía','Consumo m³/s','Presión PSI','Población','Cobertura','ICA','Estado'].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {DISTRITOS_METRICS.map(d=>{
                const s=SC[d.status];
                return (
                  <tr key={d.id} className={sel===d.id?'bg-blue-500/5':''} onClick={()=>setSel(d.id)} style={{cursor:'pointer'}}>
                    <td className="font-bold" style={{color:'#60a5fa'}}>{d.name}</td>
                    <td style={{color:'#94a3b8'}}>{d.subalcaldia}</td>
                    <td>
                      <span className="metric-value font-bold text-white">{d.consumoM3}</span>
                      {d.consumoM3>450&&<span className="badge badge-red text-[9px] ml-2">ONU</span>}
                    </td>
                    <td style={{color:'#94a3b8'}}>{d.presionPSI}</td>
                    <td style={{color:'#94a3b8'}}>{d.poblacion.toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-14" style={{height:5}}>
                          <div className="progress-bar-fill" style={{width:`${d.cobertura}%`,background:'linear-gradient(90deg,#3b82f6,#06b6d4)'}}/>
                        </div>
                        <span className="text-xs font-bold text-white">{d.cobertura}%</span>
                      </div>
                    </td>
                    <td style={{color:d.calidad>=80?'#34d399':d.calidad>=70?'#fbbf24':'#f87171',fontWeight:700}}>{d.calidad}</td>
                    <td>
                      <span className="badge text-[10px]"
                        style={{background:s.bg,color:s.color,border:`1px solid ${s.color}40`}}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
