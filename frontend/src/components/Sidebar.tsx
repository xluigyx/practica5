import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Droplets,
  ReceiptText,
  PlusCircle,
  Activity,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Alcaldía', href: '/' },
  { icon: Activity, label: 'Gerencia (IoT)', href: '/iot' },
  { icon: ReceiptText, label: 'Contabilidad', href: '/billing' },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-outline-variant bg-surface-container flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="px-6 py-8 flex flex-col gap-2">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
             <Droplets className="text-on-primary w-8 h-8" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-primary leading-tight">SEMAPA Cochabamba</h1>
          <p className="text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider">Gestión Hídrica Centralizada</p>
        </div>
      </div>

      <nav className="mt-4 flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label} className="px-4">
              <NavLink
                to={item.href}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group",
                  isActive 
                    ? "text-primary font-bold border-r-4 border-primary bg-surface-container-high" 
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                )}
              >
                <item.icon className={cn("w-5 h-5", "group-hover:scale-110 transition-transform")} />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-6 border-t border-outline-variant">
        <button className="w-full bg-primary text-on-primary py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-lg">
          <PlusCircle className="w-5 h-5" />
          Nuevo Incidente
        </button>
      </div>
    </aside>
  );
}
