import React, { useState, useCallback, useEffect } from 'react';
import { Search, FileText, Printer, MessageSquare, Mail, Phone, CheckCircle, AlertTriangle, XCircle, ChevronDown, Copy, Coins, RefreshCw, Check, Clock, CreditCard, X } from 'lucide-react';
import { cn, esConsumoExcesivo } from '@/src/lib/utils';
import { buscarInmueble, calcularFactura } from '@/src/lib/semapa-data';
import type { Inmueble, EstadoServicio } from '@/src/lib/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ESTADO_CFG: Record<EstadoServicio, { color: string; bg: string; label: string; Icon: React.ElementType }> = {
  'al-dia':    { color:'#34d399', bg:'rgba(16,185,129,0.12)', label:'Al Día',    Icon: CheckCircle  },
  'moroso':    { color:'#fbbf24', bg:'rgba(245,158,11,0.12)', label:'Moroso',    Icon: AlertTriangle },
  'suspendido':{ color:'#f87171', bg:'rgba(239,68,68,0.12)',  label:'Suspendido',Icon: XCircle      },
};

interface FacturaDesgloseItem {
  id: number;
  periodo: string;
  nombre: string;
  monto: number;
  estado: string;
}

interface DynamicBreakdown {
  contrato: string;
  deudaTotal: number;
  mesesDeuda: number;
  desgloseVencido: FacturaDesgloseItem[];
  facturaActual: FacturaDesgloseItem;
}

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

// ── Generador de recibo con detalles criptográficos / bancarios ───────────────
function printReciboConCripto(i: Inmueble, paidMonths: string[], totalBs: number, metodo: 'bnb' | 'qr_simple' = 'qr_simple', bnbAmount?: number, txHash?: string) {
  const w = 450;
  
  const paymentDetailsHtml = `
<div class="s"></div>
<div class="c b">DETALLE DE RECAUDACIÓN BANCARIA</div>
<div class="s"></div>
<div class="r"><span>Método de Pago:</span><span>QR Simple Bancario (Bolivianos)</span></div>
<div class="r"><span>Banco Destino:</span><span>Banco Nacional de Bolivia (BNB)</span></div>
<div class="r"><span>Cuenta Destino:</span><span>3503205520</span></div>
<div class="r"><span>Titular de Cuenta:</span><span>SEMAPA Recaudaciones</span></div>
<div class="r"><span>Referencia ACH (BNB):</span><span class="b">${txHash || 'TXN-PENDIENTE'}</span></div>
<div style="word-break:break-all;font-size:9px;margin-top:6px;background:#f0f7ff;color:#1e3a8a;padding:8px;border-radius:6px;border:1px solid #bfdbfe" class="c">
  <b>Estado de Compensación:</b><br>Operación liquipada y asentada en Cassandra de forma consistente (3/3 ciclos)
</div>
  `;

  const html = `<html><head><style>
body{font-family:monospace;padding:24px;width:${w}px;font-size:11px;line-height:1.4;background:#fff;color:#000}
.c{text-align:center}.b{font-weight:bold}.s{border-top:1px dashed #000;margin:10px 0}.r{display:flex;justify-content:space-between;margin:3px 0}
.logo{font-size:16px;font-weight:bold;text-align:center;color:#00346f}
.title{font-size:11px;font-weight:bold;text-align:center;margin-bottom:10px}
</style></head><body>
<div class="logo">💧 SEMAPA COCHABAMBA</div>
<div class="c">COMPROBANTE DE PAGO - PORTAL CIUDADANO (EXTRANET)</div>
<div class="s"></div>
<div class="r"><span>Nº Contrato:</span><span class="b">${i.contrato}</span></div>
<div class="r"><span>CI / NIT:</span><span>${i.ci}</span></div>
<div class="r"><span>Contribuyente:</span><span class="b">${i.nombre}</span></div>
<div class="r"><span>Categoría:</span><span>${i.categoria}</span></div>
<div class="r"><span>Medidor:</span><span>${i.medidorSerie}</span></div>
<div class="s"></div>
<div class="c b">DETALLES DEL COBRO EXTRANET</div>
<div class="s"></div>
${paidMonths.map(m => `<div class="r"><span>• Factura Mes ${m}:</span><span>Bs ${(totalBs / paidMonths.length).toFixed(2)}</span></div>`).join('')}
<div class="s"></div>
<div class="r b" style="font-size:13px"><span>TOTAL PAGADO:</span><span>Bs ${totalBs.toFixed(2)}</span></div>
${paymentDetailsHtml}
<div class="s"></div>
<div class="c" style="font-size:8px;color:#555">Fecha Impresión: ${new Date().toLocaleString('es-BO')}</div>
<div class="c" style="font-size:8px;color:#555">SEMAPA · Cochabamba, Bolivia • Pagos Electrónicos</div>
</body></html>`;
  const win = window.open('', '_blank', `width=${w+60},height=700`);
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
}

// ── Tarjeta de resultado con Pasarela de Pagos ──────────────────────────────────
function ResultadoCard({ inmueble, onRefresh }: { inmueble: Inmueble; onRefresh: () => void }) {
  const factura     = calcularFactura(inmueble.categoria, inmueble.consumoActualM3);
  const cfg         = ESTADO_CFG[inmueble.estadoServicio];
  
  const [open, setOpen] = useState(false);
  
  // Dynamic breakdown states
  const [breakdown, setBreakdown] = useState<DynamicBreakdown | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // Payment states
  const [isPaying, setIsPaying] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    intentId: string;
    metodo: 'bnb' | 'qr_simple';
    wallet?: string;
    cuentaBanco?: string;
    banco?: string;
    montoBnb?: number;
    montoBs: number;
    paymentUri: string;
    rate?: number;
  } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'esperando' | 'detectado' | 'completado'>('esperando');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchBreakdown = useCallback(async () => {
    setLoadingBreakdown(true);
    try {
      const response = await fetch(`${API_URL}/api/pagos/desglose/${inmueble.contrato}`);
      if (response.ok) {
        const data = await response.json();
        setBreakdown(data);
        // Pre-select oldest unpaid month by default if outstanding bills exist
        if (data.desgloseVencido && data.desgloseVencido.length > 0) {
          setSelectedMonths([data.desgloseVencido[0].periodo]);
        } else {
          // If "al-dia", pre-select the current month
          setSelectedMonths([data.facturaActual.periodo]);
        }
      }
    } catch (err) {
      console.warn('[Citizen Portal breakdown] Fallback mock data: ', err);
      // Fallback local calculations
      const mesesMora = inmueble.deudaTotal > 0 ? (inmueble.contrato === 'CBB-00448821' ? 6 : inmueble.contrato === 'CBB-00291122' ? 11 : 4) : 0;
      const desgloseSimulado: FacturaDesgloseItem[] = [];
      const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      
      let anio = 2025;
      let mesIdx = 3; // Abril
      const montoMensual = mesesMora > 0 ? parseFloat((inmueble.deudaTotal / mesesMora).toFixed(2)) : 0;
      
      for (let i = 0; i < mesesMora; i++) {
        desgloseSimulado.unshift({
          id: mesesMora - i,
          periodo: `${anio}-${String(mesIdx + 1).padStart(2, '0')}`,
          nombre: `${nombresMeses[mesIdx]} ${anio}`,
          monto: i === mesesMora - 1 ? parseFloat((inmueble.deudaTotal - (montoMensual * (mesesMora - 1))).toFixed(2)) : montoMensual,
          estado: 'vencido'
        });
        mesIdx--; if (mesIdx < 0) { mesIdx = 11; anio--; }
      }

      setBreakdown({
        contrato: inmueble.contrato,
        deudaTotal: inmueble.deudaTotal,
        mesesDeuda: mesesMora,
        desgloseVencido: desgloseSimulado,
        facturaActual: {
          periodo: '2025-05',
          nombre: 'Mayo 2025 (Mes Actual)',
          monto: factura.total,
          estado: 'pendiente'
        }
      });
      
      if (desgloseSimulado.length > 0) {
        setSelectedMonths([desgloseSimulado[0].periodo]);
      } else {
        setSelectedMonths(['2025-05']);
      }
    } finally {
      setLoadingBreakdown(false);
    }
  }, [inmueble, factura.total]);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  // Chronological sequential checkboxes logic
  const handleToggleMonth = (index: number) => {
    if (!breakdown) return;
    
    const allAvailable = [...breakdown.desgloseVencido, breakdown.facturaActual].filter(Boolean);
    const targetPeriod = allAvailable[index].periodo;
    
    if (selectedMonths.includes(targetPeriod)) {
      // Uncheck this month AND all subsequent months (enforcing chronological hierarchy)
      const newSelected = selectedMonths.filter(p => {
        const idx = allAvailable.findIndex(item => item.periodo === p);
        return idx < index;
      });
      // A customer must select at least one month if debt exists
      if (newSelected.length === 0 && allAvailable.length > 0) {
        setSelectedMonths([allAvailable[0].periodo]);
      } else {
        setSelectedMonths(newSelected);
      }
    } else {
      // Check this month AND all previous months (enforcing sequential order)
      const newSelected = allAvailable.slice(0, index + 1).map(item => item.periodo);
      setSelectedMonths(newSelected);
    }
  };

  const getSelectedMonthsSum = () => {
    if (!breakdown) return 0;
    const allAvailable = [...breakdown.desgloseVencido, breakdown.facturaActual].filter(Boolean);
    return selectedMonths.reduce((sum, p) => {
      const item = allAvailable.find(x => x.periodo === p);
      return sum + (item ? item.monto : 0);
    }, 0);
  };

  const totalSelectedBs = getSelectedMonthsSum();

  // Initiate Payment Intent (forces 'qr_simple' interbank BOB flow)
  const handleInitiatePayment = async (metodo: 'bnb' | 'qr_simple' = 'qr_simple') => {
    if (selectedMonths.length === 0) return;
    setIsPaying(true);
    setPaymentStatus('esperando');
    setConfirmations(0);
    setTxHash(null);
    setBlockNumber(null);
    setPaymentDetails(null);

    try {
      const res = await fetch(`${API_URL}/api/pagos/generar-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contrato: inmueble.contrato,
          meses: selectedMonths,
          montoBs: totalSelectedBs,
          metodo: 'qr_simple'
        })
      });
      const data = await res.json();
      if (data) {
        data.metodo = 'qr_simple';
        data.banco = 'Banco Nacional de Bolivia (BNB)';
        data.cuentaBanco = '3503205520';
        const qrSimplePayload = {
          action: 'payment',
          bank_account: '3503205520',
          bank_name: 'Banco Nacional de Bolivia (BNB)',
          recipient: 'SEMAPA - Recaudaciones Oficiales',
          amount: parseFloat(totalSelectedBs.toFixed(2)),
          currency: 'BOB',
          reference: `Pago Contrato ${inmueble.contrato} - Periodos: ${selectedMonths.join(', ')}`,
          intentId: data.intentId || 'pay_' + Date.now()
        };
        data.paymentUri = JSON.stringify(qrSimplePayload);
      }
      setPaymentDetails(data);
    } catch (err) {
      console.warn('[Payment Gateway Extranet] Fallback local conversion: ', err);
      // Fallback local calculations for offline state
      const cuentaBanco = '3503205520';
      const banco = 'Banco Nacional de Bolivia (BNB)';
      const beneficiario = 'SEMAPA - Recaudaciones Oficiales';
      const qrSimplePayload = {
        action: 'payment',
        bank_account: cuentaBanco,
        bank_name: banco,
        recipient: beneficiario,
        amount: parseFloat(totalSelectedBs.toFixed(2)),
        currency: 'BOB',
        reference: `Pago Contrato ${inmueble.contrato} - Periodos: ${selectedMonths.join(', ')}`,
        intentId: 'pay_mock_' + Date.now()
      };
      setPaymentDetails({
        intentId: qrSimplePayload.intentId,
        metodo: 'qr_simple',
        cuentaBanco,
        banco,
        montoBs: totalSelectedBs,
        paymentUri: JSON.stringify(qrSimplePayload)
      });
    }
  };

  // Simulate payment broadcast (from crypto wallet app or bank app)
  const handleSimulatePaymentBroadcast = async () => {
    if (!paymentDetails) return;
    setVerifying(true);

    try {
      const res = await fetch(`${API_URL}/api/pagos/generar-transaccion-simulada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: paymentDetails.intentId })
      });
      const data = await res.json();
      setTxHash(data.txHash);
      setBlockNumber(data.blockNumber || null);
      setPaymentStatus('detectado');
      setConfirmations(0);
      
      let currentConfirmations = 0;
      const pollInterval = setInterval(async () => {
        try {
          const checkRes = await fetch(`${API_URL}/api/pagos/verificar/${data.txHash}`);
          const checkData = await checkRes.json();
          currentConfirmations = checkData.confirmations;
          setConfirmations(currentConfirmations);
          
          if (checkData.status === 'completado' || currentConfirmations >= 3) {
            clearInterval(pollInterval);
            setPaymentStatus('completado');
            setVerifying(false);
          }
        } catch (err) {
          console.warn('[Extranet Poll Error]', err);
          currentConfirmations++;
          setConfirmations(currentConfirmations);
          if (currentConfirmations >= 3) {
            clearInterval(pollInterval);
            setPaymentStatus('completado');
            setVerifying(false);
          }
        }
      }, 1500);

    } catch (err) {
      console.warn('[Broadcast failed] Using local fallback mock', err);
      if (paymentDetails.metodo === 'qr_simple') {
        const txRef = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
        setTxHash(txRef);
        setBlockNumber(null);
        setPaymentStatus('detectado');
        
        let count = 0;
        const t = setInterval(() => {
          count++;
          setConfirmations(count);
          if (count >= 3) {
            clearInterval(t);
            setPaymentStatus('completado');
            setVerifying(false);
          }
        }, 1200);
      } else {
        const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setTxHash(mockHash);
        setBlockNumber(38550119);
        setPaymentStatus('detectado');
        
        let count = 0;
        const t = setInterval(() => {
          count++;
          setConfirmations(count);
          if (count >= 3) {
            clearInterval(t);
            setPaymentStatus('completado');
            setVerifying(false);
          }
        }, 1200);
      }
    }
  };

  const copyToClipboard = () => {
    if (!paymentDetails) return;
    navigator.clipboard.writeText(paymentDetails.wallet || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinishPayment = () => {
    setIsPaying(false);
    setPaymentDetails(null);
    setTxHash(null);
    setConfirmations(0);
    setPaymentStatus('esperando');
    // Reload data in parent
    onRefresh();
  };

  const openWhatsAppChat = async () => {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/chat-link`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
        return;
      }
      throw new Error('Sin URL');
    } catch {
      window.open('https://wa.me/59162658425', '_blank');
    }
  };

  const triggerNotification = async (channel: 'sms' | 'email') => {
    let destination = '';
    if (channel === 'email') {
      destination = prompt('Ingresa tu dirección de correo electrónico:', 'ciudadano@semapa.gob.bo') || '';
      if (!destination) return;
    } else {
      destination = '+59162658425';
    }

    try {
      const response = await fetch(`${API_URL}/api/notificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canal: channel,
          contrato: inmueble.contrato,
          periodo: breakdown?.facturaActual.periodo || '2025-05',
          destino: destination
        })
      });
      
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        alert(`📬 ${data.message || `Notificación ${channel.toUpperCase()} enviada.`}`);
      } else {
        alert(`❌ ${data.error || 'Error al notificar'}`);
      }
    } catch (e) {
      console.warn('[Notification error]', e);
      alert(`No se pudo enviar ${channel.toUpperCase()}. API: ${API_URL}`);
    }
  };

  const total = factura.total + inmueble.deudaTotal;

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-outline-variant animate-in fade-in slide-in-from-bottom-4 duration-400">
      {/* Header */}
      <div className="px-6 py-5 flex items-start justify-between border-b border-outline-variant"
        style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.06),rgba(6,182,212,0.04))' }}>
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

      {/* Sequential Checklist for Chronological Monthly Breakdown */}
      <div className="px-6 pb-5 space-y-4">
        <div className="rounded-xl p-4 bg-surface-container-low/50 border border-outline-variant space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" /> Planificación de Pago de Facturas en Orden
              </p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Elige los periodos cronológicamente para habilitar tu código QR de BNB</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">
              {selectedMonths.length} seleccionado(s)
            </span>
          </div>

          {loadingBreakdown ? (
            <div className="flex items-center justify-center py-4 text-xs text-on-surface-variant gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Cargando desglose financiero...
            </div>
          ) : breakdown ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {/* Unpaid historical breakdown */}
              {breakdown.desgloseVencido.map((m, idx) => {
                const isChecked = selectedMonths.includes(m.periodo);
                return (
                  <div key={m.periodo}
                    onClick={() => handleToggleMonth(idx)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                      isChecked 
                        ? "bg-primary/10 border-primary text-primary" 
                        : "bg-surface-container-lowest border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low"
                    )}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        isChecked ? "bg-primary border-primary text-on-primary" : "border-outline-variant"
                      )}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3px]" />}
                      </div>
                      <div>
                        <span>{m.nombre}</span>
                        <span className="ml-2 text-[9px] text-error bg-error-container/10 px-1 rounded uppercase tracking-wider font-bold">Mora</span>
                      </div>
                    </div>
                    <span className="font-mono text-on-surface">Bs {m.monto.toFixed(2)}</span>
                  </div>
                );
              })}

              {/* Current Month */}
              {breakdown.facturaActual && (() => {
                const isChecked = selectedMonths.includes(breakdown.facturaActual.periodo);
                const canToggleCurrent = breakdown.desgloseVencido.every(m => selectedMonths.includes(m.periodo));
                const idxCurrent = breakdown.desgloseVencido.length;

                return (
                  <div
                    onClick={() => canToggleCurrent && handleToggleMonth(idxCurrent)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-xs font-bold transition-all",
                      isChecked 
                        ? "bg-primary/10 border-primary text-primary cursor-pointer" 
                        : canToggleCurrent 
                          ? "bg-surface-container-lowest border-outline-variant text-on-surface cursor-pointer hover:bg-surface-container-low" 
                          : "opacity-45 bg-surface-container-lowest border-outline-variant/20 cursor-not-allowed text-on-surface-variant/40"
                    )}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        isChecked ? "bg-primary border-primary text-on-primary" : "border-outline-variant"
                      )}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3px]" />}
                      </div>
                      <div>
                        <span>{breakdown.facturaActual.nombre}</span>
                        <span className="ml-2 text-[9px] text-cyan-400 bg-cyan-450/10 px-1 rounded uppercase tracking-wider font-bold">Mes en Curso</span>
                      </div>
                    </div>
                    <span className="font-mono text-on-surface">Bs {breakdown.facturaActual.monto.toFixed(2)}</span>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-on-surface-variant italic">No se recuperaron facturas pendientes.</div>
          )}

          {/* Sequential constraint warning */}
          <div className="p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/15 flex items-start gap-2 text-[10px] text-yellow-300/80 leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-yellow-400 mt-0.5" />
            <p><strong>Aviso de Cobranza:</strong> La imputación de pagos se realiza rigurosamente en orden de vencimiento, cancelando primero las facturas más antiguas.</p>
          </div>
        </div>
      </div>

      {/* Factura Summary collapse */}
      <div className="px-6 pb-5">
        <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Tarifador de Detalle (Consumo: {inmueble.consumoActualM3} m³)
            </span>
            <button onClick={()=>setOpen(o=>!o)} className="flex items-center gap-1 text-[10px] font-bold text-primary">
              Ver Tramos <ChevronDown className={cn('w-3 h-3 transition-transform', open?'rotate-180':'')}/>
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
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Seleccionado a Cancelar</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-primary">Bs {totalSelectedBs.toFixed(2)}</span>
              {selectedMonths.length === 0 && <p className="text-[10px] text-error font-bold mt-0.5">Selecciona al menos 1 mes</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-t border-outline-variant bg-surface-container-low/20 w-full">
        <button 
          onClick={() => handleInitiatePayment('qr_simple')}
          disabled={selectedMonths.length === 0}
          className="flex items-center gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white px-6 py-3.5 rounded-xl text-xs font-black shadow-lg active:scale-97 transition-all disabled:opacity-30 disabled:pointer-events-none">
          <CreditCard className="w-4 h-4 animate-pulse" /> PAGAR CON QR SIMPLE (BANCO BNB)
        </button>

        <button onClick={()=>generarRecibo(inmueble,'media-carta')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface transition-all">
          <FileText className="w-4 h-4"/> Recibo Carta
        </button>
        <button onClick={()=>generarRecibo(inmueble,'rollo')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface transition-all">
          <Printer className="w-4 h-4"/> Ticket Térmico
        </button>
        
        <div className="h-6 w-px bg-outline-variant mx-1"/>
        <button
          onClick={openWhatsAppChat}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all hover:opacity-90"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)' }}>
          <MessageSquare className="w-4 h-4" /> WhatsApp (Evolution)
        </button>
        {[
          { channel: 'sms' as const,   Icon:Phone, label:'SMS',   c:'#60a5fa' },
          { channel: 'email' as const, Icon:Mail,  label:'Email', c:'#a78bfa' },
        ].map(({channel,Icon,label,c})=>(
          <button key={label}
            onClick={() => triggerNotification(channel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{background:`${c}18`,color:c,border:`1px solid ${c}30`}}>
            <Icon className="w-3.5 h-3.5"/> {label}
          </button>
        ))}
      </div>

      {/* ─── PREMIUM PAGO CON QR SIMPLE (BANCO BNB) MODAL ──────────────── */}
      {isPaying && (
        <div className="fixed inset-0 z-50 bg-[#02050b]/90 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-gradient-to-b from-[#09152a] to-[#040a15] rounded-[32px] border border-white/10 p-6 flex flex-col md:flex-row gap-6 shadow-2xl relative animate-in zoom-in-95 duration-300 text-white">
            
            {/* Close button */}
            {!verifying && paymentStatus !== 'completado' && (
              <button 
                onClick={() => setIsPaying(false)}
                className="absolute right-4 top-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Left Column: QR and transaction details */}
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <div className="flex items-center gap-2 mb-3 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-xs font-bold uppercase tracking-wider animate-pulse">
                <CreditCard className="w-4 h-4" /> Pasarela QR Simple / Banco BNB Activa
              </div>
              
              <h3 className="text-2xl font-black text-white leading-none">
                Recaudación QR Simple (Banco BNB)
              </h3>
              <p className="text-xs text-blue-200/50 mt-1">
                Escanea para pagar la factura seleccionada desde la app móvil del Banco Nacional de Bolivia (BNB)
              </p>
              <div className="mt-3 text-[10px] text-amber-300 font-bold bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20 max-w-sm text-center animate-pulse">
                ⚠ Nota de Desarrollo: Tu app bancaria real dará "QR Inválido" al estar en entorno local de pruebas (localhost). Usa el "Simulador de Transferencia Bancaria" a la derecha para completar la transacción académicamente.
              </div>

              {/* Dynamic QR Display */}
              {paymentDetails ? (
                <div className="mt-5 p-4 bg-white rounded-3xl relative shadow-2xl">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=04-09-19&data=${encodeURIComponent(paymentDetails.paymentUri)}`} 
                    alt="Payment QR"
                    className="w-44 h-44"
                  />
                  <div className="absolute inset-0 border-4 border-blue-500/30 rounded-3xl pointer-events-none animate-pulse" />
                </div>
              ) : (
                <div className="mt-5 w-44 h-44 rounded-3xl bg-white/5 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                </div>
              )}

              {paymentDetails && (
                <div className="mt-5 space-y-2.5 w-full text-left">
                  {/* Amount boxes */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Moneda</p>
                      <p className="text-base font-black font-mono text-blue-400">BOB (Bolivianos)</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total a Transferir</p>
                      <p className="text-base font-black font-mono text-white">Bs {totalSelectedBs.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Recipient details */}
                  <div className="bg-[#02060d] rounded-2xl p-3 border border-white/10 flex flex-col gap-1 text-left w-full">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1.5 mb-1">
                      <div>
                        <p className="text-[9px] text-white/40 uppercase tracking-wider font-bold">Cuenta Destino Banco BNB</p>
                        <p className="text-xs font-mono text-cyan-400 font-bold">3503205520</p>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('3503205520');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white active:bg-white/10 transition-all">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider font-bold">Beneficiario Titular</p>
                      <p className="text-xs text-white font-semibold">SEMAPA Recaudaciones</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live ACH monitor & simulation */}
            <div className="flex-1 flex flex-col justify-between p-4 border-t md:border-t-0 md:border-l border-white/10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                    Monitor de Compensación Interbancaria ACH
                  </p>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
                    <span className="w-1.5 h-1.5 rounded-full animate-ping bg-blue-400" />
                    ONLINE (ACH/BNB)
                  </span>
                </div>

                {/* Status list */}
                <div className="bg-[#02060d] rounded-3xl p-4 border border-white/5 space-y-3.5 text-left">
                  {/* Status item 1 */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow",
                      paymentStatus === 'esperando' ? "bg-yellow-500/20 text-yellow-400 border border-yellow-400/30" : "bg-green-500/20 text-green-400 border border-green-400/30"
                    )}>
                      {paymentStatus === 'esperando' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3px]" />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">
                        1. Esperando Transferencia Bancaria
                      </p>
                      <p className="text-[10px] text-white/40">
                        Esperando escaneo y envío desde la app móvil del banco...
                      </p>
                    </div>
                  </div>

                  {/* Status item 2 */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow",
                      paymentStatus === 'esperando' ? "bg-white/5 text-white/20 border border-white/5" :
                      paymentStatus === 'detectado' ? "bg-blue-500/20 text-blue-400 border border-blue-400/30" : "bg-green-500/20 text-green-400 border border-green-400/30"
                    )}>
                      {paymentStatus === 'esperando' ? '2' : paymentStatus === 'detectado' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3px]" />}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-xs font-bold", paymentStatus === 'esperando' ? "text-white/25" : "text-white")}>
                        2. Operación de Pago Detectada
                      </p>
                      {txHash ? (
                        <p className="text-[9px] font-mono text-cyan-400/70 tracking-tighter truncate max-w-[200px]">
                          Ref. ACH: {txHash}
                        </p>
                      ) : (
                        <p className="text-[10px] text-white/30">
                          Esperando referencia bancaria...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status item 3 */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow",
                      paymentStatus !== 'completado' ? "bg-white/5 text-white/20 border border-white/5" : "bg-green-500/20 text-green-400 border border-green-400/30"
                    )}>
                      {paymentStatus !== 'completado' ? '3' : <Check className="w-4 h-4 stroke-[3px]" />}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-xs font-bold", paymentStatus !== 'completado' ? "text-white/25" : "text-white")}>
                        3. Verificación Híbrida & Cassandra
                      </p>
                      <p className="text-[10px] text-white/40">
                        {paymentStatus === 'detectado' ? (
                          <span className="text-blue-400 font-bold animate-pulse">Compensación ACH Interbancaria: Ciclo {confirmations}/3</span>
                        ) : paymentStatus === 'completado' ? (
                          <span className="text-green-400 font-bold">¡Guardado en Cassandra de forma consistente!</span>
                        ) : 'En espera de confirmación...'}
                      </p>
                    </div>
                  </div>
                </div>

                {txHash && (
                  <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-mono text-white/50 flex flex-col gap-1 text-left">
                    <p>Banco Originador: Entidad ACH de Envío</p>
                    <p>Ciclo Cámara Compensación: Liquidación Inmediata</p>
                  </div>
                )}
              </div>

              {/* Simulation Area */}
              <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
                {paymentStatus === 'esperando' && (
                  <div className="p-3.5 rounded-2.5xl bg-blue-950/40 border border-blue-500/20 text-left animate-in fade-in duration-300">
                    <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 animate-pulse" />
                      Simulador de Transferencia Bancaria QR
                    </p>
                    <p className="text-[10px] text-blue-200/60 leading-snug">
                      Para fines académicos y de validación de sistema, presiona el botón de abajo para simular la transferencia interbancaria ACH desde tu banca móvil.
                    </p>
                    
                    <button 
                      onClick={handleSimulatePaymentBroadcast}
                      className="mt-3 w-full py-3.5 rounded-xl font-black text-xs text-white uppercase tracking-wider bg-gradient-to-r from-blue-600 to-cyan-500 active:scale-95 transition-all shadow-lg hover:brightness-110">
                      ⚡ COMPENSAR TRANSFERENCIA ACH (SIMULADA)
                    </button>
                  </div>
                )}

                {paymentStatus === 'detectado' && (
                  <div className="p-4 rounded-2.5xl bg-blue-900/10 border border-blue-500/20 text-center flex flex-col items-center justify-center py-6">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-2" />
                    <p className="text-sm font-black text-white">
                      Compensando Cámara Interbancaria
                    </p>
                    <p className="text-xs text-white/55 mt-0.5">
                      Esperando el asentamiento de los 3 ciclos de compensación de Banco de la Unión...
                    </p>
                  </div>
                )}

                {paymentStatus === 'completado' && (
                  <div className="p-4 rounded-2.5xl bg-green-500/10 border border-green-500/25 text-center flex flex-col items-center justify-center py-6 animate-in zoom-in duration-300">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-2.5 border border-green-500/40 shadow-lg">
                      <Check className="w-7 h-7 stroke-[3px]" />
                    </div>
                    <p className="text-lg font-black text-white">
                      ¡Pago por QR Bancario Exitoso!
                    </p>
                    <p className="text-xs text-green-400/80 font-medium">El cobro se ha registrado y descontado en Apache Cassandra.</p>

                    <div className="space-y-2 mt-4 w-full">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => printReciboConCripto(inmueble, selectedMonths, totalSelectedBs, 'qr_simple', undefined, txHash || '')}
                          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs active:scale-95 transition-all hover:bg-white/10">
                          <Printer className="w-4 h-4" /> Ticket
                        </button>
                        <button 
                          onClick={() => printReciboConCripto(inmueble, selectedMonths, totalSelectedBs, 'qr_simple', undefined, txHash || '')}
                          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs active:scale-95 transition-all hover:bg-white/10">
                          <FileText className="w-4 h-4" /> Recibo PDF
                        </button>
                      </div>
                      <button 
                        onClick={handleFinishPayment}
                        className="w-full py-3 rounded-xl bg-green-600 text-white font-black text-sm active:scale-95 transition-all hover:brightness-110 shadow-lg">
                        Finalizar Pago
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CitizenPortal() {
  const [query,   setQuery]   = useState('');
  const [result,  setResult]  = useState<Inmueble | null>(null);
  const [notFound,setNotFound]= useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) { setError('Ingresa un Nº de Contrato, CI o Serie de Medidor.'); return; }
    if (q.length < 5) { setError('La búsqueda debe tener al menos 5 caracteres.'); return; }
    setError(null);
    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/totem/buscar?q=${q}`);
      if (!response.ok) {
        throw new Error('Not found in Cassandra');
      }
      const data = await response.json();
      setResult(data.inmueble);
    } catch (err) {
      console.warn('[Citizen Search Portal] Fallback mock search: ', err);
      // Fallback local search
      const found = buscarInmueble(q);
      setResult(found);
      setNotFound(!found);
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-2xl font-bold text-on-surface mt-0.5">Consulta de Estado de Cuenta y Criptopagos</h2>
        <p className="text-sm text-on-surface-variant">Busca tu contrato, divide tu deuda morosa en cuotas y paga de forma segura con BNB/BSC</p>
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

      {/* Resultado */}
      {result && <ResultadoCard inmueble={result} onRefresh={handleSearch} />}

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
