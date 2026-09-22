import { TaskPriority } from '@/types/board';

/**
 * Opciones de prioridad disponibles para agregar tareas
 */
export const priorityOptions: TaskPriority[] = [
  'Low',
  'Medium',
  'Urgent',
  'Enhancement',
];

/**
 * Prioridad por defecto al crear una nueva tarea
 */
export const DEFAULT_PRIORITY: TaskPriority = 'Medium';
