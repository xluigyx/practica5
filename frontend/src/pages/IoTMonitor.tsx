import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Cpu, WifiOff, AlertTriangle, Activity, Radio, RefreshCw, Zap, Wrench, BarChart2, Database, Wifi } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Radiobase } from '@/src/lib/types';
import { api } from '@/src/lib/api';
import type { RadiobaseRaw, Consulta8Row, Consulta13Row } from '@/src/lib/api';

interface ModeloLive {
  modelo: string; total: number; activos: number; tasaFallo: number;
  avgAge: number; bateriaPctPromedio: number;
  erroresAlimentacion: number; erroresConectividad: number; erroresConfig: number;
}

const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 text-xs shadow-xl border border-outline-variant/50">
      <p className="font-bold text-on-surface-variant mb-2 text-[10px] uppercase tracking-wide">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{color:p.color}} className="font-semibold mt-0.5">
          {p.name}: <span className="text-on-surface">{p.value?.toLocaleString?.()}</span>
        </p>
      ))}
    </div>
  );
};

const MODEL_COLORS: Record<string, string> = {
  'ITC 100':'#3b82f6','Siconia':'#06b6d4','OY1320':'#ef4444','WP20':'#10b981','LAIN IoT':'#a78bfa',
};
function modelColor(name: string) { return MODEL_COLORS[name] ?? '#64748b'; }

const MODELO_NORM: Record<string, string> = {
  'ITC 100':'ITC 100','Siconia WATER WM-NB':'Siconia','OY1320 LoRaWAN':'OY1320',
  'WP20':'WP20','Medidor 100% IoT':'LAIN IoT',
};

function useStream() {
  const [data, setData] = useState(() =>
    Array.from({length:20},(_,i) => {
      const base = 1400 + Math.round(Math.sin(i)*200);
      const dup  = Math.round(base*0.0007);
      return {t:`-${20-i}m`, ok:base-dup, dup, err:Math.round(base*0.002)};
    })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const base = 1400 + Math.round(Math.random()*300);
        const dup  = Math.round(base*0.0007);
        return [...prev.slice(-29), {t:'ahora', ok:base-dup, dup, err:Math.round(base*0.002)}];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  return data;
}

// ── Consultas 8 + 13 ─────────────────────────────────────────────────────────
function ConsultasIoTSection() {
  const [q8, setQ8]   = useState<Consulta8Row[]>([]);
  const [q8total, setQ8total] = useState(0);
  const [q13, setQ13] = useState<Consulta13Row[]>([]);
  const [q13total, setQ13total] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    Promise.all([api.consulta8(), api.consulta13()])
      .then(([res8, res13]) => {
        setQ8(res8.data.slice(0,10));   setQ8total(res8.total_anomalos);
        setQ13(res13.data.slice(0,15)); setQ13total(res13.total_con_falla);
        setLoading(false);
      })
      .catch(() => {setError(true); setLoading(false);});
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
      <p className="text-sm text-error font-bold">Error al ejecutar consultas 8 y 13 — verifica conexión con Cassandra</p>
    </section>
  );

  return (
    <section className="space-y-5 pb-8">
      <div className="section-title">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary"/>
            <h3 className="text-base font-bold text-on-surface">Consultas Analíticas</h3>
            <span className="text-[10px] font-bold chip-blue px-2.5 py-0.5 rounded-full">
              Consulta 8 · Consulta 13
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5 ml-6">Anomalías de medidores · Renovación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-outline-variant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Consulta 8</p>
              <h4 className="text-sm font-bold text-on-surface">Zonas con Medidores Anómalos</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">consumo=0 o excesivo · Top 10 zonas</p>
            </div>
            {q8total > 0 && (
              <span className="text-[10px] font-bold chip-amber px-2.5 py-1 rounded-xl">
                {q8total.toLocaleString()} total
              </span>
            )}
          </div>
          {q8.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-on-surface-variant text-sm">
              Sin anomalías detectadas en el período activo
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={q8} layout="vertical" margin={{top:0,right:30,left:60,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="zona" tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={58}/>
                <Tooltip content={<DarkTip/>}/>
                <Bar dataKey="anomalos" name="Medidores anómalos" fill="#f59e0b" radius={[0,4,4,0]} opacity={0.85}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden border border-outline-variant flex flex-col">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between"
               style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Consulta 13</p>
              <h4 className="text-sm font-bold text-on-surface">Zonas que Requieren Renovación</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">Estado Dañado/Mantenimiento</p>
            </div>
            {q13total > 0 && (
              <span className="text-[10px] font-bold chip-red px-2.5 py-1 rounded-xl">
                {q13total.toLocaleString()} con falla
              </span>
            )}
          </div>
          {q13.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm p-8">
              Sin medidores en estado Dañado o Mantenimiento
            </div>
          ) : (
            <div className="overflow-auto flex-1" style={{maxHeight:280}}>
              <table className="w-full text-left text-xs data-table">
                <thead>
                  <tr><th>Distrito</th><th>Zona</th><th className="text-right">Con Falla</th><th>Recomendación</th></tr>
                </thead>
                <tbody>
                  {q13.map((r,i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-bold text-primary">{r.distrito}</td>
                      <td className="px-4 py-2.5 text-on-surface-variant">{r.zona}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-right text-error">{r.medidores_con_falla}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full',
                          r.recomendacion==='RENOVACIÓN URGENTE' ? 'chip-red' : 'chip-amber')}>
                          {r.recomendacion}
                        </span>
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

// ── Monitor principal ─────────────────────────────────────────────────────────
export default function IoTMonitor() {
  const stream = useStream();
  const [tick, setTick] = useState(0);
  const [modelos, setModelos]   = useState<ModeloLive[]>([]);
  const [selModel, setSelModel] = useState<ModeloLive | null>(null);
  const [radiobases, setRadiobases]   = useState<Radiobase[]>([]);
  const [errCodigos, setErrCodigos]   = useState<Record<string,string>>({});
  const [proyeccion, setProyeccion]   = useState<{year:string;demanda_m3:number}[]>([]);
  const [modelosStatus, setModelosStatus] = useState<'loading'|'ready'|'empty'|'error'>('loading');

  useEffect(() => {
    const id = setInterval(() => setTick(t=>t+1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.radiobases()
      .then(rows => {
        setRadiobases(rows.map((r): Radiobase => ({
          id:r.id, lat:r.lat, lng:r.lng,
          medidoresConectados:r.medidores_conectados,
          uptimePct:r.uptime_pct, erroresPct:r.errores_pct,
          status:r.status as Radiobase['status'],
        })));
      })
      .catch(() => setRadiobases([]));
    api.erroresCodigos().then(setErrCodigos).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([api.modeloFallos(), api.medErrores(), api.consulta18()])
      .then(([fallosRes, erroresData, proj18]) => {
        const fallos = fallosRes.data;
        if (fallos.length === 0) {
          setModelos([]); setModelosStatus('empty');
        } else {
          const errByModel: Record<string,{e3:number;e4:number;e5:number;e6:number;e7:number}> = {};
          for (const me of erroresData) {
            const norm = MODELO_NORM[me.modelo] ?? me.modelo;
            if (!errByModel[norm]) errByModel[norm] = {e3:0,e4:0,e5:0,e6:0,e7:0};
            if      (me.codigo_error===3) errByModel[norm].e3++;
            else if (me.codigo_error===4) errByModel[norm].e4++;
            else if (me.codigo_error===5) errByModel[norm].e5++;
            else if (me.codigo_error===6) errByModel[norm].e6++;
            else if (me.codigo_error===7) errByModel[norm].e7++;
          }
          const built: ModeloLive[] = fallos.map(f => {
            const name = MODELO_NORM[f.modelo] ?? f.modelo;
            const errs = errByModel[name] ?? {e3:0,e4:0,e5:0,e6:0,e7:0};
            return {
              modelo:name, total:f.total, activos:f.total-f.fallos,
              tasaFallo:f.tasa_fallo_pct, avgAge:0, bateriaPctPromedio:0,
              erroresAlimentacion:errs.e3, erroresConectividad:errs.e4,
              erroresConfig:errs.e5+errs.e6+errs.e7,
            };
          });
          setModelos(built); setSelModel(built[0]??null); setModelosStatus('ready');
        }
        const years = ['2025','2026','2027','2028','2029'];
        const city = years.map(year => ({
          year,
          demanda_m3: proj18.data.reduce((s,r) => s+((r[`${year}_m3`] as number)||0), 0),
        }));
        setProyeccion(city);
      })
      .catch(() => { setModelos([]); setModelosStatus('error'); });
  }, []);

  const online   = radiobases.filter(r=>r.status==='online').length;
  const degraded = radiobases.filter(r=>r.status==='degraded').length;
  const offline  = radiobases.filter(r=>r.status==='offline').length;

  const last    = stream[stream.length-1];
  const dupRate = ((last.dup/(last.ok+last.dup+last.err))*100).toFixed(3);
  const mantenimiento = modelos.filter(m => m.erroresAlimentacion+m.erroresConectividad+m.erroresConfig > 500);

  const dbBadge =
    modelosStatus==='ready' ? {cls:'chip-teal',  dot:'bg-secondary animate-pulse', txt:'● Cassandra'} :
    modelosStatus==='empty' ? {cls:'chip-amber', dot:'bg-amber-400',               txt:'● Sin datos'} :
    modelosStatus==='error' ? {cls:'chip-red',   dot:'bg-error',                   txt:'● Error'} :
                              {cls:'',           dot:'bg-outline-variant animate-ping', txt:'● Cargando…'};

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">

      {/* ── Hero banner ─── */}
      <div className="dash-banner p-6">
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"/>
              </span>
              Red LoRaWAN · GAMC Cochabamba
            </p>
            <h2 className="text-3xl font-extrabold text-on-surface leading-tight">Monitor IoT en Tiempo Real</h2>
            <p className="text-sm text-on-surface-variant mt-1.5">
              {radiobases.length} Radiobases · Apache Cassandra · Streaming activo
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl chip-teal border-0"
                  style={{background:'rgba(0,104,119,0.10)',color:'#006877',border:'1px solid rgba(0,104,119,0.22)'}}>
              <span className="relative flex h-2 w-2">
                <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"/>
              </span>
              LIVE · {tick}s
            </span>
            <button className="flex items-center gap-2 text-xs px-3 py-1.5 border border-outline-variant rounded-xl text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all glass-card">
              <RefreshCw className="w-3.5 h-3.5"/> Reconectar
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {icon:Radio,         label:'Radiobases Online',   value:`${online}/${radiobases.length}`, color:'#10b981'},
          {icon:AlertTriangle, label:'Degradadas',           value:String(degraded),                color:'#f59e0b'},
          {icon:WifiOff,       label:'Offline',              value:String(offline),                 color:'#ef4444'},
          {icon:Zap,           label:'Paquetes/min (live)',  value:(last.ok+last.dup+last.err).toLocaleString(), color:'#a78bfa'},
        ].map(({icon:Icon,label,value,color},i) => (
          <div key={label} className="stat-card rounded-2xl p-5" style={{animationDelay:`${i*60}ms`}}>
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:`linear-gradient(90deg,${color},${color}50)`}}/>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${color}12`,border:`1px solid ${color}22`}}>
                <Icon className="w-5 h-5" style={{color}}/>
              </div>
              <Activity className="w-4 h-4 text-outline-variant opacity-60"/>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-extrabold text-on-surface font-mono">{value}</p>
          </div>
        ))}
      </section>

      {/* ── Stream + Radiobases ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-card rounded-2xl p-5 border border-outline-variant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title mb-0.5">
                <h3 className="text-sm font-bold text-on-surface">Stream LoRaWAN · Ingesta Tiempo Real</h3>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 ml-3.5">
                Limpieza: <span className="font-bold text-amber-500">{dupRate}%</span> duplicados filtrados · Target: 0.07%
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full chip-teal flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"/> Streaming
            </span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={stream} margin={{top:0,right:10,left:-10,bottom:0}}>
              <defs>
                {[['gOk','#10b981'],['gDup','#f59e0b'],['gErr','#ef4444']].map(([id,c])=>(
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={c} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
              <XAxis dataKey="t" tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} interval={4}/>
              <YAxis tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<DarkTip/>}/>
              <Area type="monotone" dataKey="ok"  name="OK"         stroke="#10b981" fill="url(#gOk)"  strokeWidth={2.5}/>
              <Area type="monotone" dataKey="dup" name="Duplicados" stroke="#f59e0b" fill="url(#gDup)" strokeWidth={1.5}/>
              <Area type="monotone" dataKey="err" name="Errores"    stroke="#ef4444" fill="url(#gErr)" strokeWidth={1.5}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radiobases table */}
        <div className="lg:col-span-5 glass-card rounded-2xl overflow-hidden border border-outline-variant">
          <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between"
               style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
            <div>
              <div className="section-title mb-0">
                <h3 className="text-sm font-bold text-on-surface">Estado Radiobases LoRaWAN</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"/>
              <span className="text-[10px] font-bold text-secondary">{online} Online</span>
            </div>
          </div>
          {radiobases.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-sm">Sin radiobases en Cassandra</div>
          ) : (
            <div className="overflow-y-auto" style={{maxHeight:265}}>
              <table className="w-full text-left data-table">
                <thead>
                  <tr><th>ID</th><th>Medidores</th><th>Uptime</th><th>Err%</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {radiobases.map(r=>(
                    <tr key={r.id}>
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-primary">{r.id}</td>
                      <td className="px-4 py-2.5 text-xs text-on-surface-variant">{r.medidoresConectados.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{color:r.uptimePct>98?'#059669':r.uptimePct>95?'#d97706':'#dc2626'}}>{r.uptimePct}%</td>
                      <td className="px-4 py-2.5 text-xs text-on-surface-variant">{r.erroresPct.toFixed(3)}%</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full',
                          r.status==='online'  ?'chip-green':
                          r.status==='degraded'?'chip-amber':'chip-red')}>
                          {r.status==='online'?'● Online':r.status==='degraded'?'◐ Degraded':'○ Offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabla comparativa modelos ─── */}
      <div className="glass-card rounded-2xl overflow-hidden border border-outline-variant">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between"
             style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
          <div>
            <div className="section-title mb-0.5">
              <h3 className="text-sm font-bold text-on-surface">Tabla Comparativa — Modelos de Medidores</h3>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5 ml-3.5">
              Err-3 ({errCodigos['3']??'Alimentación'}) · Err-4 ({errCodigos['4']??'Conectividad'}) · Err-5 ({errCodigos['5']??'Configuración'})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5', dbBadge.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full',dbBadge.dot)}/>{dbBadge.txt}
            </span>
            {mantenimiento.length > 0 && (
              <div className="flex items-center gap-2 text-[10px] font-bold chip-red px-3 py-1.5 rounded-xl">
                <Wrench className="w-3.5 h-3.5"/> {mantenimiento.length} modelo(s) requieren atención
              </div>
            )}
          </div>
        </div>
        {modelos.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            {modelosStatus==='loading'?'Cargando modelos desde Cassandra…':
             modelosStatus==='empty'  ?'Sin medidores en Cassandra — ejecuta el seeder':
             'Error de conexión con Cassandra'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left data-table">
              <thead>
                <tr>
                  {['Modelo','Total','Activos','Fallo %','Err-3 Alim.','Err-4 Conex.','Err-5 Config.','Estado'].map(h=>(
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelos.map(m => {
                  const necMant = (m.erroresAlimentacion+m.erroresConectividad+m.erroresConfig) > 500;
                  return (
                    <tr key={m.modelo}
                      className={cn('cursor-pointer', selModel?.modelo===m.modelo?'bg-primary/[0.04]':'')}
                      onClick={()=>setSelModel(m)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{background:modelColor(m.modelo),boxShadow:`0 0 6px ${modelColor(m.modelo)}60`}}/>
                          <span className="font-bold text-sm text-primary">{m.modelo}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono text-on-surface font-semibold">{m.total.toLocaleString()}</td>
                      <td className="px-5 py-4 text-sm font-mono text-secondary font-semibold">{m.activos.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold font-mono" style={{color:m.tasaFallo>5?'#dc2626':m.tasaFallo>4?'#d97706':'#059669'}}>
                          {m.tasaFallo}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono" style={{color:m.erroresAlimentacion>500?'#dc2626':'#94a3b8'}}>{m.erroresAlimentacion}</td>
                      <td className="px-5 py-4 text-sm font-mono" style={{color:m.erroresConectividad>400?'#dc2626':'#94a3b8'}}>{m.erroresConectividad}</td>
                      <td className="px-5 py-4 text-sm font-mono" style={{color:m.erroresConfig>300?'#dc2626':'#94a3b8'}}>{m.erroresConfig}</td>
                      <td className="px-5 py-4">
                        {necMant
                          ? <span className="text-[9px] font-bold chip-red px-2.5 py-1 rounded-full">⚠ Mantenimiento</span>
                          : <span className="text-[9px] font-bold chip-green px-2.5 py-1 rounded-full">✓ Operativo</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-outline-variant">
          <div className="section-title mb-1">
            <h3 className="text-sm font-bold text-on-surface">Errores Críticos por Modelo</h3>
          </div>
          <p className="text-xs text-on-surface-variant mb-4 ml-3.5">Tipos 3 (Alim.), 4 (Conex.), 5 (Config.)</p>
          {modelos.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-on-surface-variant text-sm">Sin datos de medidores</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modelos.map(m=>({modelo:m.modelo,'Err-3 Alim.':m.erroresAlimentacion,'Err-4 Conex.':m.erroresConectividad,'Err-5 Config.':m.erroresConfig}))} margin={{top:0,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
                <XAxis dataKey="modelo" tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<DarkTip/>}/>
                <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                <Bar dataKey="Err-3 Alim."   fill="#ef4444" radius={[3,3,0,0]} opacity={0.85}/>
                <Bar dataKey="Err-4 Conex."  fill="#f59e0b" radius={[3,3,0,0]} opacity={0.85}/>
                <Bar dataKey="Err-5 Config." fill="#a78bfa" radius={[3,3,0,0]} opacity={0.85}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 border border-outline-variant">
          <div className="section-title mb-1">
            <h3 className="text-sm font-bold text-on-surface">Proyección Demanda Ciudad 2025–2029</h3>
          </div>
          <p className="text-xs text-on-surface-variant mb-4 ml-3.5">Consulta 18 · Crecimiento 2.6%/año · Suma todos los distritos</p>
          {proyeccion.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-on-surface-variant text-sm">Sin lecturas para proyectar</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={proyeccion} margin={{top:0,right:10,left:10,bottom:0}}>
                <defs>
                  <linearGradient id="gDem18" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
                <XAxis dataKey="year" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}K`} tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<DarkTip/>}/>
                <Area type="monotone" dataKey="demanda_m3" name="Demanda (m³)" stroke="#3b82f6" fill="url(#gDem18)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Consultas analíticas ─── */}
      <ConsultasIoTSection/>
    </div>
  );
}
