// Tipos compartidos por el tablero Kanban.
export type TaskPriority = 'Low' | 'Medium' | 'Urgent' | 'Enhancement' | 'Complete';

// Persona que puede asignarse a una tarea.
export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface TaskLabel {
  id: string;
  boardId: string;
  name: string;
  color: string;
}


// Modelo principal de una tarea del tablero.
export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  checklist?: {
    completed: number;
    total: number;
  };
  commentsCount?: number;
  hasAttachment?: boolean;
  assignees?: User[];
  labels?: TaskLabel[];
  completed?: boolean;
  hasWireframePreview?: boolean;
}

// Agrupa las tareas que pertenecen a una lista/columna.
export interface BoardColumn {
  id: string;
  title: string;
  tasks: TaskItem[];
}
