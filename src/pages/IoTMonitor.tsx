import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { WifiOff, AlertTriangle, Activity, Radio, RefreshCw, Zap } from 'lucide-react';
import { RADIOBASES, METER_MODELS, METER_MODEL_STATS } from '../lib/semapa-data';

// ─── Tooltip oscuro ───────────────────────────────────────────────────────────
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

// ─── Simula stream en tiempo real ─────────────────────────────────────────────
function useLiveStream() {
  const [packets, setPackets] = useState<{ t: string; ok: number; dup: number; err: number }[]>(() =>
    Array.from({ length: 20 }, (_, i) => {
      const base = Math.round(1400 + Math.sin(i) * 200);
      const dup  = Math.round(base * 0.0007); // 0.07% duplicados
      return { t: `-${20-i}m`, ok: base - dup, dup, err: Math.round(base * 0.002) };
    })
  );

  useEffect(() => {
    const id = setInterval(() => {
      setPackets(prev => {
        const base = Math.round(1400 + Math.random() * 300);
        const dup  = Math.round(base * 0.0007);
        return [...prev.slice(-29), { t: 'ahora', ok: base - dup, dup, err: Math.round(base * 0.002) }];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return packets;
}

// ─── Radiobase Map (SVG) ──────────────────────────────────────────────────────
function RadiobaseMap() {
  const [hover, setHover] = useState<string | null>(null);
  const scale = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
    outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);

  const lats = RADIOBASES.map(r => r.lat);
  const lngs = RADIOBASES.map(r => r.lng);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);

  const statusColor = { online:'#10b981', degraded:'#f59e0b', offline:'#ef4444' };

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 400 300" className="w-full h-full">
        <rect width="400" height="300"
          fill="url(#rb-bg)" rx="8" />
        <defs>
          <radialGradient id="rb-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d1f3c" />
            <stop offset="100%" stopColor="#080c14" />
          </radialGradient>
        </defs>
        {[50,100,150,200,250].map(y => <line key={y} x1="10" y1={y} x2="390" y2={y} stroke="#1e2d45" strokeWidth="0.5" />)}
        {[60,120,180,240,300,360].map(x => <line key={x} x1={x} y1="10" x2={x} y2="290" stroke="#1e2d45" strokeWidth="0.5" />)}

        {RADIOBASES.map(r => {
          const x = scale(r.lng, lngMin, lngMax, 20, 380);
          const y = scale(r.lat, latMax, latMin, 20, 280);
          const c = statusColor[r.status];
          const isHover = hover === r.id;
          return (
            <g key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor:'pointer' }}>
              {/* Coverage ring */}
              <circle cx={x} cy={y} r={isHover ? 30 : 20} fill={c} opacity={0.04} />
              <circle cx={x} cy={y} r={isHover ? 16 : 10} fill={c} opacity={0.12}
                className={r.status === 'online' ? 'animate-pulse' : ''} />
              <circle cx={x} cy={y} r={5} fill={c} opacity={0.9} />
              {isHover && (
                <text x={x} y={y - 16} textAnchor="middle"
                  style={{ fontSize:8, fill:'#f0f6ff', fontWeight:700, pointerEvents:'none' }}>
                  {r.id} {r.uptimePct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex gap-3">
        {[['online','#10b981','Online'],['degraded','#f59e0b','Degradado'],['offline','#ef4444','Offline']].map(([k,c,l]) => (
          <span key={k} className="flex items-center gap-1 text-[10px] font-bold" style={{ color: c }}>
            <span className="w-2 h-2 rounded-full" style={{ background: c }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IoTMonitor() {
  const stream = useLiveStream();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const online   = RADIOBASES.filter(r => r.status === 'online').length;
  const degraded = RADIOBASES.filter(r => r.status === 'degraded').length;
  const offline  = RADIOBASES.filter(r => r.status === 'offline').length;

  const lastPkt  = stream[stream.length - 1];
  const totalPkt = lastPkt.ok + lastPkt.dup + lastPkt.err;
  const dupRate  = ((lastPkt.dup / totalPkt) * 100).toFixed(3);

  const modelBarData = METER_MODELS.map(m => ({
    modelo: m,
    activos: METER_MODEL_STATS[m].active,
    inactivos: METER_MODEL_STATS[m].total - METER_MODEL_STATS[m].active,
  }));

  const MODEL_COLORS: Record<string, string> = {
    'ITC 100':'#3b82f6','Siconia':'#06b6d4','OY1320':'#ef4444','WP20':'#10b981','LAIN IoT':'#a78bfa',
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color:'#34d399' }}>
            Red LoRaWAN · GAMC Cochabamba
          </p>
          <h1 className="text-2xl font-bold text-white">Monitor IoT en Tiempo Real</h1>
          <p className="text-sm mt-0.5" style={{ color:'#4b5875' }}>
            32 Radiobases · 120,000 Medidores · Apache Cassandra
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }}>
            <span className="status-dot online" /> LIVE · {tick}s
          </span>
          <button className="btn-ghost flex items-center gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Reconectar
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon:Radio,       label:'Radiobases Online',  value:`${online}/32`,     color:'#10b981' },
          { icon:AlertTriangle,label:'Degradadas',         value:String(degraded),   color:'#f59e0b' },
          { icon:WifiOff,     label:'Offline',            value:String(offline),    color:'#ef4444' },
          { icon:Zap,         label:'Paquetes/min (live)',value:totalPkt.toLocaleString(), color:'#a78bfa' },
        ].map(({ icon:Icon, label, value, color }, i) => (
          <div key={label} className="glass-card rounded-xl p-5 animate-slide-up"
            style={{ animationDelay:`${i*80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <Activity className="w-4 h-4" style={{ color:'#2d3f5c' }} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color:'#4b5875' }}>{label}</p>
            <p className="metric-value text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Stream + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live stream chart */}
        <div className="lg:col-span-7 glass-card rounded-xl p-5" style={{ border:'1px solid #1e2d45' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Stream de Datos LoRaWAN · Ingesta en Tiempo Real</h3>
              <p className="text-xs mt-0.5" style={{ color:'#4b5875' }}>
                Limpieza activa: <span style={{ color:'#fbbf24', fontWeight:700 }}>{dupRate}%</span> duplicados eliminados
                · Target: 0.07%
              </p>
            </div>
            <span className="badge badge-green text-[10px]">
              <span className="status-dot online mr-1" style={{ width:6, height:6 }} /> Streaming
            </span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={stream} margin={{ top:0, right:10, left:-10, bottom:0 }}>
              <defs>
                <linearGradient id="gradOk"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradErr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="t" tick={{ fill:'#4b5875', fontSize:9 }} axisLine={false} tickLine={false}
                interval={4} />
              <YAxis tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="ok"  name="OK"          stroke="#10b981" fill="url(#gradOk)"  strokeWidth={2} />
              <Area type="monotone" dataKey="dup" name="Duplicados"  stroke="#f59e0b" fill="url(#gradDup)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="err" name="Errores"     stroke="#ef4444" fill="url(#gradErr)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radiobase Map */}
        <div className="lg:col-span-5 glass-card rounded-xl overflow-hidden" style={{ border:'1px solid #1e2d45' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:'#1e2d45' }}>
            <h3 className="text-sm font-bold text-white">Mapa de Radiobases LoRaWAN</h3>
            <span className="badge badge-green text-[10px]">{online} Online</span>
          </div>
          <div className="p-2 h-[270px]">
            <RadiobaseMap />
          </div>
        </div>
      </div>

      {/* Medidores Activos vs Inactivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5" style={{ border:'1px solid #1e2d45' }}>
          <h3 className="text-sm font-bold text-white mb-1">Activos vs Inactivos por Modelo</h3>
          <p className="text-xs mb-4" style={{ color:'#4b5875' }}>
            Cassandra: SELECT modelo, COUNT(*) FROM medidores GROUP BY modelo, estado
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={modelBarData} margin={{ top:0, right:10, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="modelo" tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="activos"   name="Activos"   stackId="a" radius={[0,0,0,0]}>
                {modelBarData.map(d => <Cell key={d.modelo} fill={MODEL_COLORS[d.modelo]} opacity={0.9} />)}
              </Bar>
              <Bar dataKey="inactivos" name="Inactivos" stackId="a" radius={[4,4,0,0]}>
                {modelBarData.map(d => <Cell key={d.modelo} fill={MODEL_COLORS[d.modelo]} opacity={0.3} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radiobases table */}
        <div className="glass-card rounded-xl overflow-hidden" style={{ border:'1px solid #1e2d45' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor:'#1e2d45' }}>
            <h3 className="text-sm font-bold text-white">Estado Radiobases (muestra)</h3>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight:260 }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['ID','Medidores','Uptime','Err %','Estado'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {RADIOBASES.slice(0, 16).map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs font-bold" style={{ color:'#60a5fa' }}>{r.id}</td>
                    <td style={{ color:'#94a3b8' }}>{r.medidoresConectados.toLocaleString()}</td>
                    <td>
                      <span style={{ color: r.uptimePct > 98 ? '#34d399' : r.uptimePct > 95 ? '#fbbf24' : '#f87171', fontWeight:700 }}>
                        {r.uptimePct}%
                      </span>
                    </td>
                    <td style={{ color:'#94a3b8' }}>{r.erroresPct.toFixed(3)}%</td>
                    <td>
                      <span className={`badge text-[10px] ${r.status === 'online' ? 'badge-green' : r.status === 'degraded' ? 'badge-amber' : 'badge-red'}`}>
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
    </div>
  );
}
