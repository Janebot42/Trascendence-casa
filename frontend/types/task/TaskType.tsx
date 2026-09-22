// Tipo simple usado por la pantalla de listado de tareas.
export interface TaskType {
    id: number;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "completed";
    createdAt: string;
    updatedAt: string;
}