'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Props para controlar el sidebar en mobile.
interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onCreateBoard?: () => void;
}

type NavItemProps = {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  fill?: boolean;
};

function NavItem({ href, icon, label, active, onClick, fill }: NavItemProps) {
  const baseClassName = `flex items-center gap-3 px-4 py-2 rounded-r-md font-medium text-[14px] transition-colors duration-200 ${
    active
      ? 'bg-primary/10 text-primary border-l-4 border-primary'
      : 'text-on-surface-variant hover:bg-surface-container-high border-l-4 border-transparent hover:text-on-surface'
  }`;

  const content = (
    <>
      <span
        className="material-symbols-outlined text-[20px]"
        style={{
          fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </>
  );

  return href.startsWith('/') ? (
    <Link href={href} onClick={onClick} className={baseClassName}>
      {content}
    </Link>
  ) : (
    <a href={href} onClick={onClick} className={baseClassName}>
      {content}
    </a>
  );
}

export default function Sidebar({ isOpenMobile, onCloseMobile, onCreateBoard }: SidebarProps) {
  const pathname = usePathname();

  // Estado visual de los enlaces activos.
  const isDashboardActive = pathname === '/dashboard';
  const isBoardsActive = pathname === '/' || pathname === '/boards';

  return (
    <>
      {/* Fondo oscuro para cerrar el menú en mobile. */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Navegación lateral persistente. */}
      <aside
        className={`fixed md:sticky left-0 top-0 z-50 flex flex-col w-60 h-screen bg-surface-bright border-r border-surface-container-highest shadow-sm py-6 transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Marca de la app. */}
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
            TF
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary leading-none">
              TaskFlow
            </h1>
            <p className="text-[11px] font-medium text-on-surface-variant">
              Enterprise Space
            </p>
          </div>
        </div>

        {/* Menú principal. */}
        <nav className="flex-1 flex flex-col gap-1 px-3">
          <NavItem
            href="/dashboard"
            onClick={onCloseMobile}
            icon="dashboard"
            label="Dashboard"
            active={isDashboardActive}
            fill={isDashboardActive}
          />

          <NavItem
            href="/"
            onClick={onCloseMobile}
            icon="view_kanban"
            label="Boards"
            active={isBoardsActive}
            fill={isBoardsActive}
          />

          <NavItem
            href="/security"
            onClick={onCloseMobile}
            icon="shield"
            label="Security"
            active={pathname === '/security'}
            fill={pathname === '/security'}
          />
        </nav>

        {/* CTA inferior para crear tableros. */}
        <div className="px-6 mt-auto">
          <button
            onClick={() => {
              onCloseMobile?.();
              onCreateBoard?.();
            }}
            className="w-full bg-primary text-white text-[12px] font-semibold py-2.5 rounded-lg hover:bg-primary-container transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            Create board
          </button>
        </div>
      </aside>
    </>
  );
}
