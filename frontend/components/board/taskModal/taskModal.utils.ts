import { TaskItem } from '@/types/board';
import { User } from '@/types/board';

interface BuildUpdatedTaskParams {
  task: TaskItem;
  title: string;
  description: string;
  priority: TaskItem['priority'];
  dueDate: string;
  completed: boolean;
  assignedUserIds: string[];
  users: User[];
}

export function buildUpdatedTask({
  task,
  title,
  description,
  priority,
  dueDate,
  completed,
  assignedUserIds,
  users,
}: BuildUpdatedTaskParams): TaskItem {
  const selectedAssignees = users.filter((user) => assignedUserIds.includes(user.id));

  return {
    ...task,
    title: title.trim(),
    description: description.trim() || undefined,
    priority,
    dueDate: dueDate.trim() || undefined,
    completed,
    assignees: selectedAssignees,
  };
}
