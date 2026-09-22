// Componente principal - export default para importación directa
export { default } from './KanbanBoard';

// También export named para importaciones específicas
export { default as KanbanBoard } from './KanbanBoard';

// Hooks especializados
export { useKanbanState } from './useKanbanState';
export { useKanbanHandlers } from './useKanbanHandlers';

// Utilidades puras
export {
  createTaskId,
  addTaskToColumns,
  replaceOrMoveTask,
  deleteTaskFromColumns,
  addColumn,
  filterColumnsByQuery,
} from './kanbanBoard.utils';
