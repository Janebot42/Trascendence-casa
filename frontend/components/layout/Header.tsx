'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/useAuth';

// Props del header global.
interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleMobileSidebar: () => void;
  onOpenNewTaskModal?: () => void;
}

function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden mr-4 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
      aria-label="Open navigation menu"
    >
      <span className="material-symbols-outlined">menu</span>
    </button>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (query: string) => void;
}) {
  return (
    <div className="flex-1 max-w-md relative group">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tasks, boards..."
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-md pl-10 pr-4 py-1.5 text-[14px] text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
      />
    </div>
  );
}

function HeaderActionButton({
  icon,
  label,
  onClick,
  className = '',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 transition-colors cursor-pointer ${className}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  );
}

function NotificationButton() {
  return (
    <button
      onClick={() => alert('Notifications no está implementado todavía.')}
      className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center relative cursor-pointer"
      title="Notifications"
    >
      <span className="material-symbols-outlined">notifications</span>
      <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full" />
    </button>
  );
}

function ProfileAvatar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen((value) => !value)} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-primary text-xs font-bold text-white transition-colors hover:border-primary" aria-label="Abrir perfil" aria-expanded={isOpen}>
        {(user?.username?.slice(0, 1).toUpperCase() ?? 'U')}
      </button>
      {isOpen && <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-outline-variant bg-white p-3 shadow-lg">
        <div className="border-b border-outline-variant pb-3">
          <p className="text-xs text-on-surface-variant">Sesión iniciada como</p>
          <p className="mt-1 truncate font-semibold text-on-surface">{user?.username ?? 'Cargando...'}</p>
        </div>
        <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-50">
          <span className="material-symbols-outlined text-[18px]">logout</span>
          {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </div>}
    </div>
  );
}

export default function Header({
  searchQuery,
  onSearchChange,
  onToggleMobileSidebar,
  onOpenNewTaskModal,
}: HeaderProps) {
  return (
    <header className="h-16 w-full sticky top-0 z-40 bg-surface-bright border-b border-outline-variant flex justify-between items-center px-6 shrink-0 shadow-xs">
      <MobileMenuButton onClick={onToggleMobileSidebar} />

      <SearchBar value={searchQuery} onChange={onSearchChange} />

      <div className="flex items-center gap-4 ml-auto">
        <NotificationButton />

        <HeaderActionButton
          icon="add"
          label="New Task"
          onClick={onOpenNewTaskModal ?? (() => {})}
          className="hidden md:flex border border-primary text-primary px-3 py-1.5 rounded font-semibold text-[12px] hover:bg-primary/5"
        />

        <ProfileAvatar />
      </div>
    </header>
  );
}
