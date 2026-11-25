'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/login/actions';
import {
  LayoutGrid,
  BarChart3,
  CheckSquare,
  BellRing,
  Headset,
  FolderKanban,
  Landmark,
  Users,
  Target,
  FileSpreadsheet,
  Receipt,
  Wallet,
  Layers,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';

export type SidebarMenuItem = {
  id: string;
  name: string;
  path: string;
  group: 'principal' | 'operaciones' | 'comercial' | 'finanzas';
};

export type SidebarUserInfo = {
  nombre: string;
  email: string;
  initials: string;
  superAdmin: boolean;
};

interface DashboardShellProps {
  menuItems: SidebarMenuItem[];
  userInfo: SidebarUserInfo;
  children: React.ReactNode;
}

const GROUP_LABELS: Record<SidebarMenuItem['group'], string> = {
  principal: 'Principal',
  operaciones: 'Operaciones',
  comercial: 'Comercial & CRM',
  finanzas: 'Finanzas',
};

const GROUP_ORDER: SidebarMenuItem['group'][] = ['principal', 'operaciones', 'comercial', 'finanzas'];

function ModuleIcon({ id, active }: { id: string; active: boolean }) {
  const cls = `w-[19px] h-[19px] shrink-0 transition-transform duration-200 ${
    active ? 'text-[#58b7ff] scale-[1.04]' : 'text-blue-200/75 group-hover:text-white'
  }`;

  switch (id) {
    case 'inicio':
      return <LayoutGrid className={cls} aria-hidden="true" />;
    case 'dashboard':
      return <BarChart3 className={cls} aria-hidden="true" />;
    case 'tareas':
      return <CheckSquare className={cls} aria-hidden="true" />;
    case 'recordatorios':
      return <BellRing className={cls} aria-hidden="true" />;
    case 'soporte-lexlatin':
      return <Headset className={cls} aria-hidden="true" />;
    case 'proyectos':
      return <FolderKanban className={cls} aria-hidden="true" />;
    case 'contable':
      return <Landmark className={cls} aria-hidden="true" />;
    case 'crm':
      return <Users className={cls} aria-hidden="true" />;
    case 'oportunidades':
      return <Target className={cls} aria-hidden="true" />;
    case 'cotizaciones':
      return <FileSpreadsheet className={cls} aria-hidden="true" />;
    case 'facturacion':
      return <Receipt className={cls} aria-hidden="true" />;
    case 'cuentas-por-pagar':
      return <Wallet className={cls} aria-hidden="true" />;
    case 'lineas-productos':
      return <Layers className={cls} aria-hidden="true" />;
    default:
      return <Briefcase className={cls} aria-hidden="true" />;
  }
}

const STORAGE_KEY = 'movida_erp_sidebar_collapsed';

export default function DashboardShell({ menuItems, userInfo, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; top: number; danger?: boolean } | null>(null);

  const showCollapsedTip = (el: HTMLElement, label: string, danger = false) => {
    if (!collapsed) return;
    const rect = el.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, danger });
  };
  const hideCollapsedTip = () => setTooltip(null);

  // Hidratar estado guardado de colapso en desktop
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') setCollapsed(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Cerrar drawer móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Cerrar drawer móvil con Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isRouteActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const groupedItems = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    items: menuItems.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);

  const configActive = isRouteActive('/configuracion');

  return (
    <div className="min-h-screen bg-background flex print:min-h-0 print:block print:bg-white">
      {/* Skip link para accesibilidad de teclado */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#00015c] focus:text-white focus:font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-[#58b7ff] print:hidden"
      >
        Ir al contenido principal
      </a>

      {/* Barra superior móvil (< lg) */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-16 bg-[#00015c] border-b border-white/10 px-4 flex items-center justify-between text-white shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú de navegación"
            aria-expanded={mobileOpen}
            aria-controls="movida-sidebar"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/10 hover:bg-[#0070c0] flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b7ff]"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="Movida TCI" className="h-full w-full object-contain" />
            </span>
            <span className="font-bold text-base tracking-tight">
              Movida <span className="text-[#58b7ff]">ERP</span>
            </span>
          </Link>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0070c0] to-[#58b7ff] flex items-center justify-center text-xs font-bold text-white shadow-inner">
          {userInfo.initials}
        </div>
      </header>

      {/* Backdrop móvil */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-[#0a0b2e]/60 backdrop-blur-xs transition-opacity print:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Corporativo Movida TCI */}
      <aside
        id="movida-sidebar"
        aria-label="Barra lateral de Movida ERP"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col text-white select-none print:hidden
          bg-gradient-to-b from-[#00015c] via-[#060952] to-[#0a0b2e]
          border-r border-white/10 shadow-[4px_0_24px_-4px_rgba(0,1,92,0.35)]
          transition-[width,transform] duration-200 ease-out motion-reduce:transition-none
          ${mobileOpen ? 'translate-x-0 w-[264px]' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[82px]' : 'lg:w-[264px]'}`}
      >
        {/* Brillo ambiental superior con el azul secundario de movidatci.com */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-16 w-56 h-56 rounded-full bg-[#0070c0]/25 blur-3xl"
        />

        {/* Cabecera de marca + Botón de Colapsar / Expandir */}
        <div
          className={`relative flex items-center border-b border-white/10 h-[72px] shrink-0 ${
            collapsed ? 'lg:justify-center lg:px-2 px-5 justify-between' : 'justify-between px-5'
          }`}
        >
          <Link
            href="/"
            className={`flex items-center gap-3 min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b7ff] ${
              collapsed ? 'lg:justify-center' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md shadow-black/20 ring-1 ring-white/25 shrink-0">
              <img src="/logo.png" alt="Movida TCI" className="w-full h-full object-contain" />
            </div>
            <div className={`min-w-0 transition-opacity duration-150 ${collapsed ? 'lg:hidden' : 'block'}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[17px] tracking-tight text-white leading-none">
                  Movida
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#0070c0]/35 border border-[#58b7ff]/35 text-[10px] font-extrabold uppercase tracking-wider text-[#58b7ff]">
                  ERP
                </span>
              </div>
              <p className="text-[11px] text-blue-200/65 font-medium truncate mt-0.5">
                Movida TCI
              </p>
            </div>
          </Link>

          {/* Cerrar en móvil */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú de navegación"
            className="lg:hidden min-h-[36px] min-w-[36px] rounded-xl text-blue-200 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b7ff]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Toggle Colapsar / Expandir en Desktop (cuando está expandido) */}
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Colapsar barra lateral"
              aria-expanded={true}
              aria-controls="movida-sidebar"
              className="hidden lg:flex min-h-[34px] min-w-[34px] rounded-xl text-blue-200/75 hover:text-white hover:bg-white/10 items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b7ff]"
            >
              <PanelLeftClose className="w-[18px] h-[18px]" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Botón para Expandir cuando está colapsado en Desktop */}
        {collapsed && (
          <div className="hidden lg:flex justify-center pt-2.5 pb-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                hideCollapsedTip();
                toggleCollapsed();
              }}
              onMouseEnter={(e) => showCollapsedTip(e.currentTarget, 'Expandir menú')}
              onMouseLeave={hideCollapsedTip}
              onFocus={(e) => showCollapsedTip(e.currentTarget, 'Expandir menú')}
              onBlur={hideCollapsedTip}
              aria-label="Expandir barra lateral"
              aria-expanded={false}
              aria-controls="movida-sidebar"
              className="min-h-[36px] min-w-[36px] rounded-xl bg-white/[0.08] hover:bg-[#0070c0] text-[#58b7ff] hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b7ff]"
            >
              <PanelLeftOpen className="w-[18px] h-[18px]" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Navegación principal por grupos */}
        <nav
          aria-label="Principal"
          onScroll={hideCollapsedTip}
          className={`flex-1 py-3 overflow-y-auto overflow-x-hidden sidebar-scroll ${
            collapsed ? 'px-3 space-y-3' : 'px-3.5 space-y-5'
          }`}
        >
          {groupedItems.map((section, sectionIdx) => (
            <div key={section.group}>
              {!collapsed ? (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#58b7ff]/70">
                  {section.label}
                </p>
              ) : (
                sectionIdx > 0 && (
                  <div className="hidden lg:block mx-3 mb-2 border-t border-white/10" aria-hidden="true" />
                )
              )}

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isRouteActive(item.path);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.path}
                        aria-current={active ? 'page' : undefined}
                        onMouseEnter={(e) => showCollapsedTip(e.currentTarget, item.name)}
                        onMouseLeave={hideCollapsedTip}
                        onFocus={(e) => showCollapsedTip(e.currentTarget, item.name)}
                        onBlur={hideCollapsedTip}
                        className={`group relative flex items-center rounded-xl min-h-[40px] text-[13.5px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b7ff] ${
                          collapsed
                            ? 'lg:justify-center lg:px-0 px-3 gap-3'
                            : 'px-3 gap-3'
                        } ${
                          active
                            ? 'bg-[#0070c0] text-white font-semibold shadow-md shadow-[#0070c0]/30 ring-1 ring-[#58b7ff]/40'
                            : 'text-blue-100/80 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {/* Indicador visual lateral (no depende solo de color - WCAG 1.4.1) */}
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-5 rounded-r-full bg-[#58b7ff]"
                          />
                        )}

                        <ModuleIcon id={item.id} active={active} />

                        <span className={`truncate ${collapsed ? 'lg:sr-only' : ''}`}>
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Pie del Sidebar: Configuración + Perfil + Cerrar Sesión */}
        <div className="p-3 border-t border-white/10 space-y-2.5 shrink-0 bg-[#07093d]/55">
          {userInfo.superAdmin && (
            <Link
              href="/configuracion"
              aria-current={configActive ? 'page' : undefined}
              onMouseEnter={(e) => showCollapsedTip(e.currentTarget, 'Configuración')}
              onMouseLeave={hideCollapsedTip}
              onFocus={(e) => showCollapsedTip(e.currentTarget, 'Configuración')}
              onBlur={hideCollapsedTip}
              className={`group relative flex items-center rounded-xl min-h-[40px] text-[13.5px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b7ff] ${
                collapsed ? 'lg:justify-center lg:px-0 px-3 gap-3' : 'px-3 gap-3'
              } ${
                configActive
                  ? 'bg-[#0070c0] text-white font-semibold shadow-md shadow-[#0070c0]/30 ring-1 ring-[#58b7ff]/40'
                  : 'text-blue-100/80 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {configActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-5 rounded-r-full bg-[#58b7ff]"
                />
              )}
              <Settings
                className={`w-[19px] h-[19px] shrink-0 ${
                  configActive ? 'text-[#58b7ff]' : 'text-blue-200/75 group-hover:text-white'
                }`}
                aria-hidden="true"
              />
              <span className={collapsed ? 'lg:sr-only' : ''}>Configuración</span>
            </Link>
          )}

          {/* Tarjeta de perfil de usuario */}
          <div
            className={`rounded-2xl bg-white/[0.06] border border-white/10 transition-all ${
              collapsed
                ? 'lg:p-2 p-3 flex lg:flex-col items-center gap-2'
                : 'p-3 flex items-center gap-3'
            }`}
          >
            <div
              className="w-9 h-9 rounded-xl shrink-0 bg-gradient-to-br from-[#0070c0] to-[#58b7ff] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-white/20"
              aria-hidden="true"
            >
              {userInfo.initials}
            </div>

            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : 'block'}`}>
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-white truncate">{userInfo.nombre}</p>
                {userInfo.superAdmin && (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#58b7ff] shrink-0" aria-hidden="true" />
                )}
              </div>
              <p className="text-[11px] text-blue-200/65 truncate">{userInfo.email}</p>
            </div>

            <form action={logout} className={collapsed ? 'lg:ml-0 ml-auto' : 'ml-auto'}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                onMouseEnter={(e) => showCollapsedTip(e.currentTarget, 'Cerrar sesión', true)}
                onMouseLeave={hideCollapsedTip}
                onFocus={(e) => showCollapsedTip(e.currentTarget, 'Cerrar sesión', true)}
                onBlur={hideCollapsedTip}
                className="min-h-[34px] min-w-[34px] rounded-lg text-blue-200/70 hover:text-rose-300 hover:bg-rose-500/15 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58b7ff]"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Tooltip flotante fijo para modo colapsado (nunca recortado por overflow) */}
      {collapsed && tooltip && (
        <div
          aria-hidden="true"
          style={{ top: tooltip.top }}
          className={`hidden lg:block fixed left-[92px] -translate-y-1/2 z-[60] pointer-events-none px-3 py-1.5 rounded-lg bg-[#0a0b2e] text-white text-xs font-semibold whitespace-nowrap shadow-xl border ${
            tooltip.danger ? 'border-rose-400/40 text-rose-200' : 'border-[#58b7ff]/40'
          }`}
        >
          {tooltip.label}
        </div>
      )}

      {/* Área principal de contenido (se adapta suavemente al colapsar/expandir) */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 min-w-0 pt-20 lg:pt-8 px-4 sm:px-6 lg:px-8 pb-8 min-h-screen flex flex-col
          transition-[margin-left] duration-200 ease-out motion-reduce:transition-none
          ${collapsed ? 'lg:ml-[82px]' : 'lg:ml-[264px]'}
          print:ml-0 print:p-0 print:pt-0 print:min-h-0 print:h-auto print:block`}
      >
        <div className="max-w-7xl mx-auto w-full flex-1 print:max-w-none print:w-full print:h-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
