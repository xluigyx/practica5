import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { DollarSign, TrendingDown, AlertTriangle, FileText, Download } from 'lucide-react';
import {
  CIERRE_FINANCIERO_6M, TOP_MOROSOS,
  type TarifaCategoria, calcularFactura,
} from '../lib/semapa-data';

// ─── Export de categorías desde semapa-data ────────────────────────────────────
// (se necesita añadir el array de keys al data file)
const CATEGORIAS: TarifaCategoria[] = [
  'R1-Preferencial','R2-Social','R3-Residencial','R4-Residencial Alta',
  'Comercial','Industrial','Institucional','Municipal','Provisional',
];

// ─── Tooltip oscuro ───────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:8, padding:'10px 14px', minWidth:200 }}>
      <p style={{ color:'#94a3b8', fontSize:11, fontWeight:700, marginBottom:6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color:p.color, fontSize:12, fontWeight:600, margin:'2px 0' }}>
          {p.name}: <span style={{ color:'#f0f6ff' }}>Bs {p.value?.toLocaleString?.()}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Simulador de impacto financiero ─────────────────────────────────────────
function SimuladorImpacto() {
  const [consumo,    setConsumo]    = useState(28);
  const [catActual,  setCatActual]  = useState<TarifaCategoria>('R1-Preferencial');
  const [catNueva,   setCatNueva]   = useState<TarifaCategoria>('R4-Residencial Alta');

  const actual = calcularFactura(catActual, consumo);
  const nueva  = calcularFactura(catNueva,  consumo);
  const delta  = nueva.total - actual.total;
  const pct    = ((delta / actual.total) * 100).toFixed(1);

  return (
    <div className="glass-card rounded-xl p-5 space-y-4" style={{ border:'1px solid #1e2d45' }}>
      <div>
        <h3 className="text-sm font-bold text-white">Simulador de Impacto por Cambio de Categoría</h3>
        <p className="text-xs mt-0.5" style={{ color:'#4b5875' }}>Cambia parámetros para ver el impacto financiero inmediato</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color:'#4b5875' }}>
            Consumo (m³)
          </label>
          <input type="number" min={1} max={200} value={consumo}
            onChange={e => setConsumo(Number(e.target.value))}
            className="w-full rounded-lg px-3 py-2 text-sm font-bold text-white"
            style={{ background:'#0d1320', border:'1px solid #1e2d45', outline:'none' }}
          />
          {consumo > 45 && (
            <p className="text-[10px] mt-1 font-bold" style={{ color:'#f87171' }}>⚠ Exceso ONU (&gt;45m³)</p>
          )}
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color:'#4b5875' }}>
            Categoría Actual
          </label>
          <select value={catActual} onChange={e => setCatActual(e.target.value as TarifaCategoria)}
            className="w-full rounded-lg px-3 py-2 text-xs font-bold text-white"
            style={{ background:'#0d1320', border:'1px solid #1e2d45', outline:'none' }}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color:'#4b5875' }}>
            Categoría Nueva
          </label>
          <select value={catNueva} onChange={e => setCatNueva(e.target.value as TarifaCategoria)}
            className="w-full rounded-lg px-3 py-2 text-xs font-bold text-white"
            style={{ background:'#0d1320', border:'1px solid #1e2d45', outline:'none' }}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-2">
        {[
          { label:'Factura Actual', value:`Bs ${actual.total.toFixed(2)}`, color:'#60a5fa' },
          { label:'Factura Nueva',  value:`Bs ${nueva.total.toFixed(2)}`,  color: delta > 0 ? '#f87171' : '#34d399' },
          { label:'Diferencia',     value:`${delta > 0 ? '+' : ''}Bs ${delta.toFixed(2)} (${pct}%)`, color: delta > 0 ? '#f87171' : '#34d399' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 text-center"
            style={{ background:'rgba(30,45,69,0.4)', border:'1px solid #1e2d45' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color:'#4b5875' }}>{label}</p>
            <p className="metric-value text-lg font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Desglose tramos */}
      <div className="rounded-xl overflow-hidden" style={{ border:'1px solid #1e2d45' }}>
        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
          style={{ background:'rgba(13,19,32,0.8)', color:'#4b5875' }}>
          Desglose por tramos · Categoría nueva: {catNueva}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom:'1px solid #1e2d45' }}>
              {['Tramo','m³','Precio/m³','Subtotal'].map(h => (
                <th key={h} className="px-4 py-2 text-left font-bold uppercase tracking-wider"
                  style={{ color:'#4b5875', fontSize:10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nueva.desglose.map(t => (
              <tr key={t.tramo} style={{ borderBottom:'1px solid rgba(30,45,69,0.4)' }}>
                <td className="px-4 py-2 font-bold" style={{ color:'#60a5fa' }}>Tramo {t.tramo}</td>
                <td className="px-4 py-2 metric-value" style={{ color:'#f0f6ff' }}>{t.m3}</td>
                <td className="px-4 py-2" style={{ color:'#94a3b8' }}>Bs {t.precio}</td>
                <td className="px-4 py-2 font-bold" style={{ color:'#34d399' }}>Bs {t.subtotal.toFixed(2)}</td>
              </tr>
            ))}
            <tr style={{ background:'rgba(59,130,246,0.05)' }}>
              <td className="px-4 py-2 font-bold text-white" colSpan={3}>Cargo Fijo</td>
              <td className="px-4 py-2 font-bold" style={{ color:'#60a5fa' }}>Bs {nueva.cargo_fijo}</td>
            </tr>
            <tr style={{ background:'rgba(59,130,246,0.08)' }}>
              <td className="px-4 py-2 font-bold text-white text-sm" colSpan={3}>TOTAL</td>
              <td className="px-4 py-2 metric-value text-base font-bold" style={{ color:'#60a5fa' }}>Bs {nueva.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AccountabilityDashboard() {
  const [tab, setTab] = useState<'cierre' | 'morosos' | 'simulador'>('cierre');

  const ultimo = CIERRE_FINANCIERO_6M[CIERRE_FINANCIERO_6M.length - 1];
  const eficiencia = ((ultimo.cobrado / ultimo.facturado) * 100).toFixed(1);
  const totalIncobrables = CIERRE_FINANCIERO_6M.reduce((s, m) => s + m.incobrables, 0);
  const totalMorosos = TOP_MOROSOS.reduce((s, m) => s + m.deudaTotal, 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color:'#10b981' }}>
            Dpto. de Contabilidad · Cierre Mensual
          </p>
          <h1 className="text-2xl font-bold text-white">Dashboard Financiero</h1>
          <p className="text-sm mt-0.5" style={{ color:'#4b5875' }}>
            Cierre mensual Día 10 · Semestre Dic-2024 – May-2025
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-xs">
          <Download className="w-3.5 h-3.5" /> Exportar Cierre
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Facturado May-2025', value:`Bs ${(ultimo.facturado/1e6).toFixed(2)}M`,  color:'#3b82f6',  icon: DollarSign },
          { label:'Cobrado May-2025',   value:`Bs ${(ultimo.cobrado/1e6).toFixed(2)}M`,   color:'#10b981',  icon: TrendingDown },
          { label:'Eficiencia Cobro',   value:`${eficiencia}%`,                            color:'#a78bfa',  icon: FileText },
          { label:'Incobrables 6M',     value:`Bs ${(totalIncobrables/1e6).toFixed(2)}M`, color:'#ef4444',  icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }, i) => (
          <div key={label} className="glass-card rounded-xl p-5 animate-slide-up"
            style={{ animationDelay:`${i*80}ms` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color:'#4b5875' }}>{label}</p>
            <p className="metric-value text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'#0d1320', border:'1px solid #1e2d45' }}>
        {(['cierre','morosos','simulador'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              background: tab===t ? 'linear-gradient(135deg,#065f46,#0891b2)' : 'transparent',
              color: tab===t ? '#ffffff' : '#4b5875',
            }}>
            {t === 'cierre' ? '📊 Cierre 6 Meses' : t === 'morosos' ? '⚠️ Ranking Morosos' : '🧮 Simulador Tarifa'}
          </button>
        ))}
      </div>

      {/* Tab: Cierre */}
      {tab === 'cierre' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="glass-card rounded-xl p-5" style={{ border:'1px solid #1e2d45' }}>
            <h3 className="text-sm font-bold text-white mb-4">Facturado vs Cobrado · 6 Meses</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={CIERRE_FINANCIERO_6M} margin={{ top:0, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="month" tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v/1e6).toFixed(1)}M`} tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend formatter={(v) => <span style={{ color:'#94a3b8', fontSize:11 }}>{v}</span>} />
                <Bar dataKey="facturado" name="Facturado (Bs)" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.85} />
                <Bar dataKey="cobrado"   name="Cobrado (Bs)"   fill="#10b981" radius={[4,4,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-5" style={{ border:'1px solid #1e2d45' }}>
            <h3 className="text-sm font-bold text-white mb-4">Pendiente e Incobrables · Tendencia</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={CIERRE_FINANCIERO_6M} margin={{ top:0, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="month" tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v/1e3).toFixed(0)}K`} tick={{ fill:'#4b5875', fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend formatter={(v) => <span style={{ color:'#94a3b8', fontSize:11 }}>{v}</span>} />
                <Line type="monotone" dataKey="pendiente"    name="Pendiente (Bs)"   stroke="#f59e0b" strokeWidth={2} dot={{ r:3 }} />
                <Line type="monotone" dataKey="incobrables"  name="Incobrables (Bs)" stroke="#ef4444" strokeWidth={2} dot={{ r:3 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla cierre */}
          <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden" style={{ border:'1px solid #1e2d45' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Período','Facturado Bs','Cobrado Bs','Pendiente Bs','Incobrables Bs','% Eficiencia'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {CIERRE_FINANCIERO_6M.map(m => {
                  const ef = ((m.cobrado / m.facturado) * 100).toFixed(1);
                  return (
                    <tr key={m.month}>
                      <td className="font-bold text-white">{m.month}</td>
                      <td style={{ color:'#60a5fa' }} className="metric-value">{m.facturado.toLocaleString()}</td>
                      <td style={{ color:'#34d399' }} className="metric-value">{m.cobrado.toLocaleString()}</td>
                      <td style={{ color:'#fbbf24' }} className="metric-value">{m.pendiente.toLocaleString()}</td>
                      <td style={{ color:'#f87171' }} className="metric-value">{m.incobrables.toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16" style={{ height:5 }}>
                            <div className="progress-bar-fill"
                              style={{ width:`${ef}%`, background:'linear-gradient(90deg,#10b981,#06b6d4)' }} />
                          </div>
                          <span className="metric-value text-xs font-bold text-white">{ef}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Morosos */}
      {tab === 'morosos' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color:'#fbbf24' }} />
            <p className="text-sm" style={{ color:'#fbbf24' }}>
              <strong>{TOP_MOROSOS.length} contratos</strong> morosos identificados · Deuda total:&nbsp;
              <strong>Bs {totalMorosos.toLocaleString()}</strong> · Filtrado por Zona y Distrito via Cassandra
            </p>
          </div>
          <div className="glass-card rounded-xl overflow-hidden" style={{ border:'1px solid #1e2d45' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['#','Contrato','Nombre / Empresa','Zona','D','Categoría','Deuda Bs','Meses','Último Pago','Serie Medidor'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...TOP_MOROSOS]
                  .sort((a,b) => b.deudaTotal - a.deudaTotal)
                  .map((m, i) => (
                    <tr key={m.contrato}>
                      <td className="font-bold" style={{ color:'#4b5875' }}>#{i+1}</td>
                      <td className="font-mono text-xs" style={{ color:'#60a5fa' }}>{m.contrato}</td>
                      <td className="font-bold text-white max-w-[160px] truncate">{m.nombre}</td>
                      <td style={{ color:'#94a3b8' }}>{m.zona}</td>
                      <td style={{ color:'#94a3b8' }}>D-{m.distrito}</td>
                      <td>
                        <span className="badge badge-purple text-[9px]">{m.categoria}</span>
                      </td>
                      <td className="metric-value font-bold" style={{ color:'#f87171' }}>
                        {m.deudaTotal.toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge text-[10px] ${m.mesesDeuda >= 9 ? 'badge-red' : m.mesesDeuda >= 6 ? 'badge-amber' : 'badge-blue'}`}>
                          {m.mesesDeuda}m
                        </span>
                      </td>
                      <td className="font-mono text-xs" style={{ color:'#4b5875' }}>{m.ultimoPago}</td>
                      <td className="font-mono text-xs" style={{ color:'#4b5875' }}>{m.medidorSerie}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Simulador */}
      {tab === 'simulador' && (
        <div className="animate-fade-in">
          <SimuladorImpacto />
        </div>
      )}
    </div>
  );
}
