import React, { useState } from 'react';
import { Search, FileText, Printer, MessageSquare, Mail, Phone, CheckCircle, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import { buscarCiudadano, calcularFactura, type Ciudadano } from '../lib/semapa-data';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const estadoConfig = {
  'al-dia':    { color:'#34d399', bg:'rgba(16,185,129,0.15)',  icon: CheckCircle,  label:'Al Día' },
  'moroso':    { color:'#fbbf24', bg:'rgba(245,158,11,0.15)',  icon: AlertTriangle,label:'Moroso' },
  'suspendido':{ color:'#f87171', bg:'rgba(239,68,68,0.15)',   icon: XCircle,      label:'Suspendido' },
};

// ─── Recibo PDF simulado ──────────────────────────────────────────────────────
function imprimirRecibo(ciudadano: Ciudadano, formato: 'media-carta' | 'rollo') {
  const factura = calcularFactura(ciudadano.categoria, ciudadano.consumoActualM3);
  const contenido = `
============================
     SEMAPA COCHABAMBA
    RECIBO DE PAGO ${formato === 'rollo' ? '(ROLLO)' : '(MEDIA CARTA)'}
============================
Contrato  : ${ciudadano.contrato}
CI        : ${ciudadano.ci}
Nombre    : ${ciudadano.nombre}
Dirección : ${ciudadano.direccion}
Zona      : ${ciudadano.zona} - D${ciudadano.distrito}
Categoría : ${ciudadano.categoria}
Serie Med.: ${ciudadano.medidorSerie}
----------------------------
Período   : Mayo 2025
Consumo   : ${ciudadano.consumoActualM3} m³
Ant. Cons.: ${ciudadano.consumoAnteriorM3} m³
${ciudadano.consumoActualM3 > 45 ? '⚠ CONSUMO EXCESIVO (>45m³ ONU)\n' : ''}----------------------------
Cargo Fijo: Bs ${factura.cargo_fijo.toFixed(2)}
Consumo   : Bs ${factura.cargo_consumo.toFixed(2)}
TOTAL     : Bs ${factura.total.toFixed(2)}
${ciudadano.deudaTotal > 0 ? `Deuda Ant.: Bs ${ciudadano.deudaTotal.toLocaleString()}\nTOTAL+DEU.: Bs ${(factura.total + ciudadano.deudaTotal).toFixed(2)}` : ''}
----------------------------
Vence: 10/06/2025
Emitido: ${new Date().toLocaleDateString()}
============================
  `;
  const win = window.open('', '_blank', 'width=400,height=600');
  if (win) {
    win.document.write(`<pre style="font-family:monospace;padding:24px;font-size:${formato === 'rollo' ? '11px' : '13px'};line-height:1.6">${contenido}</pre>`);
    win.document.close();
    win.print();
  }
}

// ─── Tarjeta de resultado ─────────────────────────────────────────────────────
function ResultadoCard({ ciudadano }: { ciudadano: Ciudadano }) {
  const factura = calcularFactura(ciudadano.categoria, ciudadano.consumoActualM3);
  const st = estadoConfig[ciudadano.estado];
  const Icon = st.icon;
  const [showDesglose, setShowDesglose] = useState(false);

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ border:'1px solid #1e2d45' }}>
      {/* Header */}
      <div className="px-6 py-5 flex items-start justify-between"
        style={{ background:'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(6,182,212,0.05))', borderBottom:'1px solid #1e2d45' }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color:'#4b5875' }}>
            {ciudadano.categoria} · {ciudadano.zona} · Distrito {ciudadano.distrito}
          </p>
          <h2 className="text-xl font-bold text-white">{ciudadano.nombre}</h2>
          <p className="text-sm mt-0.5" style={{ color:'#94a3b8' }}>{ciudadano.direccion}</p>
        </div>
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background:st.bg, color:st.color, border:`1px solid ${st.color}40` }}>
          <Icon className="w-3.5 h-3.5" /> {st.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l:'Contrato',        v: ciudadano.contrato,              c:'#60a5fa', mono:true },
          { l:'CI / NIT',        v: ciudadano.ci,                    c:'#94a3b8', mono:true },
          { l:'Medidor (Serie)', v: ciudadano.medidorSerie,          c:'#94a3b8', mono:true },
          { l:'Modelo',          v: ciudadano.medidorModelo,         c:'#a78bfa', mono:false },
          { l:'Consumo Actual',  v: `${ciudadano.consumoActualM3} m³`, c: ciudadano.consumoActualM3 > 45 ? '#f87171' : '#34d399', mono:false },
          { l:'Consumo Ant.',    v: `${ciudadano.consumoAnteriorM3} m³`, c:'#94a3b8', mono:false },
          { l:'Instalación',     v: ciudadano.instalacion,            c:'#94a3b8', mono:true },
          { l:'Deuda Acumulada', v: `Bs ${ciudadano.deudaTotal.toLocaleString()}`, c: ciudadano.deudaTotal > 0 ? '#f87171' : '#34d399', mono:false },
        ].map(({ l, v, c, mono }) => (
          <div key={l} className="rounded-xl p-3" style={{ background:'rgba(30,45,69,0.3)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color:'#4b5875' }}>{l}</p>
            <p className={`text-sm font-bold ${mono ? 'font-mono' : ''}`} style={{ color:c }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Factura actual */}
      <div className="px-6 pb-5">
        <div className="rounded-xl overflow-hidden" style={{ border:'1px solid #1e2d45' }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background:'rgba(13,19,32,0.8)', borderBottom:'1px solid #1e2d45' }}>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Factura Mayo 2025 {ciudadano.consumoActualM3 > 45 && (
                <span className="badge badge-red text-[9px] ml-2">CONSUMO EXCESIVO ONU</span>
              )}
            </span>
            <button onClick={() => setShowDesglose(d => !d)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase"
              style={{ color:'#60a5fa' }}>
              Ver desglose <ChevronDown className={`w-3 h-3 transition-transform ${showDesglose ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showDesglose && (
            <table className="w-full text-xs">
              <tbody>
                {factura.desglose.map(t => (
                  <tr key={t.tramo} style={{ borderBottom:'1px solid rgba(30,45,69,0.4)' }}>
                    <td className="px-4 py-2" style={{ color:'#94a3b8' }}>Tramo {t.tramo}</td>
                    <td className="px-4 py-2 metric-value" style={{ color:'#f0f6ff' }}>{t.m3} m³</td>
                    <td className="px-4 py-2" style={{ color:'#94a3b8' }}>@ Bs {t.precio}/m³</td>
                    <td className="px-4 py-2 font-bold text-right" style={{ color:'#34d399' }}>Bs {t.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ borderBottom:'1px solid rgba(30,45,69,0.4)' }}>
                  <td className="px-4 py-2 text-white" colSpan={3}>Cargo fijo (12 m³ base)</td>
                  <td className="px-4 py-2 font-bold text-right" style={{ color:'#60a5fa' }}>Bs {factura.cargo_fijo}</td>
                </tr>
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between px-4 py-3"
            style={{ background:'rgba(59,130,246,0.06)' }}>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color:'#4b5875' }}>
                Total a Pagar
              </span>
              {ciudadano.deudaTotal > 0 && (
                <span className="ml-2 text-[10px]" style={{ color:'#f87171' }}>
                  + Bs {ciudadano.deudaTotal.toLocaleString()} deuda anterior
                </span>
              )}
            </div>
            <span className="metric-value text-2xl font-bold" style={{ color:'#60a5fa' }}>
              Bs {(factura.total + ciudadano.deudaTotal).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-t" style={{ borderColor:'#1e2d45' }}>
        <button onClick={() => imprimirRecibo(ciudadano, 'media-carta')}
          className="btn-primary flex items-center gap-2 text-xs">
          <FileText className="w-4 h-4" /> Recibo Media Carta
        </button>
        <button onClick={() => imprimirRecibo(ciudadano, 'rollo')}
          className="btn-ghost flex items-center gap-2 text-xs">
          <Printer className="w-4 h-4" /> Rollo Térmico
        </button>
        <div className="h-6 w-px" style={{ background:'#1e2d45' }} />
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:'#4b5875' }}>
          Notificar vía:
        </p>
        {[
          { Icon: MessageSquare, label:'WhatsApp', color:'#34d399' },
          { Icon: Phone,         label:'SMS',      color:'#60a5fa' },
          { Icon: Mail,          label:'Email',    color:'#a78bfa' },
        ].map(({ Icon, label, color }) => (
          <button key={label}
            onClick={() => alert(`[MOCK] Notificación por ${label} enviada a ${ciudadano.nombre}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background:`${color}18`, color, border:`1px solid ${color}30` }}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CitizenPortal() {
  const [query,     setQuery]     = useState('');
  const [resultado, setResultado] = useState<Ciudadano | null>(null);
  const [notFound,  setNotFound]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResultado(null);
    // Simula latencia Cassandra (SELECT … WHERE id_servicio = ?)
    setTimeout(() => {
      const found = buscarCiudadano(query);
      setResultado(found);
      setNotFound(!found);
      setLoading(false);
    }, 600);
  };

  const ejemplos = [
    { label:'Contrato',  value:'CBB-00123456' },
    { label:'CI',        value:'4812003' },
    { label:'Medidor',   value:'OY1320-229912' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color:'#a78bfa' }}>
          Portal del Ciudadano · SEMAPA Cochabamba
        </p>
        <h1 className="text-2xl font-bold text-white">Consulta de Estado de Cuenta</h1>
        <p className="text-sm mt-0.5" style={{ color:'#4b5875' }}>
          Ingresa tu Nº de Contrato, CI o Serie de Medidor
        </p>
      </div>

      {/* Search Box */}
      <div className="glass-card rounded-2xl p-6" style={{ border:'1px solid #1e2d45' }}>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'#4b5875' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="CBB-00123456  /  7890123  /  ITC100-123456"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white"
              style={{ background:'#0d1320', border:'1px solid #1e2d45', outline:'none' }}
            />
          </div>
          <button onClick={handleSearch}
            className="btn-primary px-6 flex items-center gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color:'#4b5875' }}>
            Ejemplos:
          </span>
          {ejemplos.map(e => (
            <button key={e.value}
              onClick={() => { setQuery(e.value); setResultado(null); setNotFound(false); }}
              className="text-[11px] font-mono px-3 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ background:'rgba(59,130,246,0.1)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.2)' }}>
              {e.label}: {e.value}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {resultado && <ResultadoCard ciudadano={resultado} />}

      {notFound && (
        <div className="glass-card rounded-2xl p-10 text-center" style={{ border:'1px solid #1e2d45' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <XCircle className="w-8 h-8" style={{ color:'#f87171' }} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No se encontró ningún registro</h3>
          <p className="text-sm" style={{ color:'#4b5875' }}>
            Verifica el Nº de Contrato, CI o Serie del Medidor e intenta de nuevo.
          </p>
        </div>
      )}

      {!resultado && !notFound && !loading && (
        <div className="glass-card rounded-2xl p-10 text-center" style={{ border:'1px solid #1e2d45' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)' }}>
            <Search className="w-8 h-8" style={{ color:'#60a5fa' }} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Ingresa tus datos para consultar</h3>
          <p className="text-sm" style={{ color:'#4b5875' }}>
            El sistema consultará en tiempo real la base de datos Cassandra de SEMAPA.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { icon:'📋', label:'Nº Contrato', hint:'CBB-XXXXXXXX' },
              { icon:'🪪', label:'Cédula CI',   hint:'7 u 8 dígitos' },
              { icon:'📟', label:'Serie Medidor',hint:'MODELO-XXXXXX' },
            ].map(({ icon, label, hint }) => (
              <div key={label} className="rounded-xl p-3" style={{ background:'rgba(30,45,69,0.4)' }}>
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-xs font-bold text-white">{label}</p>
                <p className="text-[10px] mt-0.5" style={{ color:'#4b5875' }}>{hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
