'use client';

import { useCallback, useMemo, useState } from 'react';
import { BoardColumn, TaskItem } from '@/types/board';
import { filterColumnsByQuery } from './kanbanBoard.utils';

interface UseKanbanStateReturn {
  columns: BoardColumn[];
  setColumns: React.Dispatch<React.SetStateAction<BoardColumn[]>>;
  selectedTask: TaskItem | null;
  setSelectedTask: React.Dispatch<React.SetStateAction<TaskItem | null>>;
  selectedColumnId: string;
  setSelectedColumnId: React.Dispatch<React.SetStateAction<string>>;
  filteredColumns: BoardColumn[];
}

/**
 * Hook que centraliza todo el estado del tablero Kanban
 * Maneja:
 * - Columnas y tareas
 * - Tarea seleccionada actualmente (para el modal)
 * - Columna origen de la tarea seleccionada
 * - Filtrado de columnas por búsqueda
 */
export function useKanbanState(
  initialColumns: BoardColumn[],
  searchQuery: string
): UseKanbanStateReturn {
  // Estado de columnas
  const [columns, setColumns] = useState<BoardColumn[]>(initialColumns);

  // Estado de tarea seleccionada (para abrir modal)
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Columna origen de la tarea seleccionada
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');

  // Columnas filtradas por búsqueda (memoizado)
  const filteredColumns = useMemo(
    () => filterColumnsByQuery(columns, searchQuery),
    [columns, searchQuery]
  );

  return {
    columns,
    setColumns,
    selectedTask,
    setSelectedTask,
    selectedColumnId,
    setSelectedColumnId,
    filteredColumns,
  };
}
