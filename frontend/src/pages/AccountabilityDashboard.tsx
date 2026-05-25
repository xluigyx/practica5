import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { DollarSign, TrendingDown, AlertTriangle, FileText, Download, Filter, Coins, RefreshCw, Copy, ExternalLink, Send, Check, BarChart2, Calculator, CreditCard, Wallet } from 'lucide-react';
import { cn, esConsumoExcesivo } from '@/src/lib/utils';
import { calcularFactura, TARIFARIO, CATEGORIAS_LIST } from '@/src/lib/semapa-data';
import type { TarifaCategoria, CierreMensual, Moroso } from '@/src/lib/types';
import { api } from '@/src/lib/api';
import type { CierreRaw, MorosoRaw, Consulta22Row, Consulta23Row } from '@/src/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function formatPeriodo(raw: string): string {
  const [y, m] = raw.split('-');
  return `${MESES_ES[parseInt(m,10)-1]}-${y}`;
}
function mapCierre(r: CierreRaw): CierreMensual {
  return {periodo:formatPeriodo(r.periodo),facturado:r.facturado,cobrado:r.cobrado,pendiente:r.pendiente,incobrables:r.incobrables,eficiencia:r.eficiencia};
}
function mapMoroso(r: MorosoRaw): Moroso {
  return {contrato:r.contrato,nombre:r.nombre,zona:r.zona,distritoId:r.distrito_id,categoria:r.categoria as TarifaCategoria,deudaTotal:r.deuda_total,mesesDeuda:r.meses_deuda,ultimoPago:r.ultimo_pago,medidorSerie:r.medidor_serie};
}

interface PagoBnbItem {
  contrato:string; timestamp_ts:string; meses_pagados:number;
  monto_bs:number; monto_bnb:number; tx_hash:string; estado:string;
}
interface DespachoItem {
  contrato:string; timestamp_ts:string; canal:string;
  periodo:string; destino:string; mensaje:string; estado:string;
}

const DarkTip = ({active,payload,label}: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 text-xs shadow-xl border border-outline-variant/50">
      <p className="font-bold text-on-surface-variant mb-2 text-[10px] uppercase tracking-wide">{label}</p>
      {payload.map((p:any,i:number)=>(
        <p key={i} style={{color:p.color}} className="font-semibold mt-0.5">
          {p.name}: <span className="text-on-surface">Bs {p.value?.toLocaleString?.()}</span>
        </p>
      ))}
    </div>
  );
};

const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#a78bfa','#06b6d4','#f97316','#84cc16','#ec4899'];

// ── Simulador tarifario ───────────────────────────────────────────────────────
function SimuladorTarifario() {
  const [consumo, setConsumo]     = useState(28);
  const [catActual, setCatActual] = useState<TarifaCategoria>('R3-Residencial');
  const [catNueva, setCatNueva]   = useState<TarifaCategoria>('R4-Residencial Alta');
  const facturaActual = calcularFactura(catActual, consumo);
  const facturaNueva  = calcularFactura(catNueva,  consumo);
  const delta = facturaNueva.total - facturaActual.total;
  const pct   = facturaActual.total > 0 ? ((delta/facturaActual.total)*100).toFixed(1) : '0';

  return (
    <div className="glass-card rounded-2xl p-6 border border-outline-variant space-y-5">
      <div>
        <div className="section-title mb-0.5">
          <h3 className="text-sm font-bold text-on-surface">Simulador de Impacto Tarifario</h3>
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5 ml-3.5">Basado en Tarifario.csv — 9 categorías SEMAPA</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">Consumo (m³)</label>
          <input type="number" min={1} max={500} value={consumo}
            onChange={e=>setConsumo(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-bold bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary outline-none transition-colors"/>
          {esConsumoExcesivo(consumo) && (
            <p className="text-[10px] mt-1.5 font-bold text-error flex items-center gap-1">
              <AlertTriangle className="w-3 h-3"/> Excesivo ONU (&gt;45m³)
            </p>
          )}
        </div>
        {[{label:'Categoría Actual',val:catActual,set:setCatActual},{label:'Categoría Nueva',val:catNueva,set:setCatNueva}].map(({label,val,set})=>(
          <div key={label}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">{label}</label>
            <select value={val} onChange={e=>set(e.target.value as TarifaCategoria)}
              className="w-full rounded-xl px-3 py-2.5 text-xs font-bold bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary outline-none transition-colors">
              {CATEGORIAS_LIST.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {l:'Factura Actual', v:`Bs ${facturaActual.total.toFixed(2)}`, c:'#3b82f6', icon:'💧'},
          {l:'Factura Nueva',  v:`Bs ${facturaNueva.total.toFixed(2)}`,  c:delta>0?'#ef4444':'#10b981', icon:delta>0?'📈':'📉'},
          {l:'Diferencia',     v:`${delta>0?'+':''}Bs ${delta.toFixed(2)} (${pct}%)`, c:delta>0?'#ef4444':'#10b981', icon:delta>0?'⬆':'⬇'},
        ].map(({l,v,c,icon})=>(
          <div key={l} className="rounded-2xl p-4 text-center" style={{background:`${c}08`,border:`1px solid ${c}20`}}>
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{l}</p>
            <p className="text-lg font-extrabold font-mono" style={{color:c}}>{v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden border border-outline-variant">
        <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant"
             style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
          Desglose Tramos · {catNueva} · Cargo fijo: Bs {TARIFARIO[catNueva].cargo_fijo} (12m³ base)
        </div>
        <table className="w-full text-xs data-table">
          <thead>
            <tr>{['Tramo','m³','Precio/m³','Subtotal'].map(h=><th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {facturaNueva.desglose.map(t=>(
              <tr key={t.tramo}>
                <td className="px-4 py-2.5 font-bold text-primary">Tramo {t.tramo}</td>
                <td className="px-4 py-2.5 font-mono text-on-surface">{t.m3}</td>
                <td className="px-4 py-2.5 text-on-surface-variant">Bs {t.precio}</td>
                <td className="px-4 py-2.5 font-bold text-secondary font-mono">Bs {t.subtotal.toFixed(2)}</td>
              </tr>
            ))}
            <tr style={{background:'rgba(0,52,111,0.03)'}}>
              <td className="px-4 py-3 font-bold text-on-surface" colSpan={3}>TOTAL</td>
              <td className="px-4 py-3 font-extrabold text-primary font-mono text-sm">Bs {facturaNueva.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Consultas financieras 22 + 23 ─────────────────────────────────────────────
function ConsultasFinancieroTab() {
  const [q22, setQ22]           = useState<Consulta22Row[]>([]);
  const [q22total, setQ22total] = useState(0);
  const [q23, setQ23]           = useState<Consulta23Row[]>([]);
  const [q23total, setQ23total] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    Promise.all([api.consulta22(), api.consulta23(25)])
      .then(([res22,res23]) => {
        setQ22(res22.data); setQ22total(res22.total_bs);
        setQ23(res23.data); setQ23total(res23.total);
        setLoading(false);
      })
      .catch(()=>{setError(true);setLoading(false);});
  }, []);

  if (loading) return (
    <div className="glass-card rounded-2xl p-12 flex items-center justify-center border border-outline-variant">
      <div className="flex items-center gap-3 text-on-surface-variant">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"/>
        <span className="text-sm">Ejecutando consultas analíticas en Cassandra…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="glass-card rounded-2xl p-6 border border-red-200/50 bg-red-50/30">
      <p className="text-sm text-error font-bold">Error al ejecutar consultas 22 y 23 — verifica conexión con Cassandra</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-8">
      <div className="section-title">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary"/>
            <h3 className="text-base font-bold text-on-surface">Consultas Analíticas</h3>
            <span className="text-[10px] font-bold chip-blue px-2.5 py-0.5 rounded-full">
              Consulta 22 · Consulta 23
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5 ml-6">Ingresos tarifarios · Consumo mínimo facturable</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-outline-variant space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Consulta 22</p>
            <h4 className="text-sm font-bold text-on-surface">Proyección de Ingresos por Categoría</h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Período activo · Total: <span className="font-bold text-secondary">Bs {q22total.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
            </p>
          </div>
          {q22.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-on-surface-variant text-sm">
              Sin lecturas en Cassandra para proyectar ingresos
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={q22} margin={{top:0,right:10,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
                  <XAxis dataKey="alias" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}K`} tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<DarkTip/>}/>
                  <Bar dataKey="ingresos_bs" name="Ingresos Bs" radius={[4,4,0,0]} opacity={0.9}>
                    {q22.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-auto" style={{maxHeight:140}}>
                <table className="w-full text-xs data-table">
                  <thead>
                    <tr>{['Categoría','Consumo m³','Ingresos Bs'].map(h=><th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {q22.map((r,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2 font-bold" style={{color:PIE_COLORS[i%PIE_COLORS.length]}}>{r.categoria}</td>
                        <td className="px-3 py-2 font-mono text-on-surface-variant">{r.consumo_m3.toLocaleString()}</td>
                        <td className="px-3 py-2 font-mono font-bold text-secondary">Bs {r.ingresos_bs.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden border border-outline-variant flex flex-col">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between"
               style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Consulta 23</p>
              <h4 className="text-sm font-bold text-on-surface">Clientes a Cobrar Consumo Mínimo (12 m³)</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">Residencial · Consumo real &lt; 12 m³</p>
            </div>
            {q23total > 0 && (
              <span className="text-[10px] font-bold chip-amber px-2.5 py-1 rounded-xl">
                {q23total.toLocaleString()} contratos
              </span>
            )}
          </div>
          {q23.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm p-8">
              Sin contratos con consumo por debajo del mínimo facturable
            </div>
          ) : (
            <div className="overflow-auto flex-1" style={{maxHeight:360}}>
              <table className="w-full text-left text-xs data-table">
                <thead>
                  <tr><th>Contrato</th><th>Nombre</th><th>Cat.</th><th className="text-right">Real m³</th><th className="text-right">Cobrar Bs</th></tr>
                </thead>
                <tbody>
                  {q23.map((r,i)=>(
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">{r.contrato}</td>
                      <td className="px-4 py-2.5 text-on-surface max-w-[120px] truncate">{r.nombre}</td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-bold bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded-full">{r.categoria}</span></td>
                      <td className="px-4 py-2.5 font-mono text-amber-500 text-right font-bold">{r.consumo_real_m3}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-secondary text-right">Bs {r.monto_bs.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard principal ────────────────────────────────────────────────────────
export default function AccountabilityDashboard() {
  const [tab, setTab] = useState<'cierre'|'morosos'|'simulador'|'cripto'|'consultas'>('cierre');

  const [cierreData, setCierreData]   = useState<CierreMensual[]>([]);
  const [morososData, setMorososData] = useState<Moroso[]>([]);
  const [cierreStatus, setCierreStatus] = useState<'loading'|'ready'|'empty'|'error'>('loading');

  const [pagosCripto, setPagosCripto]       = useState<PagoBnbItem[]>([]);
  const [notificaciones, setNotificaciones] = useState<DespachoItem[]>([]);
  const [loadingCripto, setLoadingCripto]   = useState(false);
  const [copiedTx, setCopiedTx] = useState<string|null>(null);

  useEffect(() => {
    Promise.all([api.cierre(), api.morosos()])
      .then(([cierreRaw,morososRaw]) => {
        const sorted = [...cierreRaw].sort((a,b)=>a.periodo.localeCompare(b.periodo));
        setCierreData(sorted.map(mapCierre));
        setMorososData(morososRaw.map(mapMoroso));
        setCierreStatus(sorted.length > 0 ? 'ready' : 'empty');
      })
      .catch(()=>setCierreStatus('error'));
  }, []);

  const fetchCriptoDatos = useCallback(async () => {
    setLoadingCripto(true);
    try {
      const [pRes,nRes] = await Promise.all([
        fetch(`${API_URL}/api/pagos/bnb/historial`),
        fetch(`${API_URL}/api/notificaciones/historial`),
      ]);
      if (pRes.ok) setPagosCripto(await pRes.json()); else setPagosCripto([]);
      if (nRes.ok) setNotificaciones(await nRes.json()); else setNotificaciones([]);
    } catch {
      setPagosCripto([]); setNotificaciones([]);
    } finally {
      setLoadingCripto(false);
    }
  }, []);

  useEffect(() => { if (tab==='cripto') fetchCriptoDatos(); }, [tab,fetchCriptoDatos]);

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedTx(hash);
    setTimeout(()=>setCopiedTx(null), 2000);
  };

  const totalBnbRecaudado = pagosCripto.reduce((s,p)=>s+(p.monto_bnb||0), 0);
  const totalBsCripto     = pagosCripto.reduce((s,p)=>s+(p.monto_bs||0),  0);
  const ultimo     = cierreData.length > 0 ? cierreData[cierreData.length-1] : null;
  const eficiencia = ultimo ? ((ultimo.cobrado/ultimo.facturado)*100).toFixed(1) : '—';
  const totalInc   = cierreData.reduce((s,m)=>s+m.incobrables, 0);
  const totalMor   = morososData.reduce((s,m)=>s+m.deudaTotal, 0);

  const dbBadge =
    cierreStatus==='ready'  ?{cls:'chip-teal',  dot:'bg-secondary animate-pulse', txt:'● Cassandra Online'}:
    cierreStatus==='empty'  ?{cls:'chip-amber', dot:'bg-amber-400',               txt:'● Sin datos en BD'} :
    cierreStatus==='error'  ?{cls:'chip-red',   dot:'bg-error',                   txt:'● Error de conexión'}:
                             {cls:'',           dot:'bg-outline-variant animate-ping', txt:'● Cargando…'};

  const TABS = [
    {id:'cierre'    as const, label:'Cierre 6M',        icon:<FileText className="w-3.5 h-3.5"/>},
    {id:'morosos'   as const, label:'Morosos',           icon:<AlertTriangle className="w-3.5 h-3.5"/>},
    {id:'simulador' as const, label:'Simulador Tarifa',  icon:<Calculator className="w-3.5 h-3.5"/>},
    {id:'cripto'    as const, label:'Criptopagos',       icon:<CreditCard className="w-3.5 h-3.5"/>},
    {id:'consultas' as const, label:'Consultas',         icon:<BarChart2 className="w-3.5 h-3.5"/>},
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">

      {/* ── Hero banner ─── */}
      <div className="dash-banner p-6">
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
              Contabilidad · Cierre Mensual Día 10
            </p>
            <h2 className="text-3xl font-extrabold text-on-surface leading-tight">Dashboard Financiero SEMAPA</h2>
            <p className="text-sm text-on-surface-variant mt-1.5">
              Cierre mensual · Morosos · Simulador · Apache Cassandra
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={cn('text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5', dbBadge.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', dbBadge.dot)}/>{dbBadge.txt}
            </span>
            <button className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-md shadow-primary/20">
              <Download className="w-4 h-4"/> Exportar Cierre
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {label:'Último Período',    value:ultimo?`Bs ${(ultimo.facturado/1e6).toFixed(2)}M`:'Sin datos', icon:DollarSign,    color:'#3b82f6'},
          {label:'Cobrado',           value:ultimo?`Bs ${(ultimo.cobrado/1e6).toFixed(2)}M`:'Sin datos',   icon:Wallet,        color:'#10b981'},
          {label:'Eficiencia Cobro',  value:`${eficiencia}%`,                                               icon:TrendingDown,  color:'#a78bfa'},
          {label:'Incobrables 6M',    value:`Bs ${(totalInc/1e6).toFixed(2)}M`,                            icon:AlertTriangle, color:'#ef4444'},
        ].map(({label,value,icon:Icon,color},i)=>(
          <div key={label} className="stat-card rounded-2xl p-5" style={{animationDelay:`${i*60}ms`}}>
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:`linear-gradient(90deg,${color},${color}50)`}}/>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${color}12`,border:`1px solid ${color}22`}}>
                <Icon className="w-5 h-5" style={{color}}/>
              </div>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-extrabold text-on-surface font-mono">{value}</p>
          </div>
        ))}
      </section>

      {/* ── Tabs ─── */}
      <div className="tab-bar flex gap-1 overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={cn('tab-item flex-1', tab===t.id?'tab-item-active':'tab-item-inactive')}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Cierre ─── */}
      {tab==='cierre'&&(
        <div className="space-y-6 animate-in fade-in duration-300">
          {cierreData.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 flex items-center justify-center border border-outline-variant">
              <p className="text-sm text-on-surface-variant">
                {cierreStatus==='loading'?'Cargando datos de cierre…':
                 cierreStatus==='empty'  ?'Tabla cierre_mensual vacía en Cassandra':
                 'Error de conexión con Cassandra'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card rounded-2xl p-5 border border-outline-variant">
                  <div className="section-title mb-1">
                    <h3 className="text-sm font-bold text-on-surface">Facturado vs Cobrado · 6 Meses</h3>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4 ml-3.5">Comparativa mensual desde Cassandra</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={cierreData} margin={{top:0,right:10,left:-10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
                      <XAxis dataKey="periodo" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tickFormatter={v=>`${(v/1e6).toFixed(1)}M`} tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<DarkTip/>}/>
                      <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                      <Bar dataKey="facturado" name="Facturado (Bs)" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.85}/>
                      <Bar dataKey="cobrado"   name="Cobrado (Bs)"   fill="#10b981" radius={[4,4,0,0]} opacity={0.85}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-outline-variant">
                  <div className="section-title mb-1">
                    <h3 className="text-sm font-bold text-on-surface">Pendiente e Incobrables — Tendencia</h3>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4 ml-3.5">Evolución de deuda no cobrada</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={cierreData} margin={{top:0,right:10,left:-10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,211,0.4)"/>
                      <XAxis dataKey="periodo" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tickFormatter={v=>`${(v/1e3).toFixed(0)}K`} tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<DarkTip/>}/>
                      <Legend formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                      <Line type="monotone" dataKey="pendiente"   name="Pendiente (Bs)"   stroke="#f59e0b" strokeWidth={2.5} dot={{r:4,fill:'#f59e0b'}}/>
                      <Line type="monotone" dataKey="incobrables" name="Incobrables (Bs)" stroke="#ef4444" strokeWidth={2.5} dot={{r:4,fill:'#ef4444'}} strokeDasharray="5 3"/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden border border-outline-variant">
                <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between"
                     style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
                  <div className="section-title mb-0">
                    <h3 className="text-sm font-bold text-on-surface">Cierre Mensual — Día 10 de cada mes</h3>
                  </div>
                </div>
                <table className="w-full text-left data-table">
                  <thead>
                    <tr>{['Período','Facturado Bs','Cobrado Bs','Pendiente Bs','Incobrables Bs','Eficiencia'].map(h=><th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {cierreData.map(m=>(
                      <tr key={m.periodo}>
                        <td className="px-5 py-3 font-bold text-on-surface">{m.periodo}</td>
                        <td className="px-5 py-3 font-mono font-bold text-primary">{m.facturado.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono font-bold text-secondary">{m.cobrado.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono text-amber-500 font-semibold">{m.pendiente.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono text-error font-semibold">{m.incobrables.toLocaleString()}</td>
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
            </>
          )}
        </div>
      )}

      {/* ── Tab: Morosos ─── */}
      {tab==='morosos'&&(
        <div className="space-y-5 animate-in fade-in duration-300">
          {morososData.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 flex items-center justify-center border border-outline-variant">
              <p className="text-sm text-on-surface-variant">
                {cierreStatus==='loading'?'Cargando morosos…':
                 cierreStatus==='empty'  ?'Tabla morosos vacía en Cassandra':
                 'Sin morosos registrados'}
              </p>
            </div>
          ) : (
            <>
              {/* Summary banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card rounded-2xl p-4">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:'linear-gradient(90deg,#ef4444,#ef444450)'}}/>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Morosos</p>
                  <p className="text-3xl font-extrabold text-error">{morososData.length}</p>
                  <p className="text-xs text-on-surface-variant mt-1">contratos en mora</p>
                </div>
                <div className="stat-card rounded-2xl p-4">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:'linear-gradient(90deg,#f59e0b,#f59e0b50)'}}/>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Deuda Total</p>
                  <p className="text-2xl font-extrabold text-amber-500 font-mono">Bs {(totalMor/1e6).toFixed(2)}M</p>
                  <p className="text-xs text-on-surface-variant mt-1">{totalMor.toLocaleString()} bolivianos</p>
                </div>
                <div className="stat-card rounded-2xl p-4">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:'linear-gradient(90deg,#a78bfa,#a78bfa50)'}}/>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Deuda Promedio</p>
                  <p className="text-2xl font-extrabold text-purple-500 font-mono">
                    Bs {morososData.length>0?(totalMor/morososData.length).toLocaleString(undefined,{maximumFractionDigits:0}):'0'}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">por contrato moroso</p>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden border border-outline-variant">
                <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between"
                     style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
                  <div className="section-title mb-0">
                    <h3 className="text-sm font-bold text-on-surface">Ranking de Morosos</h3>
                  </div>
                  <Filter className="w-4 h-4 text-on-surface-variant cursor-pointer hover:text-primary transition-colors"/>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left data-table">
                    <thead>
                      <tr>{['#','Contrato','Nombre','Zona','D','Categoría','Deuda Bs','Meses','Último Pago'].map(h=><th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[...morososData].sort((a,b)=>b.deudaTotal-a.deudaTotal).map((m,i)=>(
                        <tr key={m.contrato}>
                          <td className="px-5 py-3">
                            <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black',
                              i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'text-on-surface-variant')}
                              style={i>2?{background:'rgba(0,52,111,0.08)'}:{}}>{i+1}</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs font-bold text-primary">{m.contrato}</td>
                          <td className="px-5 py-3 font-bold text-sm text-on-surface max-w-[160px] truncate">{m.nombre}</td>
                          <td className="px-5 py-3 text-xs text-on-surface-variant">{m.zona}</td>
                          <td className="px-5 py-3 text-xs text-on-surface-variant">D-{m.distritoId}</td>
                          <td className="px-5 py-3">
                            <span className="text-[9px] font-bold bg-surface-container-high text-on-surface px-2 py-0.5 rounded-full">{m.categoria}</span>
                          </td>
                          <td className="px-5 py-3 font-bold font-mono text-error">{m.deudaTotal.toLocaleString()}</td>
                          <td className="px-5 py-3">
                            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full',
                              m.mesesDeuda>=9?'chip-red':m.mesesDeuda>=6?'chip-amber':'chip-teal')}>
                              {m.mesesDeuda}m
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{m.ultimoPago}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Simulador ─── */}
      {tab==='simulador'&&(
        <div className="animate-in fade-in duration-300 pb-8">
          <SimuladorTarifario/>
        </div>
      )}

      {/* ── Tab: Cripto ─── */}
      {tab==='cripto'&&(
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card rounded-2xl p-5">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:'linear-gradient(90deg,#f59e0b,#f59e0b50)'}}/>
              <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total BNB Recaudado</p>
                <div className="w-8 h-8 rounded-xl bg-yellow-500/12 border border-yellow-500/20 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-yellow-500 animate-pulse"/>
                </div>
              </div>
              <p className="text-xl font-extrabold text-yellow-500 font-mono">{totalBnbRecaudado.toFixed(6)}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">BNB (Binance)</p>
            </div>
            <div className="stat-card rounded-2xl p-5">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:'linear-gradient(90deg,#00346f,#00346f50)'}}/>
              <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Equivalente Bolivianos</p>
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary"/>
                </div>
              </div>
              <p className="text-xl font-extrabold text-primary font-mono">Bs {totalBsCripto.toFixed(2)}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Bolivianos</p>
            </div>
            <div className="stat-card rounded-2xl p-5">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:'linear-gradient(90deg,#10b981,#10b98150)'}}/>
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Auditoría Cripto</p>
                <button onClick={fetchCriptoDatos} disabled={loadingCripto}
                  className="flex items-center gap-1.5 text-xs text-primary font-bold hover:brightness-110 active:scale-95 transition-all">
                  <RefreshCw className={cn("w-3.5 h-3.5",loadingCripto?"animate-spin":"")}/>
                  Actualizar
                </button>
              </div>
              <div className="flex gap-3 items-center text-[10px] text-on-surface-variant mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 chip-green px-2 py-1 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"/> Cassandra OK
                </span>
                <span className="chip-teal px-2 py-1 rounded-full font-bold">Kafka Online</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl border border-outline-variant overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-outline-variant"
                   style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
                <div className="section-title mb-0">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-500"/> Libro Mayor Criptopagos
                  </h3>
                </div>
              </div>
              <div className="overflow-x-auto flex-1 max-h-[400px]">
                <table className="w-full text-left text-xs data-table">
                  <thead>
                    <tr><th>Contrato</th><th>Fecha</th><th>Meses</th><th className="text-right">Bs</th><th className="text-right">BNB</th><th>Hash</th></tr>
                  </thead>
                  <tbody>
                    {pagosCripto.length > 0 ? pagosCripto.map((p,idx)=>(
                      <tr key={idx}>
                        <td className="px-4 py-3 font-mono font-bold text-primary">{p.contrato}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{new Date(p.timestamp_ts).toLocaleString('es-BO')}</td>
                        <td className="px-4 py-3 font-semibold text-center">{p.meses_pagados}</td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-secondary whitespace-nowrap">Bs {p.monto_bs.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-yellow-500 whitespace-nowrap">{p.monto_bnb.toFixed(6)}</td>
                        <td className="px-4 py-3 font-mono text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[80px]" title={p.tx_hash}>{p.tx_hash}</span>
                            <button onClick={()=>copyToClipboard(p.tx_hash)} className="p-1 rounded bg-surface-container hover:bg-surface-container-high transition-all text-on-surface-variant">
                              {copiedTx===p.tx_hash?<Check className="w-2.5 h-2.5 text-green-500"/>:<Copy className="w-2.5 h-2.5"/>}
                            </button>
                            <a href={`https://testnet.bscscan.com/tx/${p.tx_hash}`} target="_blank" rel="noopener noreferrer"
                               className="p-1 rounded bg-surface-container hover:bg-surface-container-high transition-all text-primary">
                              <ExternalLink className="w-2.5 h-2.5"/>
                            </a>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant italic">No se encontraron pagos cripto en Cassandra.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-outline-variant overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-outline-variant"
                   style={{background:'linear-gradient(180deg,rgba(237,241,255,0.6) 0%,rgba(255,255,255,0) 100%)'}}>
                <div className="section-title mb-0">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary animate-pulse"/> Despacho Notificaciones (Kafka)
                  </h3>
                </div>
              </div>
              <div className="overflow-x-auto flex-1 max-h-[400px]">
                <table className="w-full text-left text-xs data-table">
                  <thead>
                    <tr><th>Contrato</th><th>Canal</th><th>Destinatario</th><th>Mensaje</th><th>Fecha</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {notificaciones.length > 0 ? notificaciones.map((n,idx)=>(
                      <tr key={idx}>
                        <td className="px-4 py-3 font-mono font-bold text-primary">{n.contrato}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                            n.canal==='whatsapp'?'chip-green':n.canal==='email'?'chip-purple':'chip-blue')}>
                            {n.canal}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant max-w-[120px] truncate">{n.destino}</td>
                        <td className="px-4 py-3 text-on-surface max-w-[200px] truncate" title={n.mensaje}>{n.mensaje}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{new Date(n.timestamp_ts).toLocaleString('es-BO')}</td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] chip-green px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{n.estado}</span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant italic">No se encontraron registros de Kafka en Cassandra.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Consultas ─── */}
      {tab==='consultas'&&<ConsultasFinancieroTab/>}
    </div>
  );
}
