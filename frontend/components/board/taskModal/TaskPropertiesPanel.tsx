import { BoardColumn, TaskPriority } from '@/types/board';
import TaskField from './TaskField';
import { taskPriorityBadgeClasses, taskPriorityOptions } from './taskModal.constants';

interface TaskPropertiesPanelProps {
  columns: BoardColumn[];
  columnId: string;
  priority: TaskPriority;
  dueDate: string;
  completed: boolean;
  onColumnChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onDueDateChange: (value: string) => void;
  onCompletedChange: (value: boolean) => void;
}

export default function TaskPropertiesPanel({
  columns,
  columnId,
  priority,
  dueDate,
  completed,
  onColumnChange,
  onPriorityChange,
  onDueDateChange,
  onCompletedChange,
}: TaskPropertiesPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-container-low rounded-lg border border-surface-container-highest">
      <TaskField label="List / Status">
        <select
          value={columnId}
          onChange={(event) => onColumnChange(event.target.value)}
          className="w-full text-[13px] font-medium bg-white text-on-surface border border-outline-variant rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>
      </TaskField>

      <TaskField label="Priority">
        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value as TaskPriority)}
          className={`w-full text-[13px] font-semibold border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary ${taskPriorityBadgeClasses[priority]}`}
        >
          {taskPriorityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </TaskField>

      <TaskField label="Due Date">
        <input
          type="text"
          value={dueDate}
          onChange={(event) => onDueDateChange(event.target.value)}
          placeholder="e.g. Oct 15"
          className="w-full text-[13px] font-medium bg-white text-on-surface border border-outline-variant rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </TaskField>

      <div className="flex items-center gap-3 pt-4">
        <label className="flex items-center gap-2 text-[13px] font-medium text-on-surface cursor-pointer">
          <input
            type="checkbox"
            checked={completed}
            onChange={(event) => onCompletedChange(event.target.checked)}
            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
          />
          Mark as Completed
        </label>
      </div>
    </div>
  );
}