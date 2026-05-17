import React from 'react';
import { 
  User, 
  Search, 
  Globe, 
  Bell, 
  Droplets,
  CreditCard,
  FileText,
  MapPin,
  AlertTriangle,
  History,
  Download,
  Info,
  Gauge
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function CitizenPortal() {
  return (
    <div className="flex-1 bg-[#f0f4f8] min-h-screen flex flex-col font-sans animate-in fade-in duration-700">
      {/* Citizen Header */}
      <header className="bg-white border-b border-outline-variant h-20 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-full px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
                <Droplets className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-primary tracking-tight">Portal Ciudadano SEMAPA</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 h-full">
            <a href="#" className="font-bold text-primary border-b-4 border-primary h-full flex items-center pt-1 px-2">Consumo</a>
            <a href="#" className="font-medium text-on-surface-variant hover:text-primary transition-colors">Pagos</a>
            <a href="#" className="font-medium text-on-surface-variant hover:text-primary transition-colors">Trámites</a>
            <a href="#" className="font-medium text-on-surface-variant hover:text-primary transition-colors">Puntos de Atención</a>
          </nav>

          <div className="flex items-center gap-4">
             <button className="p-2.5 rounded-full hover:bg-surface-container transition-colors relative">
               <Bell className="w-5 h-5 text-on-surface-variant" />
               <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full" />
             </button>
             <button className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
               Mi Cuenta
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 w-full space-y-10">
        {/* Search Module */}
        <section className="bg-white p-10 rounded-3xl border border-outline-variant shadow-xl shadow-primary/5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-primary mb-2 italic">Consulta de Servicios</h2>
            <p className="text-on-surface-variant font-medium">Acceda a su facturación y estado de red en tiempo real</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4">
                <label className="block text-[11px] font-black text-primary uppercase tracking-widest mb-3 ml-1">Búsqueda por</label>
                <div className="relative">
                    <select className="w-full bg-surface-container-low border-2 border-outline-variant rounded-2xl p-4 font-bold text-on-surface focus:border-primary focus:ring-0 appearance-none">
                        <option>Código de Cliente</option>
                        <option>CI / NIT</option>
                        <option>Nº Medidor</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                        <ChevronDownIcon />
                    </div>
                </div>
            </div>
            <div className="md:col-span-8">
                <label className="block text-[11px] font-black text-primary uppercase tracking-widest mb-3 ml-1">Ingrese el identificador</label>
                <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Ej. 102345" 
                      className="flex-1 bg-surface-container-low border-2 border-outline-variant rounded-2xl p-4 font-black transition-all focus:border-primary focus:bg-white outline-none"
                    />
                    <button className="bg-primary text-white px-8 rounded-2xl font-black flex items-center gap-3 hover:brightness-110 active:scale-95 transition-all shadow-lg">
                        <Search className="w-5 h-5" />
                        Buscar
                    </button>
                </div>
            </div>
          </div>
          <p className="text-center text-xs text-outline mt-8 font-medium italic">Mantenga sus datos actualizados para recibir alertas de consumo excesivo vía SMS o Email.</p>
        </section>

        {/* Alert Zone */}
        <div className="bg-error-container/40 border-2 border-error p-6 rounded-2xl flex gap-5 items-center shadow-lg shadow-error/10 animate-pulse">
            <div className="bg-error p-3 rounded-xl shadow-err-xl">
               <AlertTriangle className="text-white w-8 h-8" />
            </div>
            <div>
                <h4 className="text-lg font-black text-error italic uppercase tracking-tighter">ALERTA: Consumo Excedido</h4>
                <p className="text-on-error-container font-medium leading-tight">Se ha detectado un consumo de <span className="font-black underlineDecoration">52.4 m³</span> este periodo, superando el límite de 45 m³. Le sugerimos revisar sus grifos y tuberías.</p>
            </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* User Info */}
            <div className="md:col-span-1 bg-surface-container-high rounded-3xl p-8 border border-outline-variant flex flex-col justify-between group hover:border-primary transition-all">
                <div className="space-y-6">
                    <div className="flex justify-between items-start">
                        <div className="bg-primary-fixed p-4 rounded-2xl border-4 border-white shadow-md">
                            <User className="text-primary w-8 h-8" />
                        </div>
                        <span className="bg-secondary-container text-on-secondary-container text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-sm">R-2 Residencial</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-primary leading-tight">Juan Pérez Morales</h3>
                        <p className="font-bold text-on-surface-variant flex items-center gap-1 mt-1 opacity-60">ID: 8854322</p>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant bg-white/40 p-3 rounded-xl border border-white/20">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold truncate">Av. América E-0450, Cochabamba</span>
                    </div>
                </div>
                <div className="mt-10 pt-6 border-t border-outline-variant/40 flex justify-between items-center text-xs font-black uppercase text-outline">
                    <span>Última lectura:</span>
                    <span className="text-on-surface opacity-100">12 OCT 2024</span>
                </div>
            </div>

            {/* Debt Card */}
            <div className="md:col-span-1 bg-primary text-white rounded-3xl p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Estado de Deuda</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black italic tracking-tighter leading-none">245.50</span>
                        <span className="text-xl font-bold opacity-70 italic uppercase">Bs.</span>
                    </div>
                    <p className="mt-6 text-sm font-medium opacity-80 border-l-2 border-white/20 pl-4">Factura pendiente del mes de SEPTIEMBRE. Evite cortes del servicio.</p>
                </div>
                <div className="mt-10 space-y-3 z-10">
                    <button className="w-full bg-secondary-container text-on-secondary-container py-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95 uppercase tracking-widest">
                        <CreditCard className="w-5 h-5" />
                        Pagar Bs. 245.50
                    </button>
                    <button className="w-full bg-white/10 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 border border-white/20 hover:bg-white/20 transition-all text-xs uppercase tracking-widest">
                        <FileText className="w-4 h-4" />
                        Ver Duplicado
                    </button>
                </div>
            </div>

            {/* Meter Card */}
            <div className="md:col-span-1 bg-white border border-outline-variant rounded-3xl p-8 shadow-md flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-fixed/30 rounded-2xl">
                        <Gauge className="text-primary w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-on-surface uppercase tracking-widest text-xs">Lectura de Medidor</h4>
                        <p className="text-[10px] font-bold text-outline uppercase tracking-tighter">Sincronización en vivo</p>
                    </div>
                </div>
                
                <div className="py-6 flex flex-col items-center justify-center bg-gray-100 rounded-2xl border-2 border-gray-200 shadow-inner">
                    <div className="flex gap-1.5 p-2 bg-black rounded-lg border-2 border-gray-600 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                        {['1','4','9','2','8'].map((n) => (
                           <div key={n} className="w-8 h-12 bg-white rounded flex items-center justify-center font-mono text-2xl font-black text-black">
                               {n}
                           </div>
                        ))}
                        <div className="w-8 h-12 bg-error rounded flex items-center justify-center font-mono text-2xl font-black text-white shadow-inner">
                            7
                        </div>
                    </div>
                    <p className="mt-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1 opacity-60">
                        Total M³ Registrados <Info className="w-3 h-3" />
                    </p>
                </div>

                <div className="bg-surface-container-low p-5 rounded-2xl space-y-3 border border-outline-variant/30">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-outline uppercase">Nº Medidor</span>
                        <span className="text-sm font-black text-on-surface">SN-882910</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-3 border-t border-outline-variant/30">
                        <span className="text-[10px] font-black text-outline uppercase">Ubicación</span>
                        <span className="text-[10px] font-black text-on-secondary-container bg-secondary-container/20 px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircleIcon /> ACTIVO
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* History Graph */}
        <section className="bg-white rounded-3xl p-10 border border-outline-variant shadow-lg flex flex-col gap-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                   <h3 className="text-2xl font-black text-primary italic">Histórico de Consumo</h3>
                   <p className="font-medium text-on-surface-variant opacity-60">Últimos 6 meses de facturación</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-xs font-bold text-on-surface-variant">Promedio: 38 m³</span>
                   </div>
                   <div className="flex items-center gap-3 px-4 py-2 bg-error-container/20 rounded-xl border border-error/10">
                      <div className="w-3 h-3 rounded-full bg-error" />
                      <span className="text-xs font-bold text-error">Exceso &gt; 45 m³</span>
                   </div>
                </div>
            </div>

            <div className="h-64 flex items-end justify-between px-4 pb-8 relative group">
                <div className="absolute inset-x-0 top-0 border-t-2 border-dashed border-outline-variant/10 text-[10px] font-bold text-outline pr-2 flex justify-end">50 m³</div>
                <div className="absolute inset-x-0 top-[20%] border-t-2 border-dashed border-error/20 text-[10px] font-black text-error pr-2 flex justify-end pointer-events-none">LÍMITE MÁXIMO (45 m³)</div>
                <div className="absolute inset-x-0 bottom-8 border-t-2 border-outline-variant/10 text-[10px] font-bold text-outline pr-2 flex justify-end">25 m³</div>

                {['Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre'].map((month, i) => {
                    const values = [30, 38, 35, 42, 52, 28];
                    const val = values[i];
                    const isExceed = val > 45;
                    return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-4 relative md:mx-4 group/bar">
                            <div 
                              className={cn(
                                "w-full max-w-[50px] min-h-[10px] rounded-t-xl transition-all duration-700 relative",
                                isExceed 
                                    ? "bg-error shadow-[0_0_20px_rgba(186,26,26,0.2)]" 
                                    : month === 'Octubre' 
                                        ? "bg-primary/20 border-t-4 border-dashed border-primary" 
                                        : "bg-surface-container-highest group-hover/bar:bg-primary/40"
                              )} 
                              style={{ height: `${val * 2}px` }}
                            >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                    {val} m³
                                </div>
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-tighter", isExceed ? "text-error" : "text-outline")}>{month}</span>
                        </div>
                    );
                })}
            </div>
            <button className="flex items-center gap-2 text-xs font-black uppercase text-primary self-center hover:bg-primary/5 px-6 py-3 rounded-2xl transition-all">
                <History className="w-4 h-4" /> Ver Historial Completo
            </button>
        </section>

        {/* Infrastructure Status */}
        <div className="relative h-[450px] rounded-[40px] overflow-hidden group shadow-2xl border-4 border-white">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmUfWrOX5PbXD-EIvHQVFCAKd-vVu2yejWVOA8caCa-yGlVg5Vuc30d6BU9N5Ca1BgZ2Yn5ebuq7ccGHAzz1eqzgrWIN3Xif9V4R__zixppts4OLUHfnZKFDrBqZpakVKUxi4gJFM617HpY3KO51SgX_lpqC8Ere_07FKi7xEHyS4GTIfQoLLTjKCUU1Puy308pbJxVRXRR_2k86pkrqu-EC8NYwO8Q7qXBcDY-XFzThfMlL2V8iEhizsE-b_uW2w-yecqiBQaRIUD" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110"
              alt="Infrastructure Map"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 bg-white/80 backdrop-blur-xl p-10 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 border border-white">
                <div className="space-y-2">
                    <h4 className="text-2xl font-black text-primary italic">Estado de Red Local</h4>
                    <p className="font-bold text-on-surface-variant flex items-center gap-2">
                        <span className="w-3 h-3 bg-secondary rounded-full animate-pulse" />
                        Servicio NORMAL: Presión estable de 15.2 PSI en su zona municipal.
                    </p>
                </div>
                <button className="whitespace-nowrap bg-primary text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all">
                    Reportar Incidente
                </button>
            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-tertiary text-on-tertiary py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="bg-white/10 p-2 rounded-lg">
                      <Droplets className="text-secondary-fixed w-6 h-6" />
                   </div>
                   <h5 className="text-xl font-black italic">SEMAPA Cochabamba</h5>
                </div>
                <p className="text-sm opacity-50 font-medium">© 2024 SEMAPA Cochabamba - Gestión de Agua y Alcantarillado Ambiental. Comprometidos con el recurso vital de nuestra ciudad.</p>
            </div>
            <div className="space-y-4">
                <h6 className="font-black text-xs uppercase tracking-widest text-primary-fixed">Legal</h6>
                <ul className="space-y-2 text-sm font-medium opacity-70">
                    <li><a href="#" className="hover:opacity-100 transition-opacity">Términos de Servicio</a></li>
                    <li><a href="#" className="hover:opacity-100 transition-opacity">Políticas de Privacidad</a></li>
                    <li><a href="#" className="hover:opacity-100 transition-opacity">Transparencia Pública</a></li>
                </ul>
            </div>
            <div className="space-y-4">
                <h6 className="font-black text-xs uppercase tracking-widest text-primary-fixed">Contacto</h6>
                <ul className="space-y-2 text-sm font-medium opacity-70">
                    <li className="flex items-center gap-2"><Globe className="w-4 h-4" /> www.semapa.com.bo</li>
                    <li className="flex items-center gap-2"><PhoneIcon /> Emergencias: 178</li>
                </ul>
            </div>
        </div>
      </footer>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  );
}

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.71 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  );
}
