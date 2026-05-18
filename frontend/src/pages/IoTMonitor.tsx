import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area } from 'recharts';
import { Cpu, WifiOff, AlertTriangle, Activity, Radio, RefreshCw, Zap, Wrench } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MODELOS_STATS, RADIOBASES, PROYECCION_5A } from '@/src/lib/semapa-data';
import type { ModeloMedidor, ModeloStats } from '@/src/lib/types';

const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-xs shadow-xl">
      <p className="font-bold text-on-surface-variant mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color:p.color }} className="font-semibold">
          {p.name}: <span className="text-on-surface">{p.value?.toLocaleString?.()}</span>
        </p>
      ))}
    </div>
  );
};

const MODEL_COLORS: Record<ModeloMedidor, string> = {
  'ITC 100':'#3b82f6','Siconia':'#06b6d4','OY1320':'#ef4444','WP20':'#10b981','LAIN IoT':'#a78bfa',
};

// Simula stream LoRaWAN en tiempo real
function useStream() {
  const [data, setData] = useState(() =>
    Array.from({ length: 20 }, (_, i) => {
      const base = 1400 + Math.round(Math.sin(i) * 200);
      const dup  = Math.round(base * 0.0007);
      return { t: `-${20-i}m`, ok: base-dup, dup, err: Math.round(base*0.002) };
    })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const base = 1400 + Math.round(Math.random() * 300);
        const dup  = Math.round(base * 0.0007);
        return [...prev.slice(-29), { t:'ahora', ok:base-dup, dup, err:Math.round(base*0.002) }];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  return data;
}

export default function IoTMonitor() {
  const stream = useStream();
  const [tick, setTick] = useState(0);
  const [selModel, setSelModel] = useState<ModeloStats>(MODELOS_STATS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t+1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleModel = (m: ModeloStats) => {
    setLoading(true);
    setSelModel(m);
    setTimeout(() => setLoading(false), 300);
  };

  const online   = RADIOBASES.filter(r=>r.status==='online').length;
  const degraded = RADIOBASES.filter(r=>r.status==='degraded').length;
  const offline  = RADIOBASES.filter(r=>r.status==='offline').length;

  const last     = stream[stream.length-1];
  const dupRate  = ((last.dup/(last.ok+last.dup+last.err))*100).toFixed(3);

  // Medidores que necesitan mantenimiento: antigüedad >4 años o errores críticos 3/4/5
  const mantenimiento = MODELOS_STATS.filter(m => m.avgAge > 4 || m.erroresAlimentacion + m.erroresConectividad + m.erroresConfig > 500);

  const radarData = MODELOS_STATS.map(m => ({
    modelo:      m.modelo,
    Disponibilidad: parseFloat(((m.activos/m.total)*100).toFixed(1)),
    Confiabilidad:  parseFloat((100-m.tasaFallo).toFixed(1)),
    Batería:        m.bateriaPctPromedio,
    'Anti-Error':   parseFloat((100-(m.erroresAlimentacion+m.erroresConectividad+m.erroresConfig)/m.total*10).toFixed(1)),
  }));

  const radarSelected = radarData.find(r => r.modelo === selModel.modelo);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#34d399'}}>Red LoRaWAN · GAMC Cochabamba</span>
          <h2 className="text-2xl font-bold text-on-surface mt-0.5">Monitor IoT en Tiempo Real</h2>
          <p className="text-sm text-on-surface-variant">32 Radiobases · 120,000 Medidores · Apache Cassandra</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary-container/20 text-secondary border border-secondary/20">
            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"/> LIVE · {tick}s
          </span>
          <button className="flex items-center gap-2 text-xs px-3 py-1.5 border border-outline-variant rounded-lg text-on-surface-variant hover:border-primary/50 transition-all">
            <RefreshCw className="w-3.5 h-3.5"/> Reconectar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon:Radio,         label:'Radiobases Online',  value:`${online}/32`,      color:'#10b981' },
          { icon:AlertTriangle, label:'Degradadas',          value:String(degraded),    color:'#f59e0b' },
          { icon:WifiOff,       label:'Offline',             value:String(offline),     color:'#ef4444' },
          { icon:Zap,           label:'Paquetes/min (live)', value:(last.ok+last.dup+last.err).toLocaleString(), color:'#a78bfa' },
        ].map(({ icon:Icon, label, value, color }, i) => (
          <div key={label} className="glass-card rounded-xl p-5 border border-outline-variant">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${color}18`,border:`1px solid ${color}30`}}>
                <Icon className="w-4 h-4" style={{color}}/>
              </div>
              <Activity className="w-4 h-4 text-outline-variant"/>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-bold text-on-surface font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* Stream + Radiobases */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-card rounded-xl p-5 border border-outline-variant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Stream LoRaWAN · Ingesta Tiempo Real</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Limpieza: <span className="font-bold text-amber-400">{dupRate}%</span> duplicados filtrados · Target: 0.07%
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">● Streaming</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={stream} margin={{top:0,right:10,left:-10,bottom:0}}>
              <defs>
                {[['gOk','#10b981'],['gDup','#f59e0b'],['gErr','#ef4444']].map(([id,c])=>(
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3}/><stop offset="95%" stopColor={c} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/>
              <XAxis dataKey="t" tick={{fill:'#4b5875',fontSize:9}} axisLine={false} tickLine={false} interval={4}/>
              <YAxis tick={{fill:'#4b5875',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<DarkTip/>}/>
              <Area type="monotone" dataKey="ok"  name="OK"         stroke="#10b981" fill="url(#gOk)"  strokeWidth={2}/>
              <Area type="monotone" dataKey="dup" name="Duplicados" stroke="#f59e0b" fill="url(#gDup)" strokeWidth={1.5}/>
              <Area type="monotone" dataKey="err" name="Errores"    stroke="#ef4444" fill="url(#gErr)" strokeWidth={1.5}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radiobases table */}
        <div className="lg:col-span-5 glass-card rounded-xl overflow-hidden border border-outline-variant">
          <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface">Estado Radiobases LoRaWAN</h3>
            <span className="text-[10px] font-bold text-secondary">{online} Online</span>
          </div>
          <div className="overflow-y-auto" style={{maxHeight:260}}>
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low sticky top-0">
                <tr>{['ID','Medidores','Uptime','Err%','Estado'].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {RADIOBASES.slice(0,16).map(r=>(
                  <tr key={r.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-primary">{r.id}</td>
                    <td className="px-4 py-2.5 text-xs text-on-surface-variant">{r.medidoresConectados.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs font-bold" style={{color:r.uptimePct>98?'#34d399':r.uptimePct>95?'#fbbf24':'#f87171'}}>{r.uptimePct}%</td>
                    <td className="px-4 py-2.5 text-xs text-on-surface-variant">{r.erroresPct.toFixed(3)}%</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                        r.status==='online'?'bg-secondary-container/20 text-secondary':
                        r.status==='degraded'?'bg-amber-100/10 text-amber-400':'bg-error-container/20 text-error')}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabla comparativa 5 modelos — Error codes 3/4/5 */}
      <div className="glass-card rounded-xl overflow-hidden border border-outline-variant">
        <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Tabla Comparativa — 5 Modelos de Medidores</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Errores críticos tipo 3 (Alimentación), 4 (Conectividad), 5 (Configuración)</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-error bg-error-container/20 px-3 py-1.5 rounded-lg border border-error/20">
            <Wrench className="w-3.5 h-3.5"/> {mantenimiento.length} modelo(s) requieren mantenimiento
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low/50">
              <tr>
                {['Modelo','Total','Activos','Antigüedad','Fallo %','Err-3 Alim.','Err-4 Conex.','Err-5 Config.','Batería','Estado'].map(h=>(
                  <th key={h} className="px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {MODELOS_STATS.map(m=>{
                const necMant = m.avgAge>4 || (m.erroresAlimentacion+m.erroresConectividad+m.erroresConfig)>500;
                return (
                  <tr key={m.modelo}
                    className={cn('hover:bg-surface-container transition-colors cursor-pointer', selModel.modelo===m.modelo?'bg-primary/5':'')}
                    onClick={()=>handleModel(m)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{background:MODEL_COLORS[m.modelo]}}/>
                        <span className="font-bold text-sm text-primary">{m.modelo}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-on-surface">{m.total.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm font-mono text-secondary">{m.activos.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={cn('text-xs font-bold font-mono px-2 py-0.5 rounded',
                        m.avgAge>4?'bg-error-container/20 text-error':'text-on-surface-variant')}>
                        {m.avgAge.toFixed(1)} años{m.avgAge>4?' ⚠':''}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold font-mono" style={{color:m.tasaFallo>5?'#ef4444':m.tasaFallo>4?'#f59e0b':'#34d399'}}>
                        {m.tasaFallo}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-mono" style={{color:m.erroresAlimentacion>500?'#ef4444':'#94a3b8'}}>{m.erroresAlimentacion}</td>
                    <td className="px-5 py-4 text-sm font-mono" style={{color:m.erroresConectividad>400?'#ef4444':'#94a3b8'}}>{m.erroresConectividad}</td>
                    <td className="px-5 py-4 text-sm font-mono" style={{color:m.erroresConfig>300?'#ef4444':'#94a3b8'}}>{m.erroresConfig}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{width:`${m.bateriaPctPromedio}%`,background:m.bateriaPctPromedio<50?'#ef4444':'#10b981'}}/>
                        </div>
                        <span className="text-xs font-bold font-mono text-on-surface">{m.bateriaPctPromedio}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {necMant
                        ? <span className="text-[10px] font-bold bg-error-container/20 text-error px-2 py-1 rounded-full border border-error/20">Mantenimiento</span>
                        : <span className="text-[10px] font-bold bg-secondary-container/20 text-secondary px-2 py-1 rounded-full border border-secondary/20">Operativo</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts: Barras + Proyección */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <div className="glass-card rounded-xl p-5 border border-outline-variant">
          <h3 className="text-sm font-bold text-on-surface mb-4">Errores Críticos por Modelo (tipos 3, 4, 5)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MODELOS_STATS.map(m=>({ modelo:m.modelo, 'Err-3 Alim.':m.erroresAlimentacion, 'Err-4 Conex.':m.erroresConectividad, 'Err-5 Config.':m.erroresConfig }))} margin={{top:0,right:10,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/>
              <XAxis dataKey="modelo" tick={{fill:'#4b5875',fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#4b5875',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<DarkTip/>}/>
              <Bar dataKey="Err-3 Alim."  fill="#ef4444" radius={[2,2,0,0]} opacity={0.85}/>
              <Bar dataKey="Err-4 Conex." fill="#f59e0b" radius={[2,2,0,0]} opacity={0.85}/>
              <Bar dataKey="Err-5 Config."fill="#a78bfa" radius={[2,2,0,0]} opacity={0.85}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5 border border-outline-variant">
          <h3 className="text-sm font-bold text-on-surface mb-1">Proyección Demanda 2025–2030</h3>
          <p className="text-xs text-on-surface-variant mb-4">Crecimiento 2.6% anual</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={PROYECCION_5A} margin={{top:0,right:10,left:-10,bottom:0}}>
              <defs>
                <linearGradient id="gDem" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                <linearGradient id="gCap" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/>
              <XAxis dataKey="year" tick={{fill:'#4b5875',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#4b5875',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<DarkTip/>}/>
              <Area type="monotone" dataKey="demanda"  name="Demanda (m³/hr)" stroke="#3b82f6" fill="url(#gDem)" strokeWidth={2}/>
              <Area type="monotone" dataKey="capacidad" name="Capacidad (m³/hr)" stroke="#10b981" fill="url(#gCap)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
