import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  Map as MapIcon, 
  Search, 
  Plus, 
  X,
  CreditCard,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function KioskMode() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex bg-inverse-surface min-h-screen text-inverse-on-surface overflow-hidden font-sans cursor-none animate-in fade-in duration-1000">
      {/* Left Sidebar Info */}
      <div className="w-[450px] p-12 flex flex-col justify-between border-r border-white/5 bg-gradient-to-b from-primary/20 to-transparent">
        <div className="space-y-12">
            <div className="flex items-center gap-5">
                <div className="bg-primary p-4 rounded-3xl shadow-2xl">
                    <Droplets className="text-white w-10 h-10" />
                </div>
                <div>
                   <h1 className="text-4xl font-black italic tracking-tighter text-secondary-fixed">SEMAPA</h1>
                   <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">Auto-Consultas v4.0</p>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-6xl font-black leading-none tracking-tighter italic">Cochabamba <br/><span className="text-primary-fixed">Inteligente</span></h2>
                <p className="text-xl font-medium opacity-60 leading-relaxed">Bienvenido al sistema de terminales táctiles de SEMAPA. Realice sus consultas y reportes de forma inmediata.</p>
            </div>

            <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 bg-secondary rounded-full" />
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-secondary-fixed-dim">Estado del Agua</h3>
                        <p className="text-2xl font-bold">Distribución Normal</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl">
                        <p className="text-[10px] font-black opacity-40 uppercase mb-1">Represas</p>
                        <p className="text-lg font-black italic">82.4%</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl">
                        <p className="text-[10px] font-black opacity-40 uppercase mb-1">Calidad</p>
                        <p className="text-lg font-black italic">Óptima</p>
                    </div>
                 </div>
            </div>
        </div>

        <div className="flex justify-between items-end">
            <div className="space-y-1">
                <p className="text-6xl font-black italic tracking-tighter leading-none">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-sm font-bold opacity-40 uppercase tracking-widest">{time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Terminal ID</p>
                <p className="text-sm font-bold">KIOSK-CBBA-012</p>
            </div>
        </div>
      </div>

      {/* Main Kiosk Area */}
      <div className="flex-1 flex flex-col p-12 gap-12">
        <div className="flex justify-between items-center bg-white/5 p-4 rounded-[32px] border border-white/10 pr-10">
            <div className="flex items-center gap-6 px-4">
                <Search className="w-8 h-8 text-secondary-fixed-dim" />
                <span className="text-2xl font-medium opacity-30 italic">Toque aquí para buscar su código de cliente...</span>
            </div>
            <button className="bg-secondary text-white px-10 py-5 rounded-[24px] font-black text-lg italic shadow-2xl flex items-center gap-4 active:scale-95 transition-all">
                TECLADO VIRTUAL
            </button>
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-10 flex-1">
            <button className="bg-primary hover:brightness-110 active:scale-[0.98] transition-all rounded-[60px] p-12 text-left flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="bg-white/10 w-24 h-24 rounded-[32px] flex items-center justify-center border border-white/20 mb-8">
                    <CreditCard className="w-12 h-12 text-primary-fixed" />
                </div>
                <div>
                   <h3 className="text-5xl font-black italic tracking-tighter mb-4">Pagar <br/>Factura</h3>
                   <p className="text-xl font-medium opacity-60">Consulta de deudas y pagos con código QR.</p>
                </div>
                <div className="flex justify-end">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-primary transition-all">
                        <Plus className="w-8 h-8" />
                    </div>
                </div>
            </button>

            <button className="bg-surface-container-low text-on-surface hover:bg-surface-container transition-all active:scale-[0.98] rounded-[60px] p-12 text-left flex flex-col justify-between shadow-xl border border-outline-variant group">
                <div className="bg-primary/5 w-24 h-24 rounded-[32px] flex items-center justify-center border border-primary/10 mb-8">
                    <FileText className="w-12 h-12 text-primary" />
                </div>
                <div>
                   <h3 className="text-5xl font-black italic tracking-tighter mb-4">Trámites y <br/>Solicitudes</h3>
                   <p className="text-xl font-medium text-on-surface-variant">Cambios de nombre, reclamos y nuevos servicios.</p>
                </div>
                <div className="flex justify-end">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                        <ArrowRight className="w-8 h-8" />
                    </div>
                </div>
            </button>

            <button className="bg-surface-container-low text-on-surface hover:bg-surface-container transition-all active:scale-[0.98] rounded-[60px] p-12 text-left flex flex-col justify-between shadow-xl border border-outline-variant group">
                <div className="bg-primary/5 w-24 h-24 rounded-[32px] flex items-center justify-center border border-primary/10 mb-8">
                    <MapIcon className="w-12 h-12 text-primary" />
                </div>
                <div>
                   <h3 className="text-5xl font-black italic tracking-tighter mb-4">Mapa de <br/>Cortes</h3>
                   <p className="text-xl font-medium text-on-surface-variant">Consulte zonas de mantenimiento programado.</p>
                </div>
                <div className="flex justify-end">
                   <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                        <ArrowRight className="w-8 h-8" />
                    </div>
                </div>
            </button>

            <button className="bg-secondary hover:brightness-110 active:scale-[0.98] transition-all rounded-[60px] p-12 text-left flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="bg-white/10 w-24 h-24 rounded-[32px] flex items-center justify-center border border-white/20 mb-8">
                    <Clock className="w-12 h-12 text-secondary-fixed" />
                </div>
                <div>
                   <h3 className="text-5xl font-black italic tracking-tighter mb-4">Centros de <br/>Atención</h3>
                   <p className="text-xl font-medium opacity-60">Ubicación y horarios de oficinas SEMAPA.</p>
                </div>
                <div className="flex justify-end">
                   <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-secondary transition-all">
                        <ArrowRight className="w-8 h-8" />
                    </div>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
}
