'use client';

import React, { useState } from 'react';

interface ColumnHeaderProps {
  title: string;
  taskCount: number;
  onRename?: (name: string) => void;
  onArchive?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  draggable?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

/**
 * Encabezado de la columna Kanban
 * Muestra el título y la cantidad de tareas
 */
export default function ColumnHeader({ title, taskCount, onRename, onArchive, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight, draggable, onPointerDown }: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);

  const save = () => {
    if (!value.trim()) return;
    onRename?.(value.trim());
    setIsEditing(false);
  };

  if (isEditing) {
    return <div className="kanban-column-header gap-2"><input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') save(); if (event.key === 'Escape') setIsEditing(false); }} autoFocus maxLength={80} className="min-w-0 flex-1 rounded border border-primary px-2 py-1 text-sm focus:outline-none" /><button type="button" onClick={save} className="text-primary" aria-label="Guardar nombre"><span className="material-symbols-outlined text-[18px]">check</span></button><button type="button" onClick={() => setIsEditing(false)} className="text-on-surface-variant" aria-label="Cancelar"><span className="material-symbols-outlined text-[18px]">close</span></button></div>;
  }

  return (
    <div className="kanban-column-header group">
      {draggable && <button type="button" onPointerDown={onPointerDown} onClick={(event) => event.preventDefault()} className="touch-none cursor-grab text-outline hover:text-on-surface active:cursor-grabbing" aria-label="Arrastrar lista" title="Arrastrar para cambiar de posición"><span className="material-symbols-outlined text-[18px]">drag_indicator</span></button>}
      <span className="min-w-0 truncate text-[16px] font-semibold text-on-surface">{title}</span>
      <span className="text-on-surface-variant text-xs font-semibold bg-surface-container-lowest px-2 py-0.5 rounded-full">{taskCount}</span>
      <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={onMoveLeft} disabled={!canMoveLeft} className="text-on-surface-variant hover:text-primary disabled:invisible" aria-label="Mover lista a la izquierda"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
        <button type="button" onClick={onMoveRight} disabled={!canMoveRight} className="text-on-surface-variant hover:text-primary disabled:invisible" aria-label="Mover lista a la derecha"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
        <button type="button" onClick={() => { setValue(title); setIsEditing(true); }} className="text-on-surface-variant hover:text-primary" aria-label="Editar lista"><span className="material-symbols-outlined text-[16px]">edit</span></button>
        <button type="button" onClick={onArchive} className="text-on-surface-variant hover:text-error" aria-label="Archivar lista"><span className="material-symbols-outlined text-[16px]">archive</span></button>
      </div>
    </div>
  );
}
