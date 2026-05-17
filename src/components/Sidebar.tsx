import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cpu, ReceiptText, Users, Activity, Building2, BarChart3, Shield, Settings, Droplets, Bell } from 'lucide-react';

const GROUPS = [
  { title:'DASHBOARDS', items:[
    { icon:LayoutDashboard, label:'Alcaldía — Ciudad',  href:'/' },
    { icon:Cpu,             label:'Gerencia SEMAPA',    href:'/gerencia', badge:'3', bc:'badge-amber' },
    { icon:ReceiptText,     label:'Contabilidad',       href:'/billing' },
  ]},
  { title:'SERVICIOS', items:[
    { icon:Users,     label:'Portal Ciudadano',   href:'/citizens' },
    { icon:Activity,  label:'Monitor IoT / LoRa', href:'/iot', badge:'LIVE', bc:'badge-green' },
    { icon:Building2, label:'Infraestructura',    href:'/infrastructure' },
  ]},
  { title:'SISTEMA', items:[
    { icon:BarChart3, label:'Reportes',      href:'/reports' },
    { icon:Shield,    label:'Kiosko Público',href:'/kiosk' },
    { icon:Settings,  label:'Configuración', href:'/settings' },
  ]},
];

export function Sidebar() {
  return (
    <aside className="w-64 flex flex-col h-screen fixed left-0 top-0 z-50"
      style={{ background:'linear-gradient(180deg,#0a1122 0%,#080c14 100%)', borderRight:'1px solid #1e2d45' }}>

      {/* Logo */}
      <div className="px-5 py-6" style={{ borderBottom:'1px solid #1e2d45' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#2563eb,#0891b2)', boxShadow:'0 0 16px rgba(59,130,246,0.5)' }}>
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">SEMAPA</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color:'#3b82f6' }}>Cochabamba</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)' }}>
          <span className="status-dot online" />
          <span className="text-[11px] font-semibold" style={{ color:'#34d399' }}>Sistema Operacional</span>
          <span className="ml-auto text-[10px]" style={{ color:'#2d3f5c' }}>v2.1</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {GROUPS.map(group => (
          <div key={group.title} className="mb-6">
            <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.15em]" style={{ color:'#2d3f5c' }}>
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(item => (
                <li key={item.label}>
                  <NavLink to={item.href} end={item.href === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${isActive ? 'nav-active' : ''}`
                    }
                    style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#64748b' })}>
                    <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-blue-400 transition-colors" />
                    <span className="flex-1 group-hover:text-slate-200 transition-colors">{item.label}</span>
                    {item.badge && (
                      <span className={`badge ${item.bc || 'badge-blue'} text-[10px] px-2 py-0.5`}>{item.badge}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop:'1px solid #1e2d45' }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background:'linear-gradient(135deg,#1d4ed8,#0891b2)' }}>AS</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Admin SEMAPA</p>
            <p className="text-[10px]" style={{ color:'#2d3f5c' }}>Nivel 4 · Gerencia</p>
          </div>
          <Bell className="w-4 h-4 cursor-pointer hover:text-blue-400 transition-colors" style={{ color:'#4b5875' }} />
        </div>
      </div>
    </aside>
  );
}
