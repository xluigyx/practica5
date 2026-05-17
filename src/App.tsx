import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';

// Lazy load pages for better performance
const HydraulicDashboard = lazy(() => import('./pages/HydraulicDashboard'));
const IoTMonitor = lazy(() => import('./pages/IoTMonitor'));
const AccountabilityDashboard = lazy(() => import('./pages/AccountabilityDashboard'));
const CitizenPortal = lazy(() => import('./pages/CitizenPortal'));
const KioskMode = lazy(() => import('./pages/KioskMode'));

// Temporary components for unfinished routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="mt-4 text-on-surface-variant italic opacity-60">Módulo en proceso de implementación corporativa conforme a regulaciones vigentes.</p>
  </div>
);

export default function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-bold text-primary animate-pulse uppercase tracking-[0.2em]">Cargando Sistema SEMAPA...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<HydraulicDashboard />} />
            <Route path="/iot" element={<IoTMonitor />} />
            <Route path="/billing" element={<AccountabilityDashboard />} />
            <Route path="/citizens" element={<CitizenPortal />} />
            <Route path="/kiosk" element={<KioskMode />} />
            
            <Route path="/infrastructure" element={<Placeholder title="Gestión de Infraestructura" />} />
            <Route path="/reports" element={<Placeholder title="Reportes y Estadísticas" />} />
            <Route path="/settings" element={<Placeholder title="Configuración del Sistema" />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}
