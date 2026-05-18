import React, { useState, useCallback } from 'react';
import { Search, FileText, Printer, MessageSquare, Mail, Phone, CheckCircle, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import { cn, esConsumoExcesivo } from '@/src/lib/utils';
import { buscarInmueble, calcularFactura } from '@/src/lib/semapa-data';
import type { Inmueble, EstadoServicio } from '@/src/lib/types';

const ESTADO_CFG: Record<EstadoServicio, { color: string; bg: string; label: string; Icon: React.ElementType }> = {
  'al-dia':    { color:'#34d399', bg:'rgba(16,185,129,0.12)', label:'Al Día',    Icon: CheckCircle  },
  'moroso':    { color:'#fbbf24', bg:'rgba(245,158,11,0.12)', label:'Moroso',    Icon: AlertTriangle },
  'suspendido':{ color:'#f87171', bg:'rgba(239,68,68,0.12)',  label:'Suspendido',Icon: XCircle      },
};

// ── Generador de recibo HTML ──────────────────────────────────────────────────
function generarRecibo(inmueble: Inmueble, formato: 'media-carta' | 'rollo') {
  const factura = calcularFactura(inmueble.categoria, inmueble.consumoActualM3);
  const total   = factura.total + inmueble.deudaTotal;
  const ancho   = formato === 'rollo' ? 280 : 500;
  const html = `<html><head><style>
body{font-family:monospace;margin:0;padding:20px;background:#fff;width:${ancho}px;font-size:${formato==='rollo'?'10px':'12px'}}
.center{text-align:center}.bold{font-weight:bold}.sep{border-top:1px dashed #000;margin:6px 0}
.row{display:flex;justify-content:space-between;margin:3px 0}.logo{font-size:18px;font-weight:bold;text-align:center;color:#00346f}
.total{font-size:14px;font-weight:bold;display:flex;justify-content:space-between;margin:8px 0}
.exc{color:red;text-align:center;font-size:9px;font-weight:bold;border:1px dashed red;padding:2px}
</style></head><body>
<div class="logo">💧 SEMAPA COCHABAMBA</div>
<div class="center" style="font-size:9px;color:#666">Sistema Integrado de Gestión Hídrica</div>
<div class="sep"></div>
<div class="center bold">RECIBO DE PAGO — ${formato==='rollo'?'ROLLO TÉRMICO':'MEDIA CARTA'}</div>
<div class="sep"></div>
<div class="row"><span>Contrato:</span><span class="bold">${inmueble.contrato}</span></div>
<div class="row"><span>CI / NIT:</span><span>${inmueble.ci}</span></div>
<div class="row"><span>Nombre:</span><span class="bold">${inmueble.nombre}</span></div>
<div class="row"><span>Categoría:</span><span>${inmueble.categoria}</span></div>
<div class="row"><span>Medidor:</span><span>${inmueble.medidorSerie}</span></div>
<div class="row"><span>Dirección:</span><span>${inmueble.direccion}</span></div>
<div class="sep"></div>
<div class="row"><span>Período:</span><span>Mayo 2025</span></div>
<div class="row"><span>Consumo Actual:</span><span class="bold">${inmueble.consumoActualM3} m³</span></div>
<div class="row"><span>Consumo Anterior:</span><span>${inmueble.consumoAnteriorM3} m³</span></div>
${inmueble.consumoActualM3>45?'<div class="exc">⚠ CONSUMO EXCESIVO (&gt;45m³ — Parámetro ONU)</div>':''}
<div class="sep"></div>
<div class="row"><span>Cargo Fijo (12m³ base):</span><span>Bs ${factura.cargo_fijo.toFixed(2)}</span></div>
<div class="row"><span>Cargo Consumo (excedente):</span><span>Bs ${factura.cargo_consumo.toFixed(2)}</span></div>
${factura.desglose.map(t=>`<div class="row" style="font-size:9px;color:#444"><span>  └ Tramo ${t.tramo}: ${t.m3}m³ @ Bs${t.precio}/m³</span><span>Bs ${t.subtotal.toFixed(2)}</span></div>`).join('')}
${inmueble.deudaTotal>0?`<div class="row" style="color:red"><span>Deuda Anterior:</span><span>Bs ${inmueble.deudaTotal.toLocaleString()}</span></div>`:''}
<div class="sep"></div>
<div class="total"><span>TOTAL A PAGAR:</span><span>Bs ${total.toFixed(2)}</span></div>
<div class="sep"></div>
<div class="center" style="font-size:9px;color:#666">Vence: 10/06/2025</div>
<div class="center" style="font-size:9px;color:#666">Emitido: ${new Date().toLocaleDateString('es-BO')}</div>
<div class="center" style="font-size:9px;color:#666">SEMAPA · www.semapa.gob.bo · 4-4575050</div>
</body></html>`;
  const win = window.open('', '_blank', `width=${ancho+60},height=700`);
  if (win) { win.document.write(html); win.document.close(); setTimeout(()=>win.print(), 500); }
}

// ── Tarjeta de resultado ──────────────────────────────────────────────────────
function ResultadoCard({ inmueble }: { inmueble: Inmueble }) {
  const factura     = calcularFactura(inmueble.categoria, inmueble.consumoActualM3);
  const total       = factura.total + inmueble.deudaTotal;
  const cfg         = ESTADO_CFG[inmueble.estadoServicio];
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-outline-variant animate-in fade-in slide-in-from-bottom-4 duration-400">
      {/* Header */}
      <div className="px-6 py-5 flex items-start justify-between border-b border-outline-variant"
        style={{ background:'linear-gradient(135deg,rgba(59,130,246,0.06),rgba(6,182,212,0.04))' }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {inmueble.categoria} · {inmueble.zona} · D-{inmueble.distritoId}
          </p>
          <h2 className="text-xl font-bold text-on-surface mt-1">{inmueble.nombre}</h2>
          <p className="text-sm text-on-surface-variant">{inmueble.direccion}</p>
        </div>
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40` }}>
          <cfg.Icon className="w-3.5 h-3.5"/> {cfg.label}
        </span>
      </div>

      {/* Body grid */}
      <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l:'Contrato',       v:inmueble.contrato,              c:'#60a5fa', mono:true },
          { l:'CI / NIT',       v:inmueble.ci,                    c:'#94a3b8', mono:true },
          { l:'Serie Medidor',  v:inmueble.medidorSerie,          c:'#94a3b8', mono:true },
          { l:'Modelo',         v:inmueble.medidorModelo,         c:'#a78bfa', mono:false },
          { l:'Consumo Actual', v:`${inmueble.consumoActualM3} m³`, c:inmueble.consumoActualM3>45?'#f87171':'#34d399', mono:false },
          { l:'Consumo Ant.',   v:`${inmueble.consumoAnteriorM3} m³`, c:'#94a3b8', mono:false },
          { l:'Instalación',    v:inmueble.instalacion,           c:'#94a3b8', mono:true },
          { l:'Deuda Acum.',    v:`Bs ${inmueble.deudaTotal.toLocaleString()}`, c:inmueble.deudaTotal>0?'#f87171':'#34d399', mono:false },
        ].map(({l,v,c,mono})=>(
          <div key={l} className="rounded-xl p-3 bg-surface-container-low border border-outline-variant/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{l}</p>
            <p className={cn('text-sm font-bold', mono?'font-mono':'')} style={{color:c}}>{v}</p>
          </div>
        ))}
      </div>

      {/* Factura */}
      <div className="px-6 pb-5">
        <div className="rounded-xl overflow-hidden border border-outline-variant">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Factura Mayo 2025 — Cargo fijo: Bs {factura.cargo_fijo}
              {inmueble.consumoActualM3>45&&(
                <span className="ml-2 text-[9px] font-bold bg-error-container/20 text-error px-2 py-0.5 rounded">EXCESO ONU</span>
              )}
            </span>
            <button onClick={()=>setOpen(o=>!o)} className="flex items-center gap-1 text-[10px] font-bold text-primary">
              Desglose <ChevronDown className={cn('w-3 h-3 transition-transform', open?'rotate-180':'')}/>
            </button>
          </div>
          {open&&(
            <table className="w-full text-xs">
              <tbody>
                {factura.desglose.map(t=>(
                  <tr key={t.tramo} className="border-b border-outline-variant/50">
                    <td className="px-4 py-2 text-on-surface-variant">Tramo {t.tramo}</td>
                    <td className="px-4 py-2 font-mono text-on-surface">{t.m3} m³</td>
                    <td className="px-4 py-2 text-on-surface-variant">@ Bs {t.precio}/m³</td>
                    <td className="px-4 py-2 font-bold text-right text-secondary font-mono">Bs {t.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-b border-outline-variant/50">
                  <td className="px-4 py-2 text-on-surface" colSpan={3}>Cargo Fijo (12m³ base)</td>
                  <td className="px-4 py-2 font-bold text-right text-primary font-mono">Bs {factura.cargo_fijo}</td>
                </tr>
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low/30">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total a Pagar</span>
              {inmueble.deudaTotal>0&&(
                <span className="ml-2 text-[10px] text-error">+ Bs {inmueble.deudaTotal.toLocaleString()} deuda ant.</span>
              )}
            </div>
            <span className="text-2xl font-bold font-mono text-primary">Bs {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-t border-outline-variant bg-surface-container-low/20">
        <button onClick={()=>generarRecibo(inmueble,'media-carta')}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold hover:brightness-110 transition-all">
          <FileText className="w-4 h-4"/> Recibo Media Carta
        </button>
        <button onClick={()=>generarRecibo(inmueble,'rollo')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface transition-all">
          <Printer className="w-4 h-4"/> Rollo Térmico
        </button>
        <div className="h-6 w-px bg-outline-variant mx-1"/>
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Notificar:</p>
        {[
          { Icon:MessageSquare, label:'WhatsApp', c:'#34d399' },
          { Icon:Phone,         label:'SMS',      c:'#60a5fa' },
          { Icon:Mail,          label:'Email',    c:'#a78bfa' },
        ].map(({Icon,label,c})=>(
          <button key={label}
            onClick={()=>alert(`[MOCK] Notificación ${label} enviada a ${inmueble.nombre}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{background:`${c}18`,color:c,border:`1px solid ${c}30`}}>
            <Icon className="w-3.5 h-3.5"/> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CitizenPortal() {
  const [query,   setQuery]   = useState('');
  const [result,  setResult]  = useState<Inmueble | null>(null);
  const [notFound,setNotFound]= useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) { setError('Ingresa un Nº de Contrato, CI o Serie de Medidor.'); return; }
    // Validaciones básicas
    if (q.length < 5) { setError('La búsqueda debe tener al menos 5 caracteres.'); return; }
    setError(null);
    setLoading(true);
    setNotFound(false);
    setResult(null);
    // Simula latencia Cassandra: SELECT WHERE id_servicio=? (consulta por clave primaria)
    setTimeout(() => {
      const found = buscarInmueble(q);
      setResult(found);
      setNotFound(!found);
      setLoading(false);
    }, 700);
  }, [query]);

  const EJEMPLOS = [
    { label:'Contrato', value:'CBB-00123456' },
    { label:'CI',       value:'4812003' },
    { label:'Medidor',  value:'OY1320-229912' },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#a78bfa'}}>Portal del Ciudadano · SEMAPA</span>
        <h2 className="text-2xl font-bold text-on-surface mt-0.5">Consulta de Estado de Cuenta</h2>
        <p className="text-sm text-on-surface-variant">Busca por Nº de Contrato, CI / NIT o Serie de Medidor</p>
      </div>

      {/* Caja de búsqueda */}
      <div className="glass-card rounded-2xl p-6 border border-outline-variant">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant"/>
            <input type="text" value={query}
              onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSearch()}
              placeholder="CBB-00123456  /  7890123  /  OY1320-123456"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary outline-none text-sm transition-all"/>
          </div>
          <button onClick={handleSearch}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            disabled={loading}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : <Search className="w-4 h-4"/>}
            Buscar
          </button>
        </div>

        {error&&(
          <p className="mt-2 text-xs font-bold text-error flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5"/> {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Ejemplos:</span>
          {EJEMPLOS.map(e=>(
            <button key={e.value}
              onClick={()=>{setQuery(e.value);setResult(null);setNotFound(false);setError(null);}}
              className="text-[11px] font-mono px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all">
              {e.label}: {e.value}
            </button>
          ))}
        </div>
      </div>

      {/* Estados */}
      {result&&<ResultadoCard inmueble={result}/>}

      {notFound&&(
        <div className="glass-card rounded-2xl p-10 text-center border border-outline-variant">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-error/10 border border-error/20">
            <XCircle className="w-8 h-8 text-error"/>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">Registro no encontrado</h3>
          <p className="text-sm text-on-surface-variant">Verifica el Nº de Contrato, CI o Serie del Medidor e intenta de nuevo.</p>
        </div>
      )}

      {!result&&!notFound&&!loading&&(
        <div className="glass-card rounded-2xl p-10 text-center border border-outline-variant">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20">
            <Search className="w-8 h-8 text-primary"/>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">Ingresa tu búsqueda</h3>
          <p className="text-sm text-on-surface-variant mb-6">El sistema consulta en tiempo real la base de datos Cassandra de SEMAPA.</p>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              {icon:'📋',label:'Nº Contrato',hint:'CBB-XXXXXXXX'},
              {icon:'🪪',label:'CI / NIT',   hint:'7 u 8 dígitos'},
              {icon:'📟',label:'Serie Medidor',hint:'MODELO-XXXXXX'},
            ].map(({icon,label,hint})=>(
              <div key={label} className="rounded-xl p-3 bg-surface-container-low border border-outline-variant">
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-xs font-bold text-on-surface">{label}</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
