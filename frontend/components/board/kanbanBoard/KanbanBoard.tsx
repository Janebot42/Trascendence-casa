'use client';

import React from 'react';
import { mockUsers } from '@/data/mockBoardData';
import { BoardColumn } from '@/types/board';
import KanbanColumn from '../kanbanColumn';
import TaskModal from '../taskModal/TaskModal';
import { useKanbanState } from './useKanbanState';
import { useKanbanHandlers } from './useKanbanHandlers';

// Props del tablero Kanban.
interface KanbanBoardProps {
  initialColumns: BoardColumn[];
  searchQuery: string;
}

/**
 * Tablero Kanban principal
 * Orquestador que combina hooks de estado y handlers
 * Responsable de renderizar columnas y modal
 */
export default function KanbanBoard({ initialColumns, searchQuery }: KanbanBoardProps) {
  // Estado del tablero (columnas, tarea seleccionada, filtrado)
  const {
    columns,
    setColumns,
    selectedTask,
    setSelectedTask,
    selectedColumnId,
    setSelectedColumnId,
    filteredColumns,
  } = useKanbanState(initialColumns, searchQuery);

  // Handlers del tablero (agregar tarea, guardar, eliminar, etc.)
  const {
    handleAddTask,
    handleTaskClick,
    handleSaveTask,
    handleDeleteTask,
    handleAddColumn,
  } = useKanbanHandlers({
    columns,
    selectedColumnId,
    onColumnsChange: setColumns,
    onSelectedTaskChange: setSelectedTask,
    onSelectedColumnIdChange: setSelectedColumnId,
  });

  return (
    <div className="kanban-board flex-1">
      {filteredColumns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          onAddTask={handleAddTask}
          onTaskClick={handleTaskClick}
        />
      ))}

      {/* Botón para agregar otra lista. */}
      <button
        onClick={handleAddColumn}
        className="w-70 min-w-70 flex items-center gap-2 p-3 text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg hover:text-on-surface transition-colors h-fit text-[14px] font-medium cursor-pointer shrink-0"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        Add another list
      </button>

      {/* Modal de detalle y edición de tarea. */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          currentColumnId={selectedColumnId}
          columns={columns}
          users={mockUsers}
          onClose={() => setSelectedTask(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
