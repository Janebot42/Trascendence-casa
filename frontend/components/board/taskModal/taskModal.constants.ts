import { TaskPriority } from '@/types/board';

export const taskPriorityOptions: TaskPriority[] = [
  'Low',
  'Medium',
  'Urgent',
  'Enhancement',
];

export const taskPriorityBadgeClasses: Record<TaskPriority, string> = {
  Low: 'bg-surface-container-low text-primary border-primary/20',
  Medium: 'bg-primary/10 text-primary border-primary/20',
  Urgent: 'bg-error/10 text-error border-error/20',
  Enhancement: 'bg-surface-container-high text-on-surface-variant border-on-surface-variant/20',
};
