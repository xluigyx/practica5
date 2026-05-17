import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';

const AlcaldiaDashboard       = lazy(() => import('./pages/AlcaldiaDashboard'));
const GerenciaDashboard       = lazy(() => import('./pages/GerenciaDashboard'));
const AccountabilityDashboard = lazy(() => import('./pages/AccountabilityDashboard'));
const CitizenPortal           = lazy(() => import('./pages/CitizenPortal'));
const IoTMonitor              = lazy(() => import('./pages/IoTMonitor'));
const KioskMode               = lazy(() => import('./pages/KioskMode'));

const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
    <div className="glass-card p-12 rounded-2xl text-center max-w-md">
      <p className="text-4xl mb-4">🚧</p>
      <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
      <p className="text-sm" style={{ color:'#4b5875' }}>Módulo en implementación · SEMAPA v2.1</p>
    </div>
  </div>
);

const Loader = () => (
  <div className="flex-1 flex items-center justify-center min-h-screen" style={{ background:'#080c14' }}>
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        <div className="absolute inset-3 rounded-full border-4 border-cyan-500/20 border-b-cyan-500 animate-spin"
          style={{ animationDirection:'reverse', animationDuration:'0.7s' }} />
      </div>
      <p className="text-sm font-bold text-blue-400 uppercase tracking-[0.25em] animate-pulse">
        Cargando SEMAPA...
      </p>
    </div>
  </div>
);

export default function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/"               element={<AlcaldiaDashboard />} />
            <Route path="/gerencia"       element={<GerenciaDashboard />} />
            <Route path="/billing"        element={<AccountabilityDashboard />} />
            <Route path="/citizens"       element={<CitizenPortal />} />
            <Route path="/iot"            element={<IoTMonitor />} />
            <Route path="/kiosk"          element={<KioskMode />} />
            <Route path="/infrastructure" element={<Placeholder title="Gestión de Infraestructura" />} />
            <Route path="/reports"        element={<Placeholder title="Reportes y Estadísticas" />} />
            <Route path="/settings"       element={<Placeholder title="Configuración del Sistema" />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}
