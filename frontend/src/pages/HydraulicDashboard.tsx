import React from 'react';
import { 
  Users, 
  Map as MapIcon, 
  Smile, 
  Search, 
  Bell, 
  HelpCircle,
  TrendingUp,
  Network
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const KPI_DATA = [
  {
    title: 'Impacto Ciudadano',
    value: '650,240',
    subtitle: 'Personas con servicio activo',
    trend: '+12% este mes',
    icon: Users,
  },
  {
    title: 'Cobertura por Distrito',
    value: '94.2%',
    subtitle: 'Meta institucional: 98%',
    activeDots: 3,
    icon: MapIcon,
  },
  {
    title: 'Índice de Satisfacción',
    value: '4.8/5',
    subtitle: 'Basado en encuestas Portal Ciudadano',
    avatars: true,
    icon: Smile,
  }
];

const DISTRICT_DATA = [
  { name: 'Distrito 10 (Central)', consumption: '520 m³/s', pressure: '12.5 PSI', status: 'Alta Demanda', statusColor: 'text-error bg-error-container' },
  { name: 'Distrito 1 (Norte)', consumption: '310 m³/s', pressure: '15.2 PSI', status: 'Estable', statusColor: 'text-secondary-container bg-secondary' },
  { name: 'Distrito 4 (Oeste)', consumption: '285 m³/s', pressure: '11.8 PSI', status: 'Mantenimiento', statusColor: 'text-on-surface bg-outline-variant' },
];

export default function HydraulicDashboard() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <span className="text-xs font-bold text-secondary uppercase tracking-widest">Alcaldía de Cochabamba</span>
          <h2 className="text-3xl font-bold text-on-surface mt-1">Dashboard de Inteligencia Hídrica</h2>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-xl border border-outline-variant">
          <div className="text-right px-4">
            <p className="text-sm font-bold text-on-surface">Usuario Administrativo SEMAPA</p>
            <p className="text-xs text-on-surface-variant">Admin Nivel 4</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold shadow-sm">UA</div>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {KPI_DATA.map((kpi, index) => (
          <div key={index} className="glass-card p-6 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <kpi.icon className="text-primary w-8 h-8" />
              {kpi.trend && (
                <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded text-[10px] font-bold">
                  {kpi.trend}
                </span>
              )}
              {kpi.activeDots && (
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < kpi.activeDots ? 'bg-primary' : 'bg-outline-variant'}`} />
                  ))}
                </div>
              )}
              {kpi.avatars && (
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-highest" />
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-fixed" />
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-secondary-fixed" />
                </div>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{kpi.title}</h3>
              <p className="text-2xl font-bold text-on-surface leading-tight">{kpi.value}</p>
              <p className="text-xs text-outline mt-1">{kpi.subtitle}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Main Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Card */}
        <div className="lg:col-span-8 glass-card rounded-xl overflow-hidden flex flex-col border border-outline-variant">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-on-surface">Mapa de Calor: Consumo por Distrito</h3>
              <p className="text-sm text-on-surface-variant">Análisis geoespacial de los 14 distritos de Cochabamba</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-surface-container-high px-3 py-1.5 rounded text-xs transition-colors hover:bg-surface-container-highest">Tiempo Real</button>
              <button className="bg-primary text-on-primary px-3 py-1.5 rounded text-xs font-bold shadow-sm">Promedio Mensual</button>
            </div>
          </div>
          <div className="flex-1 relative bg-surface-container-low min-h-[400px]">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOWw5bXq4QgGKopIbe-QaZI3BJTGpCXhKz2Bl6v6rXfQII2wYHFuHsrAKdzvIcyWO8Gfx4i5rdHhypv-4tGX_LSMITQsQAO6yJza_S9hch6y-vqYZM2FtzZRdplI9OXi5BVj3UwJ-R7vqvXGVHRi1PS4mmjZZ6TSIMf_SoLMufRpDL47H30fBrUmBBLgiIKB0RFZPkcX1fmrCrnJsxWj4oxh-FoMnuPlDn9cMh2N2ZEQMm9Fd82KhTp8-k9avRD2GoPuElEW8irtSY" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale brightness-110"
              alt="Map Background"
            />
            {/* Districts overlay - static mock */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
               <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-4 opacity-80">
                  <div className="bg-error/80 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-white/20">D-10</div>
                  <div className="bg-orange-400/80 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-white/20">D-1</div>
                  <div className="bg-yellow-400/80 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-white/20">D-4</div>
                  <div className="bg-orange-500/80 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-white/20">D-9</div>
                  <div className="bg-error rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-white/20">D-12</div>
                  <div className="bg-yellow-300/80 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-white/20">D-3</div>
                  <div className="bg-orange-300/80 col-span-2 flex items-center justify-center text-white font-bold shadow-lg border border-white/20">D-14</div>
               </div>
            </div>
            {/* Map Legend */}
            <div className="absolute bottom-6 right-6 p-4 rounded-lg bg-surface-container-lowest shadow-xl border border-outline-variant backdrop-blur-sm">
              <p className="text-[10px] font-bold text-on-surface uppercase mb-3">Consumo (m³/s)</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-error rounded-full" />
                  <span className="text-xs text-on-surface-variant font-medium">Crítico (&gt;500)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-orange-400 rounded-full" />
                  <span className="text-xs text-on-surface-variant font-medium">Alto (300-500)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-yellow-400 rounded-full" />
                  <span className="text-xs text-on-surface-variant font-medium">Nominal (&lt;300)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-6 rounded-xl flex-1 flex flex-col border border-outline-variant">
            <div className="mb-6">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Correlación Histórica</h3>
              <p className="text-2xl font-bold text-on-surface">Consumo vs. Temp</p>
            </div>
            
            <div className="flex-1 relative bg-surface-container-lowest rounded border border-outline-variant p-4 min-h-[200px]">
              <div className="absolute left-4 top-4 bottom-8 w-px bg-outline-variant" />
              <div className="absolute left-4 bottom-8 right-4 h-px bg-outline-variant" />
              <div className="grid grid-cols-10 grid-rows-10 w-full h-full p-2">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-2 h-2 rounded-full bg-secondary-container shadow-sm border border-secondary self-end"
                    style={{ 
                      gridColumnStart: i + 2, 
                      gridRowStart: 8 - i,
                      transform: `translate(${(Math.random() - 0.5) * 20}px, ${(Math.random() - 0.5) * 20}px)`
                    }}
                  />
                ))}
                <svg className="absolute inset-x-0 bottom-8 h-full w-full pointer-events-none stroke-primary/30 stroke-2" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <line x1="15" y1="90" x2="90" y2="10" strokeDasharray="4 4" />
                </svg>
              </div>
              <div className="absolute -left-10 top-1/2 -rotate-90 text-[10px] text-outline font-bold">Consumo (m³)</div>
              <div className="absolute bottom-2 left-1/2 -translateX-1/2 text-[10px] text-outline font-bold">Temp (°C)</div>
            </div>
            
            <div className="mt-4 p-4 bg-primary-fixed rounded-lg border border-primary/10">
              <p className="text-xs text-on-primary-fixed-variant leading-relaxed">
                <strong className="block mb-1">Insight Clave:</strong> Se observa una correlación positiva de 0.85. El consumo aumenta 15% por cada 5°C adicionales en zonas residenciales.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-xl bg-tertiary text-on-tertiary border border-tertiary shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Network className="w-6 h-6 text-on-tertiary/80" />
              <h4 className="text-xs font-bold uppercase tracking-widest">Arquitectura Técnica</h4>
            </div>
            <p className="text-sm opacity-80 leading-relaxed mb-6">Gestión basada en el Documento de Arquitectura Técnica v2.1 de integración hídrica.</p>
            <div className="flex justify-between items-center text-[10px] uppercase font-bold border-t border-white/10 pt-4 tracking-tighter">
              <span className="opacity-60">Sincronización: 100%</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Table Section */}
      <section className="glass-card rounded-xl overflow-hidden border border-outline-variant shadow-sm mb-12">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low">
          <h3 className="text-xl font-bold text-on-surface">Desglose Operativo por Distrito</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low/50 text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Distrito</th>
                <th className="px-6 py-4">Consumo Actual</th>
                <th className="px-6 py-4">Presión Promedio</th>
                <th className="px-6 py-4">Estado de Red</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {DISTRICT_DATA.map((row, i) => (
                <tr key={i} className="hover:bg-surface-container transition-colors group">
                  <td className="px-6 py-4 font-bold text-sm text-primary">{row.name}</td>
                  <td className="px-6 py-4 text-sm font-medium">{row.consumption}</td>
                  <td className="px-6 py-4 text-sm font-medium">{row.pressure}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap", row.statusColor)}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-primary font-bold text-xs hover:underline uppercase tracking-tighter">Ver Detalles</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
