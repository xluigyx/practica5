import React from 'react';
import { 
  WifiOff, 
  Gauge, 
  Radio, 
  CloudRain, 
  Search, 
  Bell, 
  HelpCircle, 
  User, 
  Layout, 
  Router,
  Signal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const METRICS = [
  { label: 'Medidores Inactivos', value: '1,402', change: '2.4%', changeType: 'error', icon: WifiOff, sub: 'Últimas 24 horas' },
  { label: 'Latencia de Ingesta', value: '420ms', change: 'Óptimo', changeType: 'success', icon: Gauge, sub: 'Promedio de flujo Kafka' },
  { label: 'Error de Interferencia', value: '0.07%', change: 'Estable', changeType: 'neutral', icon: Signal, sub: 'Pérdida de paquetes LoRa' },
  { label: 'Estado Red IoT', value: '99.98%', highlight: true, icon: CloudRain, sub: 'Uptime operativo mensual' },
];

const DEVICE_HEALTH = [
  { model: 'ITC 100', category: 'Industrial Smart', failure: '0.02%', battery: '92%', batteryIcon: 'battery-full' },
  { model: 'Siconia', category: 'LoRa Integrated', failure: '0.45%', battery: '78%', batteryIcon: 'battery-low', urgent: true },
  { model: 'OY1320', category: 'Residential NB', failure: '0.08%', battery: '45%', batteryIcon: 'battery-low', alert: true },
  { model: 'WP20', category: 'High Precision', failure: '0.11%', battery: '88%', batteryIcon: 'battery-medium' },
];

export default function IoTMonitor() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background animate-in fade-in duration-500">
      {/* Top Navbar */}
      <header className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-40">
        <div className="flex justify-between items-center h-20 px-8 max-w-container-max mx-auto">
          <h2 className="text-2xl font-bold text-primary">Gerencia Técnica: Monitor IoT</h2>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                className="bg-surface-container-low border border-outline-variant rounded-full pl-10 pr-4 py-2 text-sm w-80 focus:ring-2 focus:ring-primary focus:outline-none transition-all" 
                placeholder="Buscar medidor o gateway..." 
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors relative">
                <Bell className="w-5 h-5 text-on-surface-variant" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-container-lowest" />
              </button>
              <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors">
                <HelpCircle className="w-5 h-5 text-on-surface-variant" />
              </button>
              <div className="h-8 w-px bg-outline-variant mx-2" />
              <div className="flex items-center gap-3 pl-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-on-surface leading-none">Ing. Técnico</p>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter mt-1">Administrativo SEMAPA</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center border border-outline-variant shadow-sm">
                  <User className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {METRICS.map((m, i) => (
            <div 
              key={i} 
              className={cn(
                "border border-outline-variant p-6 rounded-xl shadow-sm transition-all hover:shadow-md",
                m.highlight ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", m.highlight ? "text-primary-fixed" : "text-on-surface-variant")}>
                  {m.label}
                </span>
                <m.icon className={cn("w-6 h-6", m.highlight ? "text-primary-fixed" : "text-primary")} />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold">{m.value}</h3>
                {m.change && (
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    m.changeType === 'error' ? "text-error-container bg-error/20" : 
                    m.changeType === 'success' ? "text-secondary font-bold bg-secondary-container/20" : "text-on-surface-variant"
                  )}>
                    {m.change}
                  </span>
                )}
              </div>
              <p className={cn("text-[11px] mt-2 italic", m.highlight ? "text-primary-fixed/80" : "text-outline")}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Map & Health Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-8 bg-surface-container border border-outline-variant rounded-2xl overflow-hidden relative min-h-[550px] shadow-sm">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDb-ijMzkzVjsSAvuvqrsmPgKYBfIyITrXOoVbVkA7ISpxkxygjVjoDI0QkwQxYvz0R-Y-uF2jiXRVXUMn5qQeO4jXVANhL84ouGH26BxIVS0_20zadzVNd0tmovZBpyqXGqaxkqI2QOdAycIDgl_C9CZ-OFCXDHTIbsrFs84PMoRXv0yHdub0zHh_Xg2IkrWW5JwnWsZNAkw22D47O4zhthoeTUhd76dtKaC6NVaqVT5OyyPvhdCiexBuIXHrGv-N3ELaYaLPpNM5o"
              className="absolute inset-0 w-full h-full object-cover"
              alt="Cochabamba Map"
            />
            {/* Map Overlay Card */}
            <div className="absolute top-6 left-6 map-glass p-5 rounded-2xl shadow-2xl max-w-[260px] border-white/20">
              <h4 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
                <Router className="w-4 h-4" />
                Radiobases LoRaWAN
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Total Gateways:</span>
                  <span className="font-bold text-on-surface">32</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">En Línea:</span>
                  <span className="text-secondary font-bold">30</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Sin Conexión:</span>
                  <span className="text-error font-bold">2</span>
                </div>
              </div>
            </div>

            {/* Live Status Badge */}
            <div className="absolute bottom-6 right-6 flex gap-3">
              <div className="map-glass px-5 py-2 rounded-full flex items-center gap-3 text-xs font-bold text-primary shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(0,104,119,0.6)]" />
                Kafka Status: Healthy
              </div>
              <button className="map-glass p-2.5 rounded-full text-primary shadow-lg hover:bg-surface-container transition-all">
                 <Layout className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Sidebar: Health Table & Trend */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm flex flex-col overflow-hidden">
              <div className="p-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <h4 className="text-sm font-bold text-primary uppercase tracking-widest">Salud por Modelo</h4>
                <div className="text-outline cursor-pointer hover:text-primary"><WifiOff className="w-4 h-4" /></div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low text-[10px] text-on-surface-variant font-bold uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="p-4 border-b border-outline-variant">Modelo</th>
                      <th className="p-4 border-b border-outline-variant text-center">Fallo</th>
                      <th className="p-4 border-b border-outline-variant text-right">Batería</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {DEVICE_HEALTH.map((d, i) => (
                      <tr key={i} className="hover:bg-surface-container-low/50 transition-colors group">
                        <td className="p-4">
                          <p className="text-sm font-bold text-primary">{d.model}</p>
                          <p className="text-[10px] text-on-surface-variant opacity-60 font-medium italic">{d.category}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "text-[11px] font-bold px-2 py-0.5 rounded-md",
                            d.urgent ? "bg-error-container text-error" : d.alert ? "bg-orange-100 text-orange-700" : "bg-secondary-container/30 text-secondary"
                          )}>
                            {d.failure}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-2 text-xs font-bold">
                              <span className={cn(d.alert ? "text-error" : "text-on-surface")}>{d.battery}</span>
                              <div className={cn("w-3 h-5 border rounded-[2px] relative flex flex-col justify-end p-[1px]", d.alert ? "border-error" : "border-outline-variant")}>
                                 <div className={cn("w-full rounded-[1px]", d.alert ? "bg-error h-2" : "bg-secondary h-4")} />
                                 <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-[2px] bg-inherit border border-inherit rounded-t-[1px]" />
                              </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-outline-variant bg-surface-container-low/30 text-center">
                <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Ver Reporte Detallado</button>
              </div>
            </div>

            {/* Ingestion Trend Sparkline Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col">
              <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-6">Tendencia de Ingesta (24H)</h4>
              <div className="flex-1 flex items-end gap-1.5 h-32 px-1">
                {[40, 55, 30, 70, 95, 80, 60, 45, 35, 60, 75, 85].map((h, i) => (
                   <div 
                    key={i} 
                    className={cn(
                      "flex-1 rounded-t-sm transition-all duration-500",
                      i === 4 ? "bg-primary shadow-[0_0_12px_rgba(0,52,111,0.3)]" : "bg-primary-fixed-dim"
                    )}
                    style={{ height: `${h}%` }}
                   />
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[9px] font-bold text-outline uppercase tracking-wider">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:59</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
