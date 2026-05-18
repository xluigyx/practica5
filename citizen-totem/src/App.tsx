import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Droplets, FileText, Printer, MessageSquare, Mail, Phone, CheckCircle, AlertTriangle, XCircle, ChevronDown, Delete, Clock } from 'lucide-react';
import { cn } from './lib/utils';
import { buscarInmueble, calcularFactura } from './lib/semapa-data';
import type { Inmueble, EstadoServicio } from './lib/types';

// ─── On-screen keyboard ───────────────────────────────────────────────────────
const ROWS_ALPHA = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];
const ROWS_NUM = [['1','2','3'],['4','5','6'],['7','8','9'],['0','-','⌫']];

function Keyboard({ value, onChange, mode }: { value: string; onChange: (v: string) => void; mode: 'alpha' | 'num' }) {
  const press = (k: string) => {
    if (k === '⌫') onChange(value.slice(0, -1));
    else onChange(value + k);
  };
  const base = 'flex items-center justify-center rounded-2xl font-bold text-white active:scale-95 transition-all select-none touch-manipulation';
  if (mode === 'num') return (
    <div className="grid grid-cols-3 gap-3 w-56">
      {ROWS_NUM.flat().map(k => (
        <button key={k} onPointerDown={() => press(k)}
          className={cn(base, 'h-16 text-2xl', k === '⌫' ? 'bg-amber-600/80' : 'bg-white/10 border border-white/20 hover:bg-white/20')}>
          {k === '⌫' ? <Delete className="w-6 h-6" /> : k}
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-2 w-full max-w-xl">
      {ROWS_ALPHA.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-2">
          {row.map(k => (
            <button key={k} onPointerDown={() => press(k)}
              className={cn(base, 'w-12 h-12 text-sm bg-white/10 border border-white/20 hover:bg-white/20')}>{k}</button>
          ))}
          {ri === 2 && (
            <button onPointerDown={() => press('⌫')}
              className={cn(base, 'px-4 h-12 text-sm bg-amber-600/80')}>
              <Delete className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <div className="flex justify-center gap-2 mt-1">
        {['-','0','1','2','3','4','5','6','7','8','9'].map(k => (
          <button key={k} onPointerDown={() => press(k)}
            className={cn(base, 'w-12 h-10 text-sm bg-white/10 border border-white/20 hover:bg-white/20')}>{k}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Estado configs ───────────────────────────────────────────────────────────
const EST: Record<EstadoServicio, { color: string; bg: string; label: string; Icon: React.ElementType }> = {
  'al-dia':    { color:'#34d399', bg:'rgba(16,185,129,0.15)', label:'Al Día',    Icon: CheckCircle },
  'moroso':    { color:'#fbbf24', bg:'rgba(245,158,11,0.15)', label:'Moroso',    Icon: AlertTriangle },
  'suspendido':{ color:'#f87171', bg:'rgba(239,68,68,0.15)',  label:'Suspendido',Icon: XCircle },
};

// ─── Receipt generator ────────────────────────────────────────────────────────
function printRecibo(i: Inmueble, fmt: 'rollo' | 'media') {
  const f = calcularFactura(i.categoria, i.consumoActualM3);
  const total = f.total + i.deudaTotal;
  const w = fmt === 'rollo' ? 270 : 480;
  const html = `<html><head><style>body{font-family:monospace;padding:16px;width:${w}px;font-size:${fmt==='rollo'?'10':'12'}px}
.c{text-align:center}.b{font-weight:bold}.s{border-top:1px dashed #000;margin:6px 0}.r{display:flex;justify-content:space-between}</style></head><body>
<div class="c b" style="font-size:16px">💧 SEMAPA</div>
<div class="c">RECIBO ${fmt==='rollo'?'ROLLO TÉRMICO':'MEDIA CARTA'}</div><div class="s"></div>
<div class="r"><span>Contrato:</span><span>${i.contrato}</span></div>
<div class="r"><span>Nombre:</span><span>${i.nombre}</span></div>
<div class="r"><span>Categoría:</span><span>${i.categoria}</span></div>
<div class="r"><span>Medidor:</span><span>${i.medidorSerie}</span></div>
<div class="r"><span>Consumo:</span><span>${i.consumoActualM3} m³</span></div>
${i.consumoActualM3>45?'<div class="c" style="color:red;border:1px dashed red;padding:3px">⚠ EXCESO ONU &gt;45m³</div>':''}
<div class="s"></div>
<div class="r"><span>Cargo fijo:</span><span>Bs ${f.cargo_fijo.toFixed(2)}</span></div>
<div class="r"><span>Cargo consumo:</span><span>Bs ${f.cargo_consumo.toFixed(2)}</span></div>
${i.deudaTotal>0?`<div class="r" style="color:red"><span>Deuda ant.:</span><span>Bs ${i.deudaTotal.toLocaleString()}</span></div>`:''}
<div class="s"></div>
<div class="r b" style="font-size:14px"><span>TOTAL:</span><span>Bs ${total.toFixed(2)}</span></div>
<div class="s"></div>
<div class="c" style="font-size:9px">Vence 10/06/2025 · ${new Date().toLocaleDateString('es-BO')}</div>
<div class="c" style="font-size:9px">SEMAPA Cochabamba · www.semapa.gob.bo</div>
</body></html>`;
  const win = window.open('', '_blank', `width=${w+60},height=700`);
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
}

// ─── MAIN KIOSK ───────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep]       = useState<'home'|'search'|'result'>('home');
  const [query, setQuery]     = useState('');
  const [kbMode, setKbMode]   = useState<'alpha'|'num'>('num');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<Inmueble | null>(null);
  const [notFound, setNotFound]= useState(false);
  const [showDesg, setShowDesg]= useState(false);
  const [timer, setTimer]     = useState(60);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setStep('home'); setQuery(''); setResult(null);
    setNotFound(false); setShowDesg(false); setTimer(60);
  }, []);

  // Inactivity countdown (only active when in search/result step)
  useEffect(() => {
    if (step === 'home') { if (timerRef.current) clearInterval(timerRef.current); return; }
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current!); reset(); return 60; } return t - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, reset]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true); setNotFound(false); setResult(null);
    setTimeout(() => {
      const found = buscarInmueble(query);
      setResult(found); setNotFound(!found); setLoading(false);
      if (found) setStep('result');
    }, 700);
  };

  // ── HOME ────────────────────────────────────────────────────────────────────
  if (step === 'home') return (
    <div className="min-h-screen bg-gradient-to-br from-[#00346f] via-[#0a4fa6] to-[#0891b2] flex flex-col items-center justify-center gap-10 p-8 select-none">
      <div className="text-center">
        <div className="w-28 h-28 rounded-[40px] mx-auto mb-6 flex items-center justify-center shadow-2xl"
          style={{ background:'linear-gradient(135deg,#1d4ed8,#0891b2)', boxShadow:'0 0 60px rgba(59,130,246,0.5)' }}>
          <Droplets className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-6xl font-black text-white tracking-tighter">SEMAPA</h1>
        <p className="text-2xl font-semibold text-blue-200 mt-2">Cochabamba · Tótem de Autogestión</p>
        <p className="text-blue-300 mt-1 text-lg">Consulta tu estado de cuenta sin filas</p>
      </div>

      <div className="grid grid-cols-3 gap-6 w-full max-w-3xl">
        {[
          { icon:'👥', label:'650,240', sub:'Ciudadanos', c:'#60a5fa' },
          { icon:'📡', label:'120,000', sub:'Medidores activos', c:'#34d399' },
          { icon:'🏙️', label:'94.2%',  sub:'Cobertura ciudad', c:'#a78bfa' },
        ].map(({ icon, label, sub, c }) => (
          <div key={sub} className="text-center p-6 rounded-3xl bg-white/10 border border-white/20 backdrop-blur">
            <p className="text-4xl mb-2">{icon}</p>
            <p className="text-3xl font-black" style={{ color: c }}>{label}</p>
            <p className="text-blue-200 text-sm mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <button onClick={() => setStep('search')}
        className="mt-4 px-16 py-8 rounded-[40px] text-white text-3xl font-black shadow-2xl active:scale-95 transition-all"
        style={{ background:'linear-gradient(135deg,#10b981,#059669)', boxShadow:'0 0 40px rgba(16,185,129,0.4)' }}>
        TOCA AQUÍ PARA CONSULTAR
      </button>

      <p className="text-blue-300 text-sm opacity-60">Terminal KIOSK-CBBA-012 · Sistema SEMAPA v4.0</p>
    </div>
  );

  // ── SEARCH ──────────────────────────────────────────────────────────────────
  if (step === 'search') return (
    <div className="min-h-screen bg-[#080c14] flex flex-col items-center gap-6 p-8">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Droplets className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold text-white">SEMAPA · Consulta</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full"
            style={{ background: timer<15?'rgba(239,68,68,0.2)':'rgba(59,130,246,0.15)', color: timer<15?'#f87171':'#60a5fa' }}>
            <Clock className="w-4 h-4" /> {timer}s
          </span>
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all">
            <X className="w-4 h-4" /> Inicio
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h2 className="text-3xl font-black text-white text-center mb-1">Busca tu contrato</h2>
          <p className="text-blue-300 text-center">CI/NIT · Nº Contrato · Serie de Medidor</p>
        </div>

        {/* Input display */}
        <div className="relative flex items-center bg-white/10 border-2 border-blue-500/50 rounded-2xl px-5 py-4">
          <Search className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0" />
          <span className="text-2xl font-mono text-white flex-1 min-h-[36px]">
            {query || <span className="text-white/30">Usa el teclado abajo...</span>}
          </span>
          {query && <button onClick={() => setQuery('')}><X className="w-5 h-5 text-white/50 hover:text-white" /></button>}
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-white/10 rounded-xl">
          {(['num','alpha'] as const).map(m => (
            <button key={m} onClick={() => setKbMode(m)}
              className={cn('flex-1 py-2.5 rounded-lg text-sm font-bold transition-all',
                kbMode===m?'bg-blue-600 text-white':'text-white/50 hover:text-white')}>
              {m==='num' ? '🔢 Numérico' : '🔤 Alfanumérico'}
            </button>
          ))}
        </div>

        {/* Keyboard */}
        <div className="flex justify-center">
          <Keyboard value={query} onChange={setQuery} mode={kbMode} />
        </div>

        {/* Quick examples */}
        <div className="flex flex-wrap gap-2 justify-center">
          <p className="w-full text-center text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Ejemplos rápidos</p>
          {[{ l:'Contrato', v:'CBB-00123456' },{ l:'CI', v:'4812003' },{ l:'Medidor', v:'OY1320-229912' }].map(e=>(
            <button key={e.v} onClick={() => setQuery(e.v)}
              className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-mono hover:bg-white/20 transition-all">
              {e.l}: {e.v}
            </button>
          ))}
        </div>

        {notFound && (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-300 font-bold">No se encontró ningún registro.</p>
            <p className="text-red-400 text-sm">Verifica los datos e intenta de nuevo.</p>
          </div>
        )}

        <button onClick={handleSearch} disabled={!query.trim()||loading}
          className="w-full py-6 rounded-2xl text-white text-xl font-black active:scale-95 transition-all disabled:opacity-40"
          style={{ background:'linear-gradient(135deg,#1d4ed8,#0891b2)', boxShadow:'0 0 30px rgba(59,130,246,0.35)' }}>
          {loading ? <span className="flex items-center justify-center gap-3"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Consultando Cassandra...</span> : '🔍 BUSCAR'}
        </button>
      </div>
    </div>
  );

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const factura = calcularFactura(result.categoria, result.consumoActualM3);
    const total   = factura.total + result.deudaTotal;
    const cfg     = EST[result.estadoServicio];
    const exceso  = result.consumoActualM3 > 45;
    // Meter status based on model age (OY1320 >4 years = fault)
    const meterFault = result.medidorModelo === 'OY1320' && result.consumoActualM3 > 100;
    const meterStatus = meterFault ? { label:'Error Técnico (Cód.4)', color:'#f87171', bg:'rgba(239,68,68,0.15)' }
      : { label:'Activo', color:'#34d399', bg:'rgba(16,185,129,0.15)' };

    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center gap-5 p-6 pb-10">
        {/* Header */}
        <div className="w-full max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-7 h-7 text-blue-400" />
            <span className="text-lg font-bold text-white">SEMAPA · Estado de Cuenta</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full"
              style={{ background: timer<15?'rgba(239,68,68,0.2)':'rgba(59,130,246,0.15)', color: timer<15?'#f87171':'#60a5fa' }}>
              <Clock className="w-4 h-4" /> {timer}s
            </span>
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all">
              <X className="w-4 h-4" /> Inicio
            </button>
          </div>
        </div>

        <div className="w-full max-w-3xl space-y-4">
          {/* Identity card */}
          <div className="rounded-3xl overflow-hidden border border-white/10"
            style={{ background:'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(6,182,212,0.05))' }}>
            <div className="px-6 py-5 flex items-start justify-between border-b border-white/10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">{result.categoria} · {result.zona} · D-{result.distritoId}</p>
                <h2 className="text-2xl font-black text-white mt-1">{result.nombre}</h2>
                <p className="text-sm text-white/60 mt-0.5">{result.direccion}</p>
                <p className="text-xs font-mono text-blue-400 mt-1">{result.contrato}</p>
              </div>
              <span className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold flex-shrink-0"
                style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40` }}>
                <cfg.Icon className="w-4 h-4" />{cfg.label}
              </span>
            </div>
            <div className="px-6 py-4 grid grid-cols-4 gap-4">
              {[
                { l:'CI / NIT', v:result.ci, c:'#94a3b8', mono:true },
                { l:'Serie Medidor', v:result.medidorSerie, c:'#94a3b8', mono:true },
                { l:'Modelo', v:result.medidorModelo, c:'#a78bfa', mono:false },
                { l:'Instalación', v:result.instalacion, c:'#94a3b8', mono:true },
              ].map(({ l, v, c, mono }) => (
                <div key={l} className="rounded-2xl p-3 bg-white/5 border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">{l}</p>
                  <p className={cn('text-sm font-bold', mono?'font-mono':'')} style={{ color:c }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Meter status */}
          <div className="flex items-center justify-between px-5 py-4 rounded-2xl border"
            style={{ background:meterStatus.bg, borderColor:`${meterStatus.color}40` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:`${meterStatus.color}20` }}>
                <span className="text-xl">📡</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">Estado del Medidor</p>
                <p className="font-bold text-sm" style={{ color:meterStatus.color }}>{meterStatus.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Consumo actual</p>
              <p className="text-xl font-black font-mono" style={{ color: exceso?'#f87171':'#34d399' }}>
                {result.consumoActualM3} m³
              </p>
            </div>
          </div>

          {/* ONU excess alert */}
          {exceso && (
            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-orange-500/15 border border-orange-500/30">
              <AlertTriangle className="w-8 h-8 text-orange-400 flex-shrink-0" />
              <div>
                <p className="font-black text-orange-300">⚠ CONSUMO EXCESIVO — Parámetro ONU</p>
                <p className="text-orange-400 text-sm">Tu consumo de {result.consumoActualM3}m³ supera el límite de 45m³/mes. Se recomienda revisión técnica del medidor.</p>
              </div>
            </div>
          )}

          {/* Billing card */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-sm font-bold text-white">Factura Mayo 2025 · Cargo fijo: Bs {factura.cargo_fijo} (12m³ base)</span>
              <button onClick={() => setShowDesg(d=>!d)} className="flex items-center gap-1 text-xs font-bold text-blue-400">
                Desglose <ChevronDown className={cn('w-4 h-4 transition-transform', showDesg?'rotate-180':'')} />
              </button>
            </div>
            {showDesg && (
              <div className="divide-y divide-white/10">
                {factura.desglose.map(t => (
                  <div key={t.tramo} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-white/60">Tramo {t.tramo}: {t.m3}m³ @ Bs {t.precio}/m³</span>
                    <span className="font-bold text-green-400 font-mono">Bs {t.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <p className="text-sm font-bold text-white/50 uppercase tracking-wider">Total a Pagar</p>
                {result.deudaTotal > 0 && <p className="text-xs text-red-400">Incluye deuda: Bs {result.deudaTotal.toLocaleString()}</p>}
              </div>
              <p className="text-4xl font-black text-blue-400 font-mono">Bs {total.toFixed(2)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => printRecibo(result, 'rollo')}
              className="flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-bold text-base active:scale-95 transition-all"
              style={{ background:'linear-gradient(135deg,#1d4ed8,#0891b2)' }}>
              <Printer className="w-5 h-5" /> Rollo Térmico
            </button>
            <button onClick={() => printRecibo(result, 'media')}
              className="flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-bold text-base active:scale-95 transition-all border border-white/20 bg-white/10 hover:bg-white/20">
              <FileText className="w-5 h-5" /> Media Carta
            </button>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Enviar aviso de cobranza</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { Icon:MessageSquare, label:'WhatsApp', c:'#34d399' },
                { Icon:Phone,         label:'SMS',      c:'#60a5fa' },
                { Icon:Mail,          label:'Email',    c:'#a78bfa' },
              ].map(({ Icon, label, c }) => (
                <button key={label}
                  onClick={() => alert(`[MOCK] Notificación ${label} enviada a ${result.nombre}`)}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                  style={{ background:`${c}15`, color:c, border:`1px solid ${c}30` }}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={reset}
            className="w-full py-4 rounded-2xl text-white/60 text-sm font-bold border border-white/10 hover:bg-white/5 transition-all">
            ← Nueva Consulta
          </button>
        </div>
      </div>
    );
  }

  return null;
}
