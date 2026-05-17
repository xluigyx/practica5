import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { Cpu, AlertTriangle, CheckCircle, Wrench, Zap, RefreshCw } from 'lucide-react';
import { METER_MODEL_STATS, METER_MODELS, DEMANDA_PROYECCION } from '../lib/semapa-data';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface MedidorFuera {
  serie: string; modelo: string; distrito: number;
  zona: string; ultimaLectura: string; errorCodigo: number;
  errorDesc: string; antiguedad: number;
}

// ─── Datos simulados (patrón repositorio Cassandra) ───────────────────────────
// SELECT serie, modelo, distrito, zona, ultima_lectura, error_code
// FROM semapa.medidores WHERE estado = 'OFFLINE' LIMIT 50;
const MEDIDORES_FUERA: MedidorFuera[] = [
  { serie:'OY1320-229912', modelo:'OY1320',   distrito:12, zona:'Z1', ultimaLectura:'2025-05-17 08:12', errorCodigo:4, errorDesc:'Conectividad',  antiguedad:5.1 },
  { serie:'OY1320-441233', modelo:'OY1320',   distrito:10, zona:'Z2', ultimaLectura:'2025-05-16 22:45', errorCodigo:3, errorDesc:'Alimentación',  antiguedad:4.8 },
  { serie:'ITC100-882341', modelo:'ITC 100',  distrito:10, zona:'Z1', ultimaLectura:'2025-05-17 06:00', errorCodigo:5, errorDesc:'Configuración', antiguedad:4.2 },
  { serie:'ITC100-334512', modelo:'ITC 100',  distrito:9,  zona:'Z3', ultimaLectura:'2025-05-16 14:30', errorCodigo:4, errorDesc:'Conectividad',  antiguedad:3.9 },
  { serie:'Siconia-551230', modelo:'Siconia', distrito:4,  zona:'Z2', ultimaLectura:'2025-05-17 10:15', errorCodigo:5, errorDesc:'Configuración', antiguedad:2.7 },
  { serie:'WP20-448821',   modelo:'WP20',     distrito:9,  zona:'Z4', ultimaLectura:'2025-05-17 11:00', errorCodigo:3, errorDesc:'Alimentación',  antiguedad:1.8 },
  { serie:'OY1320-671234', modelo:'OY1320',   distrito:7,  zona:'Z1', ultimaLectura:'2025-05-15 18:00', errorCodigo:4, errorDesc:'Conectividad',  antiguedad:4.6 },
  { serie:'LAIN-672341',   modelo:'LAIN IoT', distrito:5,  zona:'Z4', ultimaLectura:'2025-05-17 09:45', errorCodigo:3, errorDesc:'Alimentación',  antiguedad:1.3 },
];

// Colores por modelo
const MODEL_COLORS: Record<string, string> = {
  'ITC 100':  '#3b82f6',
  'Siconia':  '#06b6d4',
  'OY1320':   '#ef4444',
  'WP20':     '#10b981',
  'LAIN IoT': '#a78bfa',
};

const ERROR_COLORS: Record<number, { bg: string; color: string; label: string }> = {
  3: { bg:'rgba(245,158,11,0.15)',  color:'#fbbf24', label:'Alimentación' },
  4: { bg:'rgba(239,68,68,0.15)',   color:'#f87171', label:'Conectividad' },
  5: { bg:'rgba(139,92,246,0.15)',  color:'#a78bfa', label:'Configuración' },
};

// ─── Tooltip oscuro reutilizable ──────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:8, padding:'10px 14px' }}>
      <p style={{ color:'#94a3b8', fontSize:11, fontWeight:700, marginBottom:6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color:p.color, fontSize:12, fontWeight:600, margin:'2px 0' }}>
          {p.name}: <span style={{ color:'#f0f6ff' }}>{p.value?.toLocaleString?.() ?? p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Datos de modelos para gráficos ──────────────────────────────────────────
const modelChartData = METER_MODELS.map(m => {
  const s = METER_MODEL_STATS[m];
  return {
    modelo: m,
    activos: s.active,
    inactivos: s.total - s.active,
    fallosPct: s.failureRate,
    firmwareErr: s.firmwareErrors,
    conectErr: s.connectivityErrors,
    totalErr: s.firmwareErrors + s.connectivityErrors,
    avgAge: s.avgAge,
    paraRenovacion: s.avgAge > 4 ? s.total - s.active : 0,
  };
});

// Datos radar de salud por modelo
const radarData = [
  { metric: 'Disponibilidad', ...Object.fromEntries(METER_MODELS.map(m => [m, +(100 - METER_MODEL_STATS[m].failureRate).toFixed(1)])) },
  { metric: 'Firmware OK',    ...Object.fromEntries(METER_MODELS.map(m => [m, +(100 - METER_MODEL_STATS[m].firmwareErrors / METER_MODEL_STATS[m].total * 100).toFixed(1)])) },
  { metric: 'Conectividad',   ...Object.fromEntries(METER_MODELS.map(m => [m, +(100 - METER_MODEL_STATS[m].connectivityErrors / METER_MODEL_STATS[m].total * 100).toFixed(1)])) },
  { metric: 'Antigüedad',     ...Object.fromEntries(METER_MODELS.map(m => [m, +(100 - METER_MODEL_STATS[m].avgAge * 10).toFixed(1)])) },
];

export default function GerenciaDashboard() {
  const [tab, setTab] = useState<'modelos' | 'fuera' | 'proyeccion'>('modelos');

  const totalActivos   = METER_MODELS.reduce((s, m) => s + METER_MODEL_STATS[m].active, 0);
  const totalInactivos = METER_MODELS.reduce((s, m) => s + (METER_MODEL_STATS[m].total - METER_MODEL_STATS[m].active), 0);
  const totalTotal     = METER_MODELS.reduce((s, m) => s + METER_MODEL_STATS[m].total, 0);
  const peorModelo     = [...METER_MODELS].sort((a, b) => METER_MODEL_STATS[b].failureRate - METER_MODEL_STATS[a].failureRate)[0];
  const renovacion     = METER_MODELS.reduce((s, m) => s + (METER_MODEL_STATS[m].avgAge > 4 ? METER_MODEL_STATS[m].total - METER_MODEL_STATS[m].active : 0), 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color:'#06b6d4' }}>
            Gerencia SEMAPA · Panel Operativo
          </p>
          <h1 className="text-2xl font-bold text-white">Monitor de Infraestructura IoT</h1>
          <p className="text-sm mt-0.5" style={{ color:'#4b5875' }}>
            5 Modelos · 120,000 Medidores · 32 Radiobases LoRaWAN
          </p>
        </div>
        <button className="btn-ghost flex items-center gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Cpu,           label:'Total Instalados', value: totalTotal.toLocaleString(),   color:'#3b82f6' },
          { icon: CheckCircle,   label:'Activos',          value: totalActivos.toLocaleString(),  color:'#10b981' },
          { icon: AlertTriangle, label:'Fuera de Servicio',value: totalInactivos.toLocaleString(),color:'#ef4444' },
          { icon: Wrench,        label:'Para Renovación',  value: renovacion.toLocaleString(),    color:'#f59e0b' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <div key={label} className="glass-card rounded-xl p-5 animate-slide-up"
            style={{ animationDelay:`${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ background:`${color}18`, color }}>LIVE</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color:'#4b5875' }}>{label}</p>
            <p className="metric-value text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'#0d1320', border:'1px solid #1e2d45' }}>
        {(['modelos', 'fuera', 'proyeccion'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              background: tab === t ? 'linear-gradient(135deg,#1d4ed8,#0891b2)' : 'transparent',
              color: tab === t ? '#ffffff' : '#4b5875',
              border: tab === t ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
            }}>
            {t === 'modelos' ? '📊 Ranking por Modelo' : t === 'fuera' ? '⚠️ Fuera de Servicio' : '📈 Proyección 5 Años'}
          </button>
        ))}
      </div>

      {/* Tab: Modelos */}
      {tab === 'modelos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Barra: total errores */}
          <div className="glass-card rounded-xl p-5" style={{ border:'1px solid #1e2d45' }}>
            <h3 className="text-sm font-bold text-white mb-1">Ranking de Fallos por Modelo</h3>
            <p className="text-xs mb-4" style={{ color:'#4b5875' }}>
              Peor modelo: <span style={{ color:'#f87171', fontWeight:700 }}>{peorModelo}</span> ({METER_MODEL_STATS[peorModelo].failureRate}% tasa de fallo)
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modelChartData} margin={{ top:0, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="modelo" tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="firmwareErr" name="Firmware" stackId="a" radius={[0,0,0,0]}>
                  {modelChartData.map(d => <Cell key={d.modelo} fill={MODEL_COLORS[d.modelo]} />)}
                </Bar>
                <Bar dataKey="conectErr" name="Conectividad" stackId="a" radius={[4,4,0,0]}>
                  {modelChartData.map(d => <Cell key={d.modelo} fill={MODEL_COLORS[d.modelo]} opacity={0.5} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar: salud por modelo */}
          <div className="glass-card rounded-xl p-5" style={{ border:'1px solid #1e2d45' }}>
            <h3 className="text-sm font-bold text-white mb-1">Índice de Salud Técnica</h3>
            <p className="text-xs mb-4" style={{ color:'#4b5875' }}>Comparativa multidimensional por modelo</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e2d45" />
                <PolarAngleAxis dataKey="metric" tick={{ fill:'#4b5875', fontSize:10 }} />
                {METER_MODELS.map(m => (
                  <Radar key={m} name={m} dataKey={m} stroke={MODEL_COLORS[m]}
                    fill={MODEL_COLORS[m]} fillOpacity={0.1} strokeWidth={1.5} />
                ))}
                <Legend formatter={(v) => <span style={{ color:'#94a3b8', fontSize:10 }}>{v}</span>} />
                <Tooltip content={<DarkTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Table: modelo stats */}
          <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden" style={{ border:'1px solid #1e2d45' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor:'#1e2d45' }}>
              <h3 className="text-sm font-bold text-white">Estadísticas por Modelo · Cassandra: SELECT FROM medidores WHERE modelo = ?</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  {['Modelo','Total','Activos','Inactivos','% Fallo','Err Firmware','Err Conectividad','Edad Prom.','Renovar'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {modelChartData.map(d => (
                  <tr key={d.modelo}>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: MODEL_COLORS[d.modelo] }} />
                        <span className="font-bold text-white">{d.modelo}</span>
                      </span>
                    </td>
                    <td style={{ color:'#94a3b8' }}>{d.activos + d.inactivos}</td>
                    <td style={{ color:'#34d399', fontWeight:600 }}>{d.activos.toLocaleString()}</td>
                    <td style={{ color:'#f87171', fontWeight:600 }}>{d.inactivos.toLocaleString()}</td>
                    <td>
                      <span className={`badge text-[10px] ${d.fallosPct > 5 ? 'badge-red' : d.fallosPct > 3.5 ? 'badge-amber' : 'badge-green'}`}>
                        {d.fallosPct}%
                      </span>
                    </td>
                    <td style={{ color:'#94a3b8' }}>{d.firmwareErr}</td>
                    <td style={{ color:'#94a3b8' }}>{d.conectErr}</td>
                    <td>
                      <span style={{ color: d.avgAge > 4 ? '#f87171' : '#34d399', fontWeight:600 }}>
                        {d.avgAge} años {d.avgAge > 4 ? '⚠️' : ''}
                      </span>
                    </td>
                    <td style={{ color: d.paraRenovacion > 0 ? '#fbbf24' : '#4b5875', fontWeight:600 }}>
                      {d.paraRenovacion > 0 ? d.paraRenovacion.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Fuera de servicio */}
      {tab === 'fuera' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm" style={{ color:'#f87171' }}>
              <strong>{MEDIDORES_FUERA.length} medidores</strong> fuera de servicio · Códigos de error: 3 (Alimentación), 4 (Conectividad), 5 (Configuración) ·&nbsp;
              <strong>{MEDIDORES_FUERA.filter(m => m.antiguedad > 4).length}</strong> con antigüedad &gt;4 años → requieren renovación
            </p>
          </div>
          <div className="glass-card rounded-xl overflow-hidden" style={{ border:'1px solid #1e2d45' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Serie','Modelo','Distrito','Zona','Última Lectura','Error','Antigüedad','Acción'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {MEDIDORES_FUERA.map(m => {
                  const ec = ERROR_COLORS[m.errorCodigo];
                  return (
                    <tr key={m.serie}>
                      <td className="font-mono text-xs" style={{ color:'#60a5fa' }}>{m.serie}</td>
                      <td>
                        <span className="badge badge-blue text-[10px]">{m.modelo}</span>
                      </td>
                      <td style={{ color:'#94a3b8' }}>D-{m.distrito}</td>
                      <td style={{ color:'#94a3b8' }}>{m.zona}</td>
                      <td className="font-mono text-xs" style={{ color:'#4b5875' }}>{m.ultimaLectura}</td>
                      <td>
                        <span className="badge text-[10px]"
                          style={{ background:ec.bg, color:ec.color, border:`1px solid ${ec.color}40` }}>
                          E{m.errorCodigo}: {ec.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: m.antiguedad > 4 ? '#f87171' : '#94a3b8', fontWeight:600 }}>
                          {m.antiguedad} años {m.antiguedad > 4 ? '⚠️' : ''}
                        </span>
                      </td>
                      <td>
                        <button className="text-xs font-bold px-3 py-1 rounded"
                          style={{ background:'rgba(59,130,246,0.1)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.2)' }}>
                          Asignar técnico
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Proyección */}
      {tab === 'proyeccion' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 glass-card rounded-xl p-5" style={{ border:'1px solid #1e2d45' }}>
            <h3 className="text-sm font-bold text-white mb-1">Proyección de Demanda Hídrica 2025–2030</h3>
            <p className="text-xs mb-4" style={{ color:'#4b5875' }}>
              Factor de crecimiento anual: <span style={{ color:'#60a5fa', fontWeight:700 }}>2.6%</span> · Capacidad instalada escala +120 m³/año
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={DEMANDA_PROYECCION} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="year" tick={{ fill:'#4b5875', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#4b5875', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend formatter={(v) => <span style={{ color:'#94a3b8', fontSize:11 }}>{v}</span>} />
                <Line type="monotone" dataKey="demanda"   name="Demanda (m³/día)" stroke="#ef4444" strokeWidth={2.5} dot={{ fill:'#ef4444', r:4 }} />
                <Line type="monotone" dataKey="capacidad" name="Capacidad (m³/día)" stroke="#10b981" strokeWidth={2.5} strokeDasharray="6 3" dot={{ fill:'#10b981', r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {DEMANDA_PROYECCION.map(d => (
              <div key={d.year} className="glass-card rounded-xl p-4 flex items-center justify-between"
                style={{ border:'1px solid #1e2d45' }}>
                <div>
                  <p className="text-xs font-bold" style={{ color:'#4b5875' }}>{d.year}</p>
                  <p className="metric-value text-lg font-bold text-white">{d.demanda.toLocaleString()} m³/día</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase" style={{ color:'#4b5875' }}>Brecha</p>
                  <p className="metric-value text-base font-bold"
                    style={{ color: d.brecha > 200 ? '#34d399' : d.brecha > 0 ? '#fbbf24' : '#f87171' }}>
                    {d.brecha > 0 ? '+' : ''}{d.brecha} m³
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
