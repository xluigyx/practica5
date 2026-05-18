import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, TrendingDown, AlertTriangle, FileText, Download, Filter, ChevronRight } from 'lucide-react';
import { cn, esConsumoExcesivo } from '@/src/lib/utils';
import { calcularFactura, CIERRE_6M, MOROSOS, TARIFARIO, CATEGORIAS_LIST } from '@/src/lib/semapa-data';
import type { TarifaCategoria } from '@/src/lib/types';

const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-xs shadow-xl">
      <p className="font-bold text-on-surface-variant mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color:p.color }} className="font-semibold">
          {p.name}: <span className="text-on-surface">Bs {p.value?.toLocaleString?.()}</span>
        </p>
      ))}
    </div>
  );
};

// Simulador tarifario con lógica real de Tarifario.csv
function SimuladorTarifario() {
  const [consumo, setConsumo]       = useState(28);
  const [catActual, setCatActual]   = useState<TarifaCategoria>('R3-Residencial');
  const [catNueva, setCatNueva]     = useState<TarifaCategoria>('R4-Residencial Alta');
  const facturaActual = calcularFactura(catActual, consumo);
  const facturaNueva  = calcularFactura(catNueva,  consumo);
  const delta         = facturaNueva.total - facturaActual.total;
  const pct           = facturaActual.total > 0 ? ((delta/facturaActual.total)*100).toFixed(1) : '0';

  return (
    <div className="glass-card rounded-xl p-5 border border-outline-variant space-y-4">
      <div>
        <h3 className="text-sm font-bold text-on-surface">Simulador de Impacto Tarifario</h3>
        <p className="text-xs text-on-surface-variant mt-0.5">Basado en Tarifario.csv — 9 categorías SEMAPA</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">Consumo (m³)</label>
          <input type="number" min={1} max={500} value={consumo}
            onChange={e => setConsumo(Number(e.target.value))}
            className="w-full rounded-lg px-3 py-2 text-sm font-bold bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary outline-none" />
          {esConsumoExcesivo(consumo) && (
            <p className="text-[10px] mt-1 font-bold text-error">⚠ Excesivo ONU (&gt;45m³)</p>
          )}
        </div>
        {[{ label:'Categoría Actual', val:catActual, set:setCatActual }, { label:'Categoría Nueva', val:catNueva, set:setCatNueva }].map(({label,val,set})=>(
          <div key={label}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">{label}</label>
            <select value={val} onChange={e=>set(e.target.value as TarifaCategoria)}
              className="w-full rounded-lg px-3 py-2 text-xs font-bold bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary outline-none">
              {CATEGORIAS_LIST.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { l:'Factura Actual', v:`Bs ${facturaActual.total.toFixed(2)}`, c:'#60a5fa' },
          { l:'Factura Nueva',  v:`Bs ${facturaNueva.total.toFixed(2)}`,  c: delta>0?'#f87171':'#34d399' },
          { l:'Diferencia',     v:`${delta>0?'+':''}Bs ${delta.toFixed(2)} (${pct}%)`, c: delta>0?'#f87171':'#34d399' },
        ].map(({l,v,c})=>(
          <div key={l} className="bg-surface-container-low rounded-xl p-4 text-center border border-outline-variant">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">{l}</p>
            <p className="text-lg font-bold font-mono" style={{color:c}}>{v}</p>
          </div>
        ))}
      </div>

      {/* Desglose por tramos */}
      <div className="rounded-xl overflow-hidden border border-outline-variant">
        <div className="px-4 py-2 bg-surface-container-low text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Desglose Tramos · {catNueva} · Cargo fijo: Bs {TARIFARIO[catNueva].cargo_fijo} (12m³ base)
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-outline-variant">
            {['Tramo','m³','Precio/m³','Subtotal'].map(h=><th key={h} className="px-4 py-2 text-left font-bold text-on-surface-variant">{h}</th>)}
          </tr></thead>
          <tbody>
            {facturaNueva.desglose.map(t=>(
              <tr key={t.tramo} className="border-b border-outline-variant/50">
                <td className="px-4 py-2 font-bold text-primary">Tramo {t.tramo}</td>
                <td className="px-4 py-2 font-mono text-on-surface">{t.m3}</td>
                <td className="px-4 py-2 text-on-surface-variant">Bs {t.precio}</td>
                <td className="px-4 py-2 font-bold text-secondary font-mono">Bs {t.subtotal.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-surface-container-low/30">
              <td className="px-4 py-2 font-bold text-on-surface" colSpan={3}>TOTAL</td>
              <td className="px-4 py-2 font-bold text-primary font-mono text-sm">Bs {facturaNueva.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AccountabilityDashboard() {
  const [tab, setTab] = useState<'cierre'|'morosos'|'simulador'>('cierre');

  const ultimo     = CIERRE_6M[CIERRE_6M.length-1];
  const eficiencia = ((ultimo.cobrado/ultimo.facturado)*100).toFixed(1);
  const totalInc   = CIERRE_6M.reduce((s,m)=>s+m.incobrables,0);
  const totalMor   = MOROSOS.reduce((s,m)=>s+m.deudaTotal,0);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#34d399'}}>Contabilidad · Cierre Mensual Día 10</span>
          <h2 className="text-2xl font-bold text-on-surface mt-0.5">Dashboard Financiero SEMAPA</h2>
          <p className="text-sm text-on-surface-variant">Semestre Dic-2024 – May-2025</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold hover:brightness-110 transition-all">
          <Download className="w-4 h-4"/> Exportar Cierre
        </button>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Facturado May-2025', value:`Bs ${(ultimo.facturado/1e6).toFixed(2)}M`,  icon:DollarSign,   color:'#3b82f6' },
          { label:'Cobrado May-2025',   value:`Bs ${(ultimo.cobrado/1e6).toFixed(2)}M`,    icon:FileText,     color:'#10b981' },
          { label:'Eficiencia Cobro',   value:`${eficiencia}%`,                             icon:TrendingDown, color:'#a78bfa' },
          { label:'Incobrables 6M',     value:`Bs ${(totalInc/1e6).toFixed(2)}M`,          icon:AlertTriangle,color:'#ef4444' },
        ].map(({label,value,icon:Icon,color})=>(
          <div key={label} className="glass-card rounded-xl p-5 border border-outline-variant">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{background:`${color}18`,border:`1px solid ${color}30`}}>
              <Icon className="w-4 h-4" style={{color}}/>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-bold text-on-surface font-mono">{value}</p>
          </div>
        ))}
      </section>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-container-low border border-outline-variant rounded-xl">
        {(['cierre','morosos','simulador'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={cn('flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
              tab===t?'bg-primary text-on-primary shadow-sm':'text-on-surface-variant hover:text-on-surface')}>
            {t==='cierre'?'📊 Cierre 6 Meses':t==='morosos'?'⚠ Ranking Morosos':'🧮 Simulador Tarifa'}
          </button>
        ))}
      </div>

      {/* Tab: Cierre */}
      {tab==='cierre'&&(
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-5 border border-outline-variant">
              <h3 className="text-sm font-bold text-on-surface mb-4">Facturado vs Cobrado · 6 Meses</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={CIERRE_6M} margin={{top:0,right:10,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/>
                  <XAxis dataKey="periodo" tick={{fill:'#4b5875',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/1e6).toFixed(1)}M`} tick={{fill:'#4b5875',fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<DarkTip/>}/>
                  <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                  <Bar dataKey="facturado" name="Facturado (Bs)" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.85}/>
                  <Bar dataKey="cobrado"   name="Cobrado (Bs)"   fill="#10b981" radius={[4,4,0,0]} opacity={0.85}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card rounded-xl p-5 border border-outline-variant">
              <h3 className="text-sm font-bold text-on-surface mb-4">Pendiente e Incobrables — Tendencia</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={CIERRE_6M} margin={{top:0,right:10,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/>
                  <XAxis dataKey="periodo" tick={{fill:'#4b5875',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/1e3).toFixed(0)}K`} tick={{fill:'#4b5875',fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<DarkTip/>}/>
                  <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                  <Line type="monotone" dataKey="pendiente"   name="Pendiente (Bs)"   stroke="#f59e0b" strokeWidth={2} dot={{r:3}}/>
                  <Line type="monotone" dataKey="incobrables" name="Incobrables (Bs)" stroke="#ef4444" strokeWidth={2} dot={{r:3}} strokeDasharray="5 3"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla cierre */}
          <div className="glass-card rounded-xl overflow-hidden border border-outline-variant">
            <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low/30">
              <h3 className="text-sm font-bold text-on-surface">Cierre Mensual — Día 10 de cada mes</h3>
            </div>
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low/50">
                <tr>{['Período','Facturado Bs','Cobrado Bs','Pendiente Bs','Incobrables Bs','Eficiencia'].map(h=><th key={h} className="px-5 py-4">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {CIERRE_6M.map(m=>(
                  <tr key={m.periodo} className="hover:bg-surface-container transition-colors">
                    <td className="px-5 py-3 font-bold text-on-surface">{m.periodo}</td>
                    <td className="px-5 py-3 font-mono font-bold text-primary">{m.facturado.toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono font-bold text-secondary">{m.cobrado.toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono text-amber-400">{m.pendiente.toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono text-error">{m.incobrables.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{width:`${m.eficiencia}%`}}/>
                        </div>
                        <span className="text-xs font-bold font-mono text-on-surface">{m.eficiencia}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Morosos */}
      {tab==='morosos'&&(
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0"/>
            <p className="text-sm text-amber-300">
              <strong>{MOROSOS.length} contratos</strong> morosos · Deuda total: <strong>Bs {totalMor.toLocaleString()}</strong>
            </p>
          </div>
          <div className="glass-card rounded-xl overflow-hidden border border-outline-variant">
            <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">Ranking de Morosos</h3>
              <Filter className="w-4 h-4 text-on-surface-variant cursor-pointer hover:text-primary"/>
            </div>
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low/50">
                <tr>{['#','Contrato','Nombre','Zona','D','Categoría','Deuda Bs','Meses','Último Pago','Medidor'].map(h=><th key={h} className="px-5 py-4">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {[...MOROSOS].sort((a,b)=>b.deudaTotal-a.deudaTotal).map((m,i)=>(
                  <tr key={m.contrato} className="hover:bg-surface-container transition-colors">
                    <td className="px-5 py-3 font-bold text-on-surface-variant">#{i+1}</td>
                    <td className="px-5 py-3 font-mono text-xs font-bold text-primary">{m.contrato}</td>
                    <td className="px-5 py-3 font-bold text-sm text-on-surface max-w-[160px] truncate">{m.nombre}</td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant">{m.zona}</td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant">D-{m.distritoId}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold bg-surface-container-high text-on-surface px-2 py-0.5 rounded">{m.categoria}</span>
                    </td>
                    <td className="px-5 py-3 font-bold font-mono text-error">{m.deudaTotal.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                        m.mesesDeuda>=9?'bg-error-container/20 text-error':m.mesesDeuda>=6?'bg-amber-500/10 text-amber-400':'bg-surface-container-high text-on-surface-variant')}>
                        {m.mesesDeuda}m
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{m.ultimoPago}</td>
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{m.medidorSerie}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Simulador */}
      {tab==='simulador'&&(
        <div className="animate-in fade-in duration-300 pb-8">
          <SimuladorTarifario/>
        </div>
      )}
    </div>
  );
}
