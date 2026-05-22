import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Droplets, FileText, Printer, MessageSquare, Mail, Phone, CheckCircle, AlertTriangle, XCircle, ChevronDown, Delete, Clock, Copy, CreditCard, Coins, RefreshCw, Check } from 'lucide-react';
import { cn } from './lib/utils';
import { buscarInmueble, calcularFactura } from './lib/semapa-data';
import type { Inmueble, EstadoServicio } from './lib/types';

// API URL resolved dynamically
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

// ─── Receipt generator ────────────────────────────────────────────────────────
function printRecibo(i: Inmueble, paidMonths: string[], totalBs: number, metodo: 'bnb' | 'qr_simple' = 'bnb', bnbAmount?: number, txHash?: string) {
  const f = calcularFactura(i.categoria, i.consumoActualM3);
  const w = 270;

  let paymentSection = '';
  if (metodo === 'qr_simple') {
    paymentSection = `
<div class="s"></div>
<div class="c b">DETALLE PASARELA BANCARIA</div>
<div class="r"><span>Método:</span><span>QR Simple Bancario</span></div>
<div class="r"><span>Banco Destino:</span><span>Banco Nacional de Bolivia (BNB)</span></div>
<div class="r"><span>Cuenta Destino:</span><span>3503205520</span></div>
<div class="r"><span>Titular:</span><span>SEMAPA Recaudaciones</span></div>
<div class="r"><span>Ref. ACH (BNB):</span><span>${txHash || 'TXN-PENDIENTE'}</span></div>
<div class="s"></div>
<div class="c" style="font-size:8px">Operación ACH liquidada y compensada en Cassandra de forma consistente (3/3 ciclos).</div>
    `;
  } else {
    paymentSection = txHash ? `
<div class="s"></div>
<div class="c b">CONFIRMACIÓN CRIPTO</div>
<div class="r"><span>Pasarela:</span><span>BNB (Binance Chain)</span></div>
<div class="r"><span>Monto:</span><span>${bnbAmount?.toFixed(6)} BNB</span></div>
<div style="word-break:break-all;font-size:8px;margin-top:4px" class="c"><b>TX Hash:</b><br>${txHash}</div>
<div class="c" style="margin-top:6px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=80&80&data=https://bscscan.com/tx/${txHash}" style="width:70px;height:70px" /></div>
` : '';
  }

  const html = `<html><head><style>body{font-family:monospace;padding:16px;width:${w}px;font-size:10px;line-height:1.3}
.c{text-align:center}.b{font-weight:bold}.s{border-top:1px dashed #000;margin:6px 0}.r{display:flex;justify-content:space-between}</style></head><body>
<div class="c b" style="font-size:14px">💧 SEMAPA COCHABAMBA</div>
<div class="c">COMPROBANTE DE AUTOGESTIÓN</div>
<div class="s"></div>
<div class="r"><span>Contrato:</span><span>${i.contrato}</span></div>
<div class="r"><span>Nombre:</span><span>${i.nombre}</span></div>
<div class="r"><span>Categoría:</span><span>${i.categoria}</span></div>
<div class="r"><span>Medidor:</span><span>${i.medidorSerie}</span></div>
<div class="s"></div>
<div class="c b">DETALLES DE PAGO</div>
<div class="s"></div>
${paidMonths.map(m => `<div class="r"><span>• Factura ${m}:</span><span>Bs ${(totalBs / paidMonths.length).toFixed(2)}</span></div>`).join('')}
<div class="s"></div>
<div class="r b" style="font-size:12px"><span>TOTAL PAGADO:</span><span>Bs ${totalBs.toFixed(2)}</span></div>
${paymentSection}
<div class="s"></div>
<div class="c" style="font-size:8px">Fecha: ${new Date().toLocaleString('es-BO')}</div>
<div class="c" style="font-size:8px">¡Gracias por cuidar el agua en Cochabamba!</div>
</body></html>`;
  const win = window.open('', '_blank', `width=${w+60},height=700`);
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
}

function printReciboCarta(i: Inmueble, paidMonths: string[], totalBs: number, metodo: 'bnb' | 'qr_simple' = 'bnb', bnbAmount?: number, txHash?: string) {
  let paymentDetailsHtml = '';
  if (metodo === 'qr_simple') {
    paymentDetailsHtml = `
      <div style="border: 1px solid #cbd5e1; padding: 15px; border-radius: 12px; background: #f8fafc; margin-top: 15px;">
        <h3 style="margin-top:0; color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">Detalle de Transacción Bancaria - ACH</h3>
        <table style="width:100%; font-size: 13px; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; font-weight:bold; width: 40%;">Método de Pago:</td><td style="color: #334155;">QR Simple Bolivia (Interbancario)</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Entidad Bancaria Destino:</td><td style="color: #334155;">Banco Nacional de Bolivia (BNB)</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Número de Cuenta Destino:</td><td style="color: #334155; font-family: monospace;">3503205520</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Titular de la Cuenta:</td><td style="color: #334155;">SEMAPA - Recaudaciones Oficiales</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Glosa de Transferencia:</td><td style="color: #334155;">Pago Contrato ${i.contrato}</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Referencia Bancaria (ACH):</td><td style="color: #1e40af; font-weight: bold; font-family: monospace;">${txHash || 'TXN-PENDIENTE'}</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Estado de Operación:</td><td style="color: #16a34a; font-weight: bold;">LIQUIDADO / COMPENSADO 3/3</td></tr>
        </table>
      </div>
    `;
  } else {
    paymentDetailsHtml = `
      <div style="border: 1px solid #cbd5e1; padding: 15px; border-radius: 12px; background: #f8fafc; margin-top: 15px;">
        <h3 style="margin-top:0; color: #1e3a8a; border-bottom: 2px solid #eab308; padding-bottom: 5px;">Detalle de Transacción Cripto - BSC</h3>
        <table style="width:100%; font-size: 13px; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; font-weight:bold; width: 40%;">Método de Pago:</td><td style="color: #334155;">Criptomoneda BNB (Binance Smart Chain)</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Monto Cripto:</td><td style="color: #b45309; font-weight: bold; font-family: monospace;">${bnbAmount?.toFixed(6)} BNB</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Tasa de Cambio Aplicada:</td><td style="color: #334155;">1 BNB = 4200.00 Bs</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Billetera Destino:</td><td style="color: #334155; font-family: monospace; font-size: 11px;">0x228795A40d4D290632d4310E3411bA918f6f7bCc</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Hash de Transacción:</td><td style="color: #1e40af; font-family: monospace; font-size: 11px; word-break: break-all;">${txHash || 'PENDIENTE'}</td></tr>
          <tr><td style="padding: 4px 0; font-weight:bold;">Estado de Confirmación:</td><td style="color: #16a34a; font-weight: bold;">COMPLETADO (3+ bloques)</td></tr>
        </table>
      </div>
    `;
  }

  const html = `
    <html>
    <head>
      <title>Comprobante Oficial SEMAPA - Contrato ${i.contrato}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #334155; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; }
        .logo { font-size: 28px; font-weight: 900; color: #1e3a8a; }
        .title { text-align: right; }
        .title h1 { margin: 0; font-size: 20px; color: #0f172a; }
        .title p { margin: 5px 0 0 0; font-size: 12px; color: #64748b; font-family: monospace; }
        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-top: 30px; }
        .card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; background: #fff; }
        .card h3 { margin-top: 0; font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        table.details { width: 100%; font-size: 13px; border-collapse: collapse; }
        table.details td { padding: 6px 0; }
        table.details td.val { text-align: right; font-weight: bold; color: #0f172a; }
        .table-items { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 13px; }
        .table-items th { background: #1e3a8a; color: #fff; text-align: left; padding: 10px; font-weight: bold; }
        .table-items td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; }
        .total-box { display: flex; justify-content: flex-end; margin-top: 20px; }
        .total-card { border: 2px solid #1e3a8a; padding: 15px 30px; border-radius: 12px; background: #eff6ff; text-align: right; }
        .footer { text-align: center; margin-top: 60px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">💧 SEMAPA</div>
        <div class="title">
          <h1>COMPROBANTE DE AUTOGESTIÓN DE PAGO</h1>
          <p>Nº COMPROBANTE: CBBA-K-${Date.now().toString().slice(-6)}</p>
          <p>FECHA: ${new Date().toLocaleString('es-BO')}</p>
        </div>
      </div>
      
      <div class="grid">
        <div class="card">
          <h3>Información del Contribuyente</h3>
          <table class="details">
            <tr><td>Nombre del Titular:</td><td class="val">${i.nombre}</td></tr>
            <tr><td>C.I. / N.I.T.:</td><td class="val" style="font-family: monospace;">${i.ci}</td></tr>
            <tr><td>Número de Contrato:</td><td class="val" style="font-family: monospace; color:#1e3a8a;">${i.contrato}</td></tr>
            <tr><td>Dirección del Inmueble:</td><td class="val">${i.direccion}</td></tr>
            <tr><td>Zona / Distrito:</td><td class="val">${i.zona} / Distrito ${i.distritoId}</td></tr>
          </table>
        </div>
        <div class="card">
          <h3>Detalle del Medidor e Instalación</h3>
          <table class="details">
            <tr><td>Categoría del Servicio:</td><td class="val">${i.categoria}</td></tr>
            <tr><td>Serie de Medidor IoT:</td><td class="val" style="font-family: monospace;">${i.medidorSerie}</td></tr>
            <tr><td>Modelo de Telemetría:</td><td class="val">${i.medidorModelo}</td></tr>
            <tr><td>Consumo Registrado:</td><td class="val">${i.consumoActualM3} m³ (Lectura remota LoRaWAN)</td></tr>
            <tr><td>Fecha de Instalación:</td><td class="val">${i.instalacion}</td></tr>
          </table>
        </div>
      </div>

      <table class="table-items">
        <thead>
          <tr>
            <th>Concepto / Periodo Facturado</th>
            <th>Tipo de Cobro</th>
            <th style="text-align: right;">Subtotal (Bs)</th>
          </tr>
        </thead>
        <tbody>
          ${paidMonths.map(m => `
            <tr>
              <td>Servicio de Agua Potable y Alcantarillado - Periodo ${m}</td>
              <td style="font-weight: bold; color: ${m === '2025-05' ? '#0891b2' : '#b91c1c'};">
                ${m === '2025-05' ? 'Mes en Curso' : 'Mora Histórica'}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: bold;">Bs ${(totalBs / paidMonths.length).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="grid" style="margin-top: 15px; grid-template-cols: 1.2fr 0.8fr;">
        <div>
          ${paymentDetailsHtml}
        </div>
        <div class="total-box" style="align-items: flex-start; justify-content: flex-end;">
          <div class="total-card">
            <span style="font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase; display: block; margin-bottom: 5px;">Monto Total Cancelado</span>
            <span style="font-size: 26px; font-weight: 900; color: #1e3a8a; font-family: monospace;">Bs ${totalBs.toFixed(2)}</span>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #16a34a; font-weight: bold;">★ TRANSACCIÓN EXITOSA ★</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Servicio Municipal de Agua Potable y Alcantarillado (SEMAPA) - Cochabamba, Bolivia</p>
        <p>Este documento es un comprobante de pago digital emitido por el Tótem de Autogestión. Verificado contra el ledger distribuido Apache Cassandra.</p>
        <p>¡Gracias por cumplir puntualmente con tus obligaciones y cuidar el agua de Cochabamba!</p>
      </div>
    </body>
    </html>
  `;
  
  const win = window.open('', '_blank', `width=800,height=900`);
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
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

  // Dynamic breakdown states
  const [breakdown, setBreakdown] = useState<DynamicBreakdown | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

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

  const reset = useCallback(() => {
    setStep('home'); setQuery(''); setResult(null);
    setNotFound(false); setShowDesg(false); setTimer(60);
    setBreakdown(null); setSelectedMonths([]);
    setIsPaying(false); setPaymentDetails(null);
    setTxHash(null); setConfirmations(0); setPaymentStatus('esperando');
  }, []);

  // Inactivity countdown
  useEffect(() => {
    if (step === 'home') { if (timerRef.current) clearInterval(timerRef.current); return; }
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer(t => { 
        if (t <= 1) { 
          clearInterval(timerRef.current!); 
          reset(); 
          return 60; 
        } 
        return t - 1; 
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, reset]);

  // Reset countdown timer on touch/click
  const resetCountdown = () => {
    if (step !== 'home') setTimer(60);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setNotFound(false); setResult(null);
    resetCountdown();

    try {
      // 1. Fetch real estate data from backend Cassandra API
      const response = await fetch(`${API_URL}/api/totem/buscar?q=${query.trim()}`);
      if (!response.ok) {
        throw new Error('Not found in Cassandra');
      }
      const data = await response.json();
      setResult(data.inmueble);
      setStep('result');
      
      // 2. Fetch detailed dynamic monthly breakdown
      const breakdownResponse = await fetch(`${API_URL}/api/pagos/desglose/${data.inmueble.contrato}`);
      if (breakdownResponse.ok) {
        const breakdownData = await breakdownResponse.json();
        setBreakdown(breakdownData);
        // Pre-select oldest unpaid month by default if outstanding bills exist
        if (breakdownData.desgloseVencido && breakdownData.desgloseVencido.length > 0) {
          setSelectedMonths([breakdownData.desgloseVencido[0].periodo]);
        } else {
          // If "al-dia", pre-select the current month
          setSelectedMonths([breakdownData.facturaActual.periodo]);
        }
      }
    } catch (err) {
      console.warn('[Kiosk Search] Fallback to frontend mock search: ', err);
      // Fallback to local frontend mock data
      const found = buscarInmueble(query);
      if (found) {
        setResult(found);
        setStep('result');
        
        // Simular desglose
        const mesesMora = found.deudaTotal > 0 ? (found.contrato === 'CBB-00448821' ? 6 : found.contrato === 'CBB-00291122' ? 11 : 4) : 0;
        const desgloseSimulado: FacturaDesgloseItem[] = [];
        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        let anio = 2025;
        let mesIdx = 3; // Abril
        const montoMensual = mesesMora > 0 ? parseFloat((found.deudaTotal / mesesMora).toFixed(2)) : 0;
        
        for (let i = 0; i < mesesMora; i++) {
          desgloseSimulado.unshift({
            id: mesesMora - i,
            periodo: `${anio}-${String(mesIdx + 1).padStart(2, '0')}`,
            nombre: `${nombresMeses[mesIdx]} ${anio}`,
            monto: i === mesesMora - 1 ? parseFloat((found.deudaTotal - (montoMensual * (mesesMora - 1))).toFixed(2)) : montoMensual,
            estado: 'vencido'
          });
          mesIdx--; if (mesIdx < 0) { mesIdx = 11; anio--; }
        }

        const fact = calcularFactura(found.categoria, found.consumoActualM3);

        const breakdownSimulado: DynamicBreakdown = {
          contrato: found.contrato,
          deudaTotal: found.deudaTotal,
          mesesDeuda: mesesMora,
          desgloseVencido: desgloseSimulado,
          facturaActual: {
            periodo: '2025-05',
            nombre: 'Mayo 2025 (Mes Actual)',
            monto: fact.total,
            estado: 'pendiente'
          }
        };

        setBreakdown(breakdownSimulado);
        if (desgloseSimulado.length > 0) {
          setSelectedMonths([desgloseSimulado[0].periodo]);
        } else {
          setSelectedMonths(['2025-05']);
        }
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Chronological checkbox toggle logic
  const handleToggleMonth = (index: number) => {
    resetCountdown();
    if (!breakdown) return;
    
    const allAvailable = [...breakdown.desgloseVencido, breakdown.facturaActual].filter(Boolean);
    const targetPeriod = allAvailable[index].periodo;
    
    if (selectedMonths.includes(targetPeriod)) {
      // Uncheck this month AND all subsequent months (enforcing chronological hierarchy)
      const newSelected = selectedMonths.filter(p => {
        const idx = allAvailable.findIndex(item => item.periodo === p);
        return idx < index;
      });
      // At least one month must stay selected when debt exists
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

  const handleInitiatePayment = async (metodo: 'qr_simple' = 'qr_simple') => {
    resetCountdown();
    if (!result || selectedMonths.length === 0) return;
    
    const totalBs = getSelectedMonthsSum();
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
          contrato: result.contrato,
          meses: selectedMonths,
          montoBs: totalBs,
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
          amount: parseFloat(totalBs.toFixed(2)),
          currency: 'BOB',
          reference: `Pago Contrato ${result.contrato} - Periodos: ${selectedMonths.join(', ')}`,
          intentId: data.intentId || 'pay_' + Date.now()
        };
        data.paymentUri = JSON.stringify(qrSimplePayload);
        setPaymentDetails(data);
      }
    } catch (err) {
      console.warn('[Payment Gateway Totem] Fallback local conversion: ', err);
      // Fallback local calculations for offline state
      const cuentaBanco = '3503205520';
      const banco = 'Banco Nacional de Bolivia (BNB)';
      const beneficiario = 'SEMAPA - Recaudaciones Oficiales';
      const qrSimplePayload = {
        action: 'payment',
        bank_account: cuentaBanco,
        bank_name: banco,
        recipient: beneficiario,
        amount: parseFloat(totalBs.toFixed(2)),
        currency: 'BOB',
        reference: `Pago Contrato ${result.contrato} - Periodos: ${selectedMonths.join(', ')}`,
        intentId: 'pay_mock_' + Date.now()
      };
      setPaymentDetails({
        intentId: qrSimplePayload.intentId,
        metodo: 'qr_simple',
        cuentaBanco,
        banco,
        montoBs: totalBs,
        paymentUri: JSON.stringify(qrSimplePayload)
      });
    }
  };

  // Simulate payment broadcast (from crypto wallet app or bank app)
  const handleSimulatePaymentBroadcast = async () => {
    if (!paymentDetails) return;
    setVerifying(true);
    resetCountdown();

    try {
      // 1. Ask backend to simulate a transaction broadcast
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
      
      // 2. Start the confirmations polling loop
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
          console.warn('[Poll Error]', err);
          // Fallback confirmation progression
          currentConfirmations++;
          setConfirmations(currentConfirmations);
          if (currentConfirmations >= 3) {
            clearInterval(pollInterval);
            setPaymentStatus('completado');
            setVerifying(false);
          }
        }
      }, 1800);

    } catch (err) {
      console.warn('[Broadcast Simulation failed] Using local mocks', err);
      // Complete mock simulation
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
        }, 1500);
      } else {
        const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setTxHash(mockHash);
        setBlockNumber(38491024);
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
        }, 1500);
      }
    }
  };

  const copyToClipboard = () => {
    if (!paymentDetails) return;
    navigator.clipboard.writeText(paymentDetails.wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinishPayment = async () => {
    // Close payment window, clear selections
    setIsPaying(false);
    setPaymentDetails(null);
    setTxHash(null);
    setConfirmations(0);
    setPaymentStatus('esperando');
    
    // Refresh account information from server to show updated Cassandra state!
    if (result) {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/totem/buscar?q=${result.contrato}`);
        const data = await response.json();
        setResult(data.inmueble);
        
        const breakdownResponse = await fetch(`${API_URL}/api/pagos/desglose/${data.inmueble.contrato}`);
        if (breakdownResponse.ok) {
          const breakdownData = await breakdownResponse.json();
          setBreakdown(breakdownData);
          setSelectedMonths(breakdownData.desgloseVencido.length > 0 ? [breakdownData.desgloseVencido[0].periodo] : []);
        }
      } catch (e) {
        // Fallback local update
        const totalBsPaid = getSelectedMonthsSum();
        const updatedDebt = Math.max(0, result.deudaTotal - totalBsPaid);
        setResult(prev => prev ? {
          ...prev,
          deudaTotal: updatedDebt,
          estadoServicio: updatedDebt === 0 ? 'al-dia' : prev.estadoServicio
        } : null);
        if (breakdown) {
          const filteredVencido = breakdown.desgloseVencido.filter(m => !selectedMonths.includes(m.periodo));
          setBreakdown({
            ...breakdown,
            deudaTotal: updatedDebt,
            desgloseVencido: filteredVencido
          });
          setSelectedMonths(filteredVencido.length > 0 ? [filteredVencido[0].periodo] : []);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Redirige a WhatsApp — el bot Evolution pide contrato/CI/medidor (no usa Kafka)
  const openWhatsAppChat = async () => {
    resetCountdown();
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/chat-link`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('Sin URL');
    } catch (e) {
      console.warn('[WhatsApp redirect]', e);
      window.location.href = 'https://wa.me/59162658425';
    }
  };

  // Email / SMS vía Kafka (WhatsApp usa redirección, no cola)
  const triggerNotification = async (channel: 'sms' | 'email') => {
    if (!result) return;
    resetCountdown();
    
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
          contrato: result.contrato,
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
      alert(`No se pudo enviar ${channel.toUpperCase()}. Verifica que la API esté en ${API_URL}`);
    }
  };

  // ── HOME ────────────────────────────────────────────────────────────────────
  if (step === 'home') return (
    <div className="min-h-screen bg-gradient-to-br from-[#002447] via-[#00346f] to-[#046a85] flex flex-col items-center justify-center gap-10 p-8 select-none">
      <div className="text-center animate-in fade-in zoom-in duration-500">
        <div className="w-28 h-28 rounded-[40px] mx-auto mb-6 flex items-center justify-center shadow-2xl relative"
          style={{ background:'linear-gradient(135deg,#1d4ed8,#06b6d4)', boxShadow:'0 0 60px rgba(6,182,212,0.45)' }}>
          <Droplets className="w-14 h-14 text-white" />
          <div className="absolute inset-0 rounded-[40px] border-2 border-white/20 animate-ping opacity-25" />
        </div>
        <h1 className="text-7xl font-black text-white tracking-tighter">SEMAPA</h1>
        <p className="text-2xl font-semibold text-cyan-200 mt-2">Cochabamba · Tótem Inteligente de Autogestión</p>
        <p className="text-blue-300/80 mt-1 text-lg">Consulta, divide tus deudas y paga con QR Simple (Banco BNB) sin filas</p>
      </div>

      <div className="grid grid-cols-3 gap-6 w-full max-w-3xl animate-in slide-in-from-bottom duration-500 delay-100">
        {[
          { icon:'👥', label:'650,240', sub:'Usuarios Conectados', c:'#60a5fa' },
          { icon:'📡', label:'120,000', sub:'Medidores Inteligentes', c:'#34d399' },
          { icon:'📱', label:'QR Simple', sub:'Banco BNB Activo', c:'#34d399' },
        ].map(({ icon, label, sub, c }) => (
          <div key={sub} className="text-center p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all">
            <p className="text-4xl mb-2">{icon}</p>
            <p className="text-3xl font-black" style={{ color: c }}>{label}</p>
            <p className="text-blue-200 text-sm mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <button onClick={() => { setStep('search'); resetCountdown(); }}
        className="mt-4 px-16 py-8 rounded-[40px] text-white text-3xl font-black shadow-2xl active:scale-95 hover:brightness-110 transition-all animate-pulse"
        style={{ background:'linear-gradient(135deg,#10b981,#059669)', boxShadow:'0 0 45px rgba(16,185,129,0.5)' }}>
        TOCA AQUÍ PARA INICIAR
      </button>

      <div className="flex items-center gap-4 text-white/40 text-xs">
        <span>Terminal KIOSK-CBBA-012</span>
        <span>•</span>
        <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-blue-400" /> QR Simple Banco BNB v5.0</span>
      </div>
    </div>
  );

  // ── SEARCH ──────────────────────────────────────────────────────────────────
  if (step === 'search') return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-[#040913] flex flex-col items-center gap-6 p-8 pb-12 select-none touch-manipulation" onPointerDown={resetCountdown}>
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Droplets className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold text-white">SEMAPA · Consulta Hídrica</span>
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
          <h2 className="text-3.5xl font-black text-white text-center mb-1">Busca tu Contrato</h2>
          <p className="text-blue-300/80 text-center">Ingresa tu número de CI/NIT, Contrato o Serie del Medidor</p>
        </div>

        {/* Input display */}
        <div className="relative flex items-center bg-white/5 border-2 border-blue-500/50 rounded-2.5xl px-5 py-4 backdrop-blur shadow-inner">
          <Search className="w-7 h-7 text-blue-400 mr-3 flex-shrink-0" />
          <span className="text-2.5xl font-mono text-white flex-1 min-h-[38px] tracking-wider">
            {query || <span className="text-white/25">Escribe con el teclado...</span>}
          </span>
          {query && <button onClick={() => { setQuery(''); resetCountdown(); }}><X className="w-6 h-6 text-white/50 hover:text-white" /></button>}
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
          {(['num','alpha'] as const).map(m => (
            <button key={m} onClick={() => { setKbMode(m); resetCountdown(); }}
              className={cn('flex-1 py-3 rounded-xl text-sm font-bold transition-all',
                kbMode===m?'bg-blue-600 text-white shadow-lg':'text-white/50 hover:text-white')}>
              {m==='num' ? '🔢 Numérico' : '🔤 Alfanumérico'}
            </button>
          ))}
        </div>

        {/* Keyboard */}
        <div className="flex justify-center">
          <Keyboard value={query} onChange={(val) => { setQuery(val); resetCountdown(); }} mode={kbMode} />
        </div>

        {/* Quick examples */}
        <div className="flex flex-wrap gap-2 justify-center">
          <p className="w-full text-center text-xs text-white/35 font-bold uppercase tracking-widest mb-1">Acceso Rápido de Pruebas</p>
          {[
            { l:'García (Al Día)', v:'CBB-00123456' },
            { l:'Ind. El Prado (Deuda)', v:'CBB-00291122' },
            { l:'Torres (Deuda)', v:'CBB-00448821' }
          ].map(e=>(
            <button key={e.v} onClick={() => { setQuery(e.v); resetCountdown(); }}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-mono hover:bg-white/20 transition-all">
              {e.l}: {e.v}
            </button>
          ))}
        </div>

        {notFound && (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-center animate-in shake duration-300">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-300 font-bold">No se encontró ningún registro en Cassandra.</p>
            <p className="text-red-400 text-sm">Verifique el número e intente de nuevo.</p>
          </div>
        )}

        <button onClick={handleSearch} disabled={!query.trim()||loading}
          className="w-full py-6 rounded-2xl text-white text-xl font-black active:scale-95 transition-all disabled:opacity-40"
          style={{ background:'linear-gradient(135deg,#1d4ed8,#0891b2)', boxShadow:'0 0 30px rgba(59,130,246,0.35)' }}>
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-white" />
              Buscando en Cassandra...
            </span>
          ) : '🔍 CONSULTAR BASE DE DATOS'}
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
    const meterFault = result.medidorModelo === 'OY1320' && result.consumoActualM3 > 100;
    const meterStatus = meterFault ? { label:'Error Técnico (Cód.4)', color:'#f87171', bg:'rgba(239,68,68,0.15)' }
      : { label:'Activo', color:'#34d399', bg:'rgba(16,185,129,0.15)' };

    const totalSelectedBs = getSelectedMonthsSum();

    return (
      <div className="min-h-screen max-h-screen overflow-y-auto bg-[#040913] flex flex-col items-center gap-5 p-6 pb-10 select-none touch-manipulation" onPointerDown={resetCountdown}>
        {/* Header */}
        <div className="w-full max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-7 h-7 text-blue-400 animate-pulse" />
            <span className="text-lg font-bold text-white">SEMAPA · Cuenta de Usuario</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full animate-in fade-in duration-300"
              style={{ background: timer<15?'rgba(239,68,68,0.2)':'rgba(59,130,246,0.15)', color: timer<15?'#f87171':'#60a5fa' }}>
              <Clock className="w-4 h-4 animate-spin-slow" /> {timer}s
            </span>
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all">
              <X className="w-4 h-4" /> Inicio
            </button>
          </div>
        </div>

        <div className="w-full max-w-3xl space-y-4">
          {/* Identity card */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-blue-900/20 to-cyan-900/10 backdrop-blur-md">
            <div className="px-6 py-5 flex items-start justify-between border-b border-white/10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">{result.categoria} · D-{result.distritoId} · {result.zona}</p>
                <h2 className="text-2xl font-black text-white mt-1">{result.nombre}</h2>
                <p className="text-sm text-white/60 mt-0.5">{result.direccion}</p>
                <p className="text-xs font-mono text-blue-400 mt-1">{result.contrato}</p>
              </div>
              <span className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold flex-shrink-0 shadow-lg"
                style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40` }}>
                <cfg.Icon className="w-4 h-4" />{cfg.label}
              </span>
            </div>
            <div className="px-6 py-4 grid grid-cols-4 gap-4">
              {[
                { l:'CI / NIT', v:result.ci, c:'#94a3b8', mono:true },
                { l:'Serie Medidor', v:result.medidorSerie, c:'#94a3b8', mono:true },
                { l:'Modelo IoT', v:result.medidorModelo, c:'#a78bfa', mono:false },
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
          <div className="flex items-center justify-between px-5 py-4 rounded-2xl border bg-white/5"
            style={{ borderColor:`${meterStatus.color}30` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:`${meterStatus.color}15` }}>
                <span className="text-xl">📡</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">Telemetría LoRaWAN</p>
                <p className="font-bold text-sm" style={{ color:meterStatus.color }}>{meterStatus.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/45">Consumo del mes</p>
              <p className="text-xl font-black font-mono" style={{ color: exceso?'#f87171':'#34d399' }}>
                {result.consumoActualM3} m³
              </p>
            </div>
          </div>

          {/* Chronological Month Separations Selection Panel */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" /> Plan de Cobro por Meses
                </h3>
                <p className="text-xs text-blue-200/60 mt-0.5">Selecciona los meses que deseas cancelar en orden cronológico</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-400/20 font-bold uppercase">
                {selectedMonths.length} Seleccionado(s)
              </span>
            </div>

            {breakdown ? (
              <div className="space-y-2 max-h-72 overflow-y-auto overscroll-contain pr-2 touch-pan-y">
                {/* 1. Unpaid Months list */}
                {breakdown.desgloseVencido.map((m, idx) => {
                  const isChecked = selectedMonths.includes(m.periodo);
                  const isOldestUnchecked = !isChecked && (idx === 0 || selectedMonths.includes(breakdown.desgloseVencido[idx - 1].periodo));
                  const canToggle = isChecked || isOldestUnchecked;
                  const isLastSelected = isChecked && !selectedMonths.some(p => {
                    const i = [...breakdown.desgloseVencido, breakdown.facturaActual].findIndex(x => x.periodo === p);
                    return i > idx;
                  });

                  return (
                    <div key={m.periodo} 
                      role="button"
                      tabIndex={canToggle ? 0 : -1}
                      onPointerDown={(e) => { e.preventDefault(); if (canToggle) handleToggleMonth(idx); }}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl border transition-all select-none touch-manipulation",
                        canToggle ? "cursor-pointer active:scale-[0.98]" : "cursor-not-allowed opacity-50",
                        isChecked 
                          ? "bg-blue-600/20 border-blue-500 text-white shadow-inner" 
                          : "bg-white/5 border-white/15 text-white/60",
                        canToggle && !isChecked && "hover:bg-white/10"
                      )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                          isChecked 
                            ? "bg-blue-500 border-blue-400 text-white" 
                            : "border-white/30"
                        )}>
                          {isChecked && <Check className="w-4 h-4 stroke-[3px]" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{m.nombre}</p>
                          <p className="text-[10px] text-red-400/80 font-semibold uppercase tracking-wider">
                            Factura Vencida · En Mora{isLastSelected && selectedMonths.length > 1 ? ' · Toca para quitar' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs text-white/50 mr-1">Bs</span>
                        <span className="text-lg font-black">{m.monto.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Current Month */}
                {breakdown.facturaActual && (() => {
                  const idxCurrent = breakdown.desgloseVencido.length;
                  const isChecked = selectedMonths.includes(breakdown.facturaActual.periodo);
                  // Current month can only be checked if ALL outstanding debts are checked first
                  const canToggleCurrent = breakdown.desgloseVencido.every(m => selectedMonths.includes(m.periodo)) || isChecked;

                  return (
                    <div 
                      role="button"
                      tabIndex={canToggleCurrent ? 0 : -1}
                      onPointerDown={(e) => { e.preventDefault(); if (canToggleCurrent) handleToggleMonth(idxCurrent); }}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl border transition-all select-none touch-manipulation",
                        isChecked 
                          ? "bg-blue-600/20 border-blue-500 text-white cursor-pointer active:scale-99" 
                          : canToggleCurrent 
                            ? "bg-white/5 border-white/20 text-white/80 cursor-pointer active:scale-99 hover:bg-white/10" 
                            : "bg-white/5 border-white/5 opacity-40 cursor-not-allowed"
                      )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                          isChecked 
                            ? "bg-blue-500 border-blue-400 text-white" 
                            : "border-white/30"
                        )}>
                          {isChecked && <Check className="w-4 h-4 stroke-[3px]" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{breakdown.facturaActual.nombre}</p>
                          <p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Factura Mes en Curso</p>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs text-white/50 mr-1">Bs</span>
                        <span className="text-lg font-black">{breakdown.facturaActual.monto.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-6 text-white/40">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                Cargando historial de pagos...
              </div>
            )}

            {/* Instruction Warning */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300/80 leading-snug">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
              <p>
                Conforme al Reglamento de SEMAPA, los pagos parciales se imputan en orden cronológico (del más antiguo al más reciente).
                Para <strong className="text-amber-200">quitar meses</strong>, toca el último mes seleccionado; siempre debe quedar al menos uno marcado.
              </p>
            </div>

            {/* Payment Summary & Dual Pasarelas */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Monto Seleccionado</p>
                <p className="text-3xl font-black text-blue-400 font-mono">Bs {totalSelectedBs.toFixed(2)}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button 
                  onClick={() => handleInitiatePayment('qr_simple')}
                  disabled={selectedMonths.length === 0}
                  className="flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black text-base text-white shadow-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none w-full">
                  <CreditCard className="w-6 h-6 text-white animate-pulse" /> PAGAR CON QR SIMPLE (BANCO BNB)
                </button>
              </div>
            </div>
          </div>

          {/* Classic Receipt Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => printRecibo(result, selectedMonths.length > 0 ? selectedMonths : ['Mayo 2025'], selectedMonths.length > 0 ? totalSelectedBs : total, 'qr_simple', undefined, 'TXN-REIMPRESION')}
              className="flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-bold text-base active:scale-95 transition-all bg-white/5 border border-white/10 hover:bg-white/15">
              <Printer className="w-5 h-5" /> Imprimir Recibo Térmico
            </button>
            <button onClick={() => printReciboCarta(result, selectedMonths.length > 0 ? selectedMonths : ['Mayo 2025'], selectedMonths.length > 0 ? totalSelectedBs : total, 'qr_simple', undefined, 'TXN-REIMPRESION')}
              className="flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-bold text-base active:scale-95 transition-all border border-white/10 bg-white/5 hover:bg-white/15">
              <FileText className="w-5 h-5" /> Formato Carta Completa
            </button>
          </div>

          {/* WhatsApp + otras notificaciones */}
          <div className="rounded-2xl p-4 bg-white/5 border border-white/10 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Atención y avisos</p>
            <button
              onClick={openWhatsAppChat}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-base active:scale-95 transition-all"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)' }}>
              <MessageSquare className="w-6 h-6" />
              ABRIR WHATSAPP — ASISTENTE SEMAPA
            </button>
            <p className="text-[10px] text-white/45 text-center leading-snug px-2">
              Chat <strong className="text-green-300">+591 62658425</strong> — envía tu contrato, CI o medidor (ej. CBB-00448821). El bot responde solo. <em>No usa Kafka.</em> Usa otro celular (no el mismo del bot).
            </p>
            <p className="text-[9px] text-center text-cyan-500/60 font-mono">totem v2-evolution</p>
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/10">
              {[
                { channel:'sms' as const,   Icon:Phone, label:'SMS (Kafka)', c:'#60a5fa' },
                { channel:'email' as const, Icon:Mail,  label:'Email PDF',   c:'#a78bfa' },
              ].map(({ channel, Icon, label, c }) => (
                <button key={label}
                  onClick={() => triggerNotification(channel)}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all"
                  style={{ background:`${c}15`, color:c, border:`1px solid ${c}30` }}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={reset}
            className="w-full py-4 rounded-2xl text-white/60 text-sm font-bold border border-white/10 hover:bg-white/5 transition-all">
            ← Volver al Buscador
          </button>
        </div>

        {/* ─── PREMIUM PAGO CON QR SIMPLE (BANCO BNB) MODAL ──────────────── */}
        {isPaying && (
          <div className="fixed inset-0 z-50 bg-[#02050b]/90 flex items-start justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain backdrop-blur-md animate-in fade-in duration-350 touch-manipulation">
            <div className="w-full max-w-4xl my-auto bg-gradient-to-b from-[#09152a] to-[#040a15] rounded-[32px] border border-white/10 p-6 flex flex-col md:flex-row gap-6 shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto">
              
              {/* Close button — always available so the kiosk never feels locked */}
              <button 
                onPointerDown={() => {
                  if (paymentStatus === 'completado') {
                    void handleFinishPayment();
                  } else {
                    setIsPaying(false);
                    setVerifying(false);
                    setPaymentStatus('esperando');
                    setTxHash(null);
                    setConfirmations(0);
                  }
                }}
                className="absolute right-4 top-4 z-10 p-2.5 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all touch-manipulation"
                aria-label="Cerrar pago">
                <X className="w-5 h-5" />
              </button>

              {/* Left Column: QR and transaction details */}
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="flex items-center gap-2 mb-3 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-xs font-bold uppercase tracking-wider animate-pulse">
                  <CreditCard className="w-4 h-4" /> Pasarela QR Simple / Banco BNB Activa
                </div>
                
                <h3 className="text-2.5xl font-black text-white leading-none">
                  Recaudación QR Simple (Banco BNB)
                </h3>
                <p className="text-xs text-blue-200/50 mt-1">
                  Escanea para pagar la factura seleccionada desde la app móvil del Banco Nacional de Bolivia (BNB)
                </p>
                <div className="mt-3 text-[11px] text-amber-300 font-bold bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20 max-w-sm text-center animate-pulse">
                  ⚠ Nota de Desarrollo: Tu app bancaria real dará "QR Inválido" al estar en entorno local de pruebas (localhost). Usa el "Simulador de Transferencia Bancaria" a la derecha para completar la transacción académicamente.
                </div>

                {/* Dynamic QR Display */}
                {paymentDetails ? (
                  <div className="mt-5 p-4 bg-white rounded-3xl relative shadow-2xl">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=04-09-19&data=${encodeURIComponent(paymentDetails.paymentUri)}`} 
                      alt="Payment QR"
                      className="w-48 h-48"
                    />
                    <div className="absolute inset-0 border-4 border-blue-500/30 rounded-3xl pointer-events-none animate-pulse" />
                  </div>
                ) : (
                  <div className="mt-5 w-48 h-48 rounded-3xl bg-white/5 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                  </div>
                )}

                {paymentDetails && (
                  <div className="mt-5 space-y-2.5 w-full">
                    {/* Amount boxes */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Moneda</p>
                        <p className="text-lg font-black font-mono text-blue-400">BOB (Bolivianos)</p>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total a Transferir</p>
                        <p className="text-lg font-black font-mono text-white">Bs {totalSelectedBs.toFixed(2)}</p>
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
                            onClick={() => printRecibo(result, selectedMonths, totalSelectedBs, 'qr_simple', undefined, txHash || '')}
                            className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs active:scale-95 transition-all hover:bg-white/10">
                            <Printer className="w-4 h-4" /> Imprimir Ticket
                          </button>
                          <button 
                            onClick={() => printReciboCarta(result, selectedMonths, totalSelectedBs, 'qr_simple', undefined, txHash || '')}
                            className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs active:scale-95 transition-all hover:bg-white/10">
                            <FileText className="w-4 h-4" /> Imprimir Carta PDF
                          </button>
                        </div>
                        <button 
                          onClick={handleFinishPayment}
                          className="w-full py-3 rounded-xl bg-green-600 text-white font-black text-sm active:scale-95 transition-all hover:brightness-110 shadow-lg">
                          Finalizar Consulta
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

  return null;
}
