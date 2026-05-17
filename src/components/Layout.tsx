import React from 'react';
import { Sidebar } from './Sidebar';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isKiosk = location.pathname === '/kiosk';

  if (isKiosk) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
