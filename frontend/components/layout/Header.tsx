'use client';

import React from 'react';

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
  return (
    <button
      type="button"
      onClick={() => alert('Profile menu no está implementado todavía.')}
      className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant cursor-pointer hover:border-primary transition-colors"
      aria-label="Profile menu"
    >
      <img
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSSuK40_tNbQ250GY_-XH073wfT_XbZrfkh2vJW7KXOuaUEoWrYBNRkY6U3o4vDe-9WwwIzMe39uRwhcse4x43xIQwFIQFuCxI_YI9sndOGtZgyOgMp5BD5ra2nsHkYbZDrKpz_63wzhBeKik27SuPqrOUT7ixIqSOVRTpyZk1OR6pEfR2tsE17AH_2lAanvxLgDPoHhwXi0W0Y6HyLddAJRd9vg4tfWQC7zZOdYqX0GJNZk4oez6H-w"
        alt="User Profile"
        className="w-full h-full object-cover"
      />
    </button>
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
