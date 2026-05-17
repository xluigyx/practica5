import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Bell, 
  HelpCircle, 
  Brain, 
  Gavel, 
  Download, 
  ChevronRight,
  Filter,
  Plus,
  AlertCircle,
  CheckCircle2,
  Droplets
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const FIN_METRICS = [
  { label: 'Recaudación Total', value: 'Bs. 4.82M', change: '+12.4%', type: 'success', progress: 75 },
  { label: 'Índice de Morosidad', value: '8.2%', change: '-0.5%', type: 'error', progress: 8 },
  { label: 'Facturas Emitidas', value: '142,502', change: 'Mes: Octubre', type: 'secondary', progress: 95 },
];

const ANALYTICS_ALERTS = [
  { id: '849201-B', zone: 'Zona Norte', consumption: '112m3', prob: '89.2%', status: 'CRÍTICO' },
  { id: '110432-A', zone: 'Distrito 12', consumption: '58m3', prob: 'Auto-recargo', status: 'ALERTA' },
  { id: '229103-C', zone: 'Zona Central', consumption: '49m3', prob: '-', status: 'ALERTA' },
];

const MOROSIDAD_RANKING = [
  { dist: 'Distrito 10', zone: 'Sud-Este', monto: '425,100', status: 'ALTO RIESGO' },
  { dist: 'Distrito 4', zone: 'Noroeste', monto: '210,450', status: 'MODERADO' },
  { dist: 'Distrito 1', zone: 'Central', monto: '188,900', status: 'MODERADO' },
  { dist: 'Distrito 12', zone: 'Sur', monto: '156,000', status: 'BAJO' },
];

export default function AccountabilityDashboard() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Top Header */}
      <header className="flex justify-between items-center bg-surface-container-lowest p-4 -mt-8 -mx-8 sticky top-0 z-40 border-b border-outline-variant shadow-sm">
        <h2 className="text-2xl font-bold text-primary px-4">Dashboard de Contabilidad</h2>
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
            <input className="pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary w-80 transition-all shadow-inner" placeholder="Buscar reporte o distrito..." type="text"/>
          </div>
          <div className="flex items-center gap-4 pr-4">
            <Bell className="text-on-surface-variant cursor-pointer hover:text-primary w-5 h-5" />
            <HelpCircle className="text-on-surface-variant cursor-pointer hover:text-primary w-5 h-5" />
            <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
              <div className="text-right">
                <p className="text-sm font-bold text-on-surface">Admin SEMAPA</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Contabilidad Central</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container font-bold border border-primary/10 shadow-sm">AS</div>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FIN_METRICS.map((m, i) => (
          <div key={i} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-[10px] font-bold text-outline uppercase tracking-[0.2em]">{m.label}</span>
            <div className="flex items-end justify-between">
              <h3 className={cn("text-3xl font-bold", m.type === 'error' ? 'text-error' : m.type === 'success' ? 'text-primary' : 'text-on-surface')}>{m.value}</h3>
              <span className={cn("text-xs font-bold flex items-center gap-1", m.type === 'error' ? 'text-error' : m.type === 'success' ? 'text-secondary' : 'text-on-surface-variant')}>
                {m.type === 'success' ? <TrendingUp className="w-4 h-4" /> : m.type === 'error' ? <TrendingDown className="w-4 h-4" /> : null}
                {m.change}
              </span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-1000", m.type === 'error' ? 'bg-error' : m.type === 'success' ? 'bg-primary' : 'bg-secondary')} style={{ width: `${m.progress}%` }} />
            </div>
          </div>
        ))}
      </section>

      {/* Analytics & Alerts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
            <h4 className="text-xl font-bold text-on-surface">Cobranzas vs. Proyección</h4>
            <div className="flex gap-2 p-1 bg-surface-container rounded-lg">
              <button className="px-4 py-1.5 bg-surface-container-lowest shadow-sm text-primary font-bold rounded-md text-xs">Mensual</button>
              <button className="px-4 py-1.5 text-on-surface-variant font-medium rounded-md text-xs hover:bg-surface-container-high transition-colors">Trimestral</button>
            </div>
          </div>
          <div className="flex-1 p-8 flex flex-col justify-end relative h-[350px]">
            <div className="absolute inset-0 p-8 flex items-end gap-6">
              {[60, 75, 88, 92, 70, 85].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col gap-4 items-center group">
                  <div className="w-full bg-primary/10 rounded-t-xl relative h-full flex flex-col justify-end overflow-hidden border border-primary/5">
                    <div className="absolute bottom-0 w-full bg-primary/20 rounded-t-lg transition-all duration-700 group-hover:bg-primary/30" style={{ height: `${v}%` }} />
                    <div className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all duration-1000 group-hover:brightness-110" style={{ height: `${v * 0.85}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest">{['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'][i]}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-8 mt-6 z-10 border-t border-outline-variant pt-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(0,52,111,0.4)]" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Monto Real</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-primary/20 rounded-full" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Proyectado (IA)</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Monitoring Alerts */}
        <div className="lg:col-span-4 bg-inverse-surface text-inverse-on-surface rounded-2xl p-6 flex flex-col gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-fixed/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="bg-secondary/20 p-2 rounded-lg">
                <Brain className="text-secondary-fixed-dim w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-secondary-fixed-dim">Motor Python v3.2</h4>
                <p className="text-[10px] opacity-60">Detección de anomalías</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 bg-secondary-container/10 text-secondary-fixed-dim px-2.5 py-1 rounded-full text-[9px] font-black border border-secondary-fixed-dim/20">
              <span className="w-1.5 h-1.5 bg-secondary-container rounded-full animate-pulse" />
              LIVE
            </span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[300px] z-10 custom-scrollbar pr-2">
            <p className="text-[11px] font-bold text-on-tertiary-container/80 uppercase tracking-widest pl-1">Alertas Críticas Recientes:</p>
            {ANALYTICS_ALERTS.map((alert, idx) => (
              <div key={idx} className="p-4 bg-surface-container-low/5 rounded-xl border border-white/5 space-y-2 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black tracking-widest text-primary-fixed">CTA: {alert.id}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black tracking-tighter shadow-sm",
                    alert.status === 'CRÍTICO' ? "bg-error text-on-error" : "bg-primary text-primary-fixed"
                  )}>
                    {alert.status}
                  </span>
                </div>
                <p className="text-sm font-medium opacity-90">{alert.consumption} <span className="text-[10px] opacity-40 ml-1">({alert.zone})</span></p>
                {alert.prob !== '-' && <p className="text-[10px] italic text-secondary-fixed-dim font-bold">Confianza: {alert.prob}</p>}
              </div>
            ))}
          </div>
          <button className="z-10 mt-auto w-full py-3 border border-secondary-fixed-dim/30 text-secondary-fixed-dim rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-secondary-fixed-dim hover:text-on-secondary-fixed transition-all active:scale-95">
             Ver Historial IA
          </button>
        </div>
      </section>

      {/* Management Tables Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Ranking Morosidad */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/20">
            <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">Ranking Morosidad</h4>
            <Filter className="text-outline w-4 h-4 cursor-pointer hover:text-primary" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50 text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Distrito</th>
                  <th className="px-6 py-4 text-right">Monto (Bs.)</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {MOROSIDAD_RANKING.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{r.dist}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium">{r.zone}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-on-surface">{r.monto}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "rounded-full px-3 py-1 text-[9px] font-black whitespace-nowrap border",
                        r.status === 'ALTO RIESGO' ? "bg-error-container/20 text-error border-error/10" : "bg-surface-container-highest text-on-surface-variant border-transparent"
                      )}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cuentas Incobrables UI */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col shadow-sm">
          <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/20">
            <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">Cuentas Incobrables</h4>
            <button className="text-primary font-black text-[10px] uppercase flex items-center gap-1 hover:underline">
               Ver Detalle <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-8 space-y-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-2xl border border-outline-variant shadow-inner">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center text-error border border-error/5">
                    <Gavel className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Procesos Judiciales</p>
                    <p className="text-[11px] text-on-surface-variant font-medium">42 expedientes activos en fiscalía</p>
                  </div>
               </div>
               <div className="text-right">
                  <h5 className="text-2xl font-black text-on-surface">Bs. 2.1M</h5>
                  <p className="text-[9px] font-bold text-error uppercase tracking-tighter animate-pulse mt-1">Requiere Seguimiento</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 border border-outline-variant rounded-2xl bg-surface-container-lowest hover:border-primary/30 transition-all cursor-pointer">
                <p className="text-[10px] font-black text-outline uppercase tracking-wider mb-2">Prescripción Próx.</p>
                <p className="text-2xl font-black text-primary">12</p>
                <div className="flex items-center gap-1.5 mt-2 bg-error-container/20 px-2 py-0.5 rounded border border-error/10 w-fit">
                   <AlertCircle className="w-3 h-3 text-error" />
                   <span className="text-[9px] font-bold text-error">Próx. 30 días</span>
                </div>
              </div>
              <div className="p-5 border border-outline-variant rounded-2xl bg-surface-container-lowest hover:border-primary/30 transition-all cursor-pointer">
                <p className="text-[10px] font-black text-outline uppercase tracking-wider mb-2">Convenios Pagados</p>
                <p className="text-2xl font-black text-secondary">358</p>
                <div className="flex items-center gap-1.5 mt-2 bg-secondary-container/20 px-2 py-0.5 rounded border border-secondary/10 w-fit">
                   <CheckCircle2 className="w-3 h-3 text-secondary" />
                   <span className="text-[9px] font-bold text-on-secondary-container">85% Tasa éxito</span>
                </div>
              </div>
            </div>

            <button className="mt-8 w-full py-4 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg text-sm">
              <Download className="w-5 h-5" />
              Descargar Cierre Mensual
            </button>
          </div>
        </div>
      </section>

      {/* Mini Footer */}
      <footer className="bg-tertiary text-on-tertiary p-8 -mx-8 -mb-8">
        <div className="max-w-container-max mx-auto flex justify-between items-center text-xs">
           <div className="flex items-center gap-4">
              <Droplets className="w-6 h-6 text-primary-fixed" />
              <div>
                <p className="font-bold">SEMAPA Cochabamba</p>
                <p className="opacity-60 text-[10px]">Portal Interno de Auditoría y Contabilidad</p>
              </div>
           </div>
           <div className="flex gap-6 opacity-60">
              <a href="#" className="hover:opacity-100 transition-opacity">Privacidad</a>
              <a href="#" className="hover:opacity-100 transition-opacity">Soporte TI</a>
              <a href="#" className="hover:opacity-100 transition-opacity">ERP Interno</a>
           </div>
        </div>
      </footer>
    </div>
  );
}
