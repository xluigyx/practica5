import React from 'react';
import { Sidebar } from './Sidebar';
import { useLocation } from 'react-router-dom';
export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (pathname === '/kiosk') return <>{children}</>;
  return (
    <div className="flex min-h-screen" style={{ background:'#080c14' }}>
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col overflow-x-hidden">{children}</main>
    </div>
  );
}
