'use client';

import React from 'react';

interface AddTaskButtonProps {
  onClick: () => void;
}

/**
 * Botón para iniciar la adición de una nueva tarea
 */
export default function AddTaskButton({ onClick }: AddTaskButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 text-on-surface-variant hover:bg-surface-container-lowest rounded hover:text-on-surface transition-colors cursor-pointer"
    >
      <span className="material-symbols-outlined text-[18px]">add</span>
      <span className="text-[14px]">Add a card</span>
    </button>
  );
}
