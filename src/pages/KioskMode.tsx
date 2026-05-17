import React, { useState } from 'react';
import { Search, FileText, Printer, Droplets, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { buscarCiudadano, calcularFactura, type Ciudadano } from '../lib/semapa-data';

const estadoConfig = {
  'al-dia':    { color:'#34d399', bg:'rgba(16,185,129,0.12)', label:'Al Día',     icon: CheckCircle },
  'moroso':    { color:'#fbbf24', bg:'rgba(245,158,11,0.12)', label:'Moroso',     icon: AlertTriangle },
  'suspendido':{ color:'#f87171', bg:'rgba(239,68,68,0.12)',  label:'Suspendido', icon: XCircle },
};

function imprimirRecibo(ciudadano: Ciudadano, formato: 'media-carta' | 'rollo') {
  const factura = calcularFactura(ciudadano.categoria, ciudadano.consumoActualM3);
  const ancho = formato === 'rollo' ? 280 : 500;
  const html = `
<html><head><style>
  body{font-family:monospace;margin:0;padding:24px;background:#fff;width:${ancho}px}
  .center{text-align:center} .bold{font-weight:bold} .sep{border-top:1px dashed #000;margin:8px 0}
  .row{display:flex;justify-content:space-between;margin:4px 0}
  .logo{font-size:20px;font-weight:bold;text-align:center;color:#00346f}
</style></head><body>
  <div class="logo">💧 SEMAPA</div>
  <div class="center" style="font-size:10px;color:#666">Municipio de Cochabamba</div>
  <div class="center" style="font-size:11px;font-weight:bold;margin:4px 0">
    RECIBO DE PAGO - ${formato === 'rollo' ? 'ROLLO' : 'MEDIA CARTA'}
  </div>
  <div class="sep"></div>
  <div class="row"><span>Contrato:</span><span class="bold">${ciudadano.contrato}</span></div>
  <div class="row"><span>Nombre:</span><span class="bold">${ciudadano.nombre}</span></div>
  <div class="row"><span>Categoría:</span><span>${ciudadano.categoria}</span></div>
  <div class="row"><span>Medidor:</span><span>${ciudadano.medidorSerie}</span></div>
  <div class="row"><span>Dirección:</span><span>${ciudadano.direccion}</span></div>
  <div class="sep"></div>
  <div class="row"><span>Período:</span><span>Mayo 2025</span></div>
  <div class="row"><span>Consumo:</span><span>${ciudadano.consumoActualM3} m³</span></div>
  ${ciudadano.consumoActualM3 > 45 ? '<div style="color:red;text-align:center;font-size:10px">⚠ CONSUMO EXCESIVO (&gt;45m³ - Parámetro ONU)</div>' : ''}
  <div class="sep"></div>
  <div class="row"><span>Cargo Fijo:</span><span>Bs ${factura.cargo_fijo.toFixed(2)}</span></div>
  <div class="row"><span>Cargo Consumo:</span><span>Bs ${factura.cargo_consumo.toFixed(2)}</span></div>
  ${ciudadano.deudaTotal > 0 ? `<div class="row"><span style="color:red">Deuda Anterior:</span><span style="color:red">Bs ${ciudadano.deudaTotal.toLocaleString()}</span></div>` : ''}
  <div class="sep"></div>
  <div class="row bold" style="font-size:14px">
    <span>TOTAL A PAGAR:</span>
    <span>Bs ${(factura.total + ciudadano.deudaTotal).toFixed(2)}</span>
  </div>
  <div class="sep"></div>
  <div class="center" style="font-size:9px;color:#666">Vence: 10/06/2025 · Emitido: ${new Date().toLocaleDateString('es-BO')}</div>
  <div class="center" style="font-size:9px;color:#666">SEMAPA Cochabamba · www.semapa.gob.bo</div>
</body></html>`;
  const win = window.open('', '_blank', `width=${ancho + 60},height=700`);
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
}

export default function KioskMode() {
  const [query,     setQuery]     = useState('');
  const [result,    setResult]    = useState<Ciudadano | null>(null);
  const [notFound,  setNotFound]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [step,      setStep]      = useState<'search' | 'result'>('search');

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setTimeout(() => {
      const c = buscarCiudadano(query);
      setLoading(false);
      if (c) { setResult(c); setStep('result'); }
      else   { setNotFound(true); }
    }, 800);
  };

  const handleReset = () => { setQuery(''); setResult(null); setNotFound(false); setStep('search'); };

  return (
    <div className="kiosk-screen min-h-screen flex flex-col items-center justify-start p-8 gap-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
          style={{ background:'linear-gradient(135deg,#1d4ed8,#0891b2)', boxShadow:'0 0 40px rgba(59,130,246,0.4)' }}>
          <Droplets className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white text-glow-blue">SEMAPA</h1>
        <p className="text-lg font-semibold mt-1" style={{ color:'#60a5fa' }}>Cochabamba · Kiosko de Autogestión</p>
        <p className="text-sm mt-1" style={{ color:'#4b5875' }}>Consulta tu estado de cuenta sin filas</p>
      </div>

      {/* KPI Strip */}
      <div className="flex gap-6 flex-wrap justify-center">
        {[
          { label:'Ciudadanos atendidos', value:'633,800', c:'#60a5fa' },
          { label:'Medidores activos',    value:'115,800', c:'#34d399' },
          { label:'Cobertura ciudad',     value:'94.2%',   c:'#a78bfa' },
        ].map(({ label, value, c }) => (
          <div key={label} className="text-center px-6 py-3 rounded-2xl"
            style={{ background:'rgba(30,45,69,0.5)', border:'1px solid rgba(59,130,246,0.2)' }}>
            <p className="metric-value text-2xl font-bold" style={{ color:c }}>{value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color:'#4b5875' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Search Box */}
      {step === 'search' && (
        <div className="w-full max-w-xl glass-card rounded-3xl p-8" style={{ border:'1px solid rgba(59,130,246,0.2)' }}>
          <h2 className="text-xl font-bold text-white text-center mb-2">Consulta tu Estado de Cuenta</h2>
          <p className="text-sm text-center mb-6" style={{ color:'#4b5875' }}>
            Ingresa tu Nº de Contrato, CI o Serie del Medidor
          </p>
          <div className="flex gap-3">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="CBB-00123456"
              className="flex-1 py-4 px-5 rounded-2xl text-base text-white"
              style={{ background:'#0a1122', border:'1px solid #1e2d45', outline:'none', fontSize:16 }}
            />
            <button onClick={handleSearch}
              className="btn-primary px-8 rounded-2xl text-base flex items-center gap-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Search className="w-5 h-5" />}
              Buscar
            </button>
          </div>

          {notFound && (
            <div className="mt-4 text-center py-3 rounded-xl"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ color:'#f87171' }}>❌ No se encontró ningún registro. Verifica tus datos.</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3">
            {['CBB-00123456','4812003','OY1320-229912'].map(v => (
              <button key={v} onClick={() => setQuery(v)}
                className="py-2 px-3 rounded-xl text-xs font-mono transition-all hover:opacity-80 text-center"
                style={{ background:'rgba(59,130,246,0.08)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.15)' }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {step === 'result' && result && (() => {
        const factura = calcularFactura(result.categoria, result.consumoActualM3);
        const total   = factura.total + result.deudaTotal;
        const st      = estadoConfig[result.estado];
        const StIcon  = st.icon;

        return (
          <div className="w-full max-w-2xl space-y-4 animate-slide-up">
            <div className="glass-card rounded-3xl p-6" style={{ border:'1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color:'#4b5875' }}>
                    {result.zona} · Distrito {result.distrito} · {result.categoria}
                  </p>
                  <h2 className="text-2xl font-bold text-white">{result.nombre}</h2>
                  <p className="text-sm mt-1 font-mono" style={{ color:'#60a5fa' }}>{result.contrato}</p>
                </div>
                <span className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm"
                  style={{ background:st.bg, color:st.color, border:`1px solid ${st.color}40` }}>
                  <StIcon className="w-4 h-4" /> {st.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { l:'Consumo actual', v:`${result.consumoActualM3} m³`, c: result.consumoActualM3>45?'#f87171':'#34d399' },
                  { l:'Cargo consumo',  v:`Bs ${factura.cargo_consumo}`, c:'#60a5fa' },
                  { l:'Cargo fijo',     v:`Bs ${factura.cargo_fijo}`,    c:'#60a5fa' },
                ].map(({ l,v,c }) => (
                  <div key={l} className="rounded-2xl p-4 text-center"
                    style={{ background:'rgba(30,45,69,0.5)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color:'#4b5875' }}>{l}</p>
                    <p className="metric-value text-lg font-bold" style={{ color:c }}>{v}</p>
                  </div>
                ))}
              </div>

              {result.consumoActualM3 > 45 && (
                <div className="px-4 py-3 rounded-xl mb-4 text-center"
                  style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-sm font-bold" style={{ color:'#f87171' }}>
                    ⚠ Consumo excesivo según parámetros ONU (límite: 45 m³/mes)
                  </p>
                </div>
              )}

              <div className="rounded-2xl p-5 flex items-center justify-between"
                style={{ background:'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(6,182,212,0.06))', border:'1px solid rgba(59,130,246,0.2)' }}>
                <p className="text-base font-bold text-white">TOTAL A PAGAR</p>
                <p className="metric-value text-4xl font-bold" style={{ color:'#60a5fa' }}>
                  Bs {total.toFixed(2)}
                </p>
              </div>
              {result.deudaTotal > 0 && (
                <p className="text-xs text-center mt-2" style={{ color:'#f87171' }}>
                  Incluye deuda anterior: Bs {result.deudaTotal.toLocaleString()}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => imprimirRecibo(result, 'media-carta')}
                className="flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold text-white transition-all hover:opacity-90"
                style={{ background:'linear-gradient(135deg,#1d4ed8,#0891b2)', boxShadow:'0 0 20px rgba(59,130,246,0.3)' }}>
                <FileText className="w-5 h-5" /> Recibo Media Carta
              </button>
              <button onClick={() => imprimirRecibo(result, 'rollo')}
                className="flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90"
                style={{ background:'rgba(30,45,69,0.8)', color:'#94a3b8', border:'1px solid #1e2d45' }}>
                <Printer className="w-5 h-5" /> Rollo Térmico
              </button>
            </div>

            <button onClick={handleReset}
              className="w-full py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all"
              style={{ background:'transparent', color:'#4b5875', border:'1px solid #1e2d45' }}>
              ← Nueva Consulta
            </button>
          </div>
        );
      })()}
    </div>
  );
}
