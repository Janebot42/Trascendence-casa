'use client';

import React from 'react';
import { TaskItem, TaskPriority } from '@/types/board';

// Props de una tarjeta individual.
interface TaskCardProps {
  task: TaskItem;
  isDragging?: boolean;
  onClick?: () => void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
}

function getBadgeClass(priority: TaskPriority) {
  switch (priority) {
    case 'Urgent':
      return 'bg-error/10 text-error';
    case 'Medium':
      return 'bg-primary/10 text-primary';
    case 'Low':
      return 'bg-surface-container-low text-primary';
    case 'Enhancement':
      return 'bg-surface-container-high text-on-surface-variant';
    default:
      return 'bg-surface-container-high text-on-surface';
  }
}

function TaskCardHeader({
  priority,
  onActionClick,
}: {
  priority: TaskPriority;
  onActionClick?: () => void;
}) {
  return (
    <div className="flex justify-between items-start mb-2">
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${getBadgeClass(
          priority
        )}`}
      >
        {priority}
      </span>

      <button
        onClick={(event) => {
          event.stopPropagation();
          onActionClick?.();
        }}
        className="text-outline hover:text-on-surface cursor-pointer"
        aria-label="Card actions"
      >
        <span className="material-symbols-outlined text-[16px]">
          more_horiz
        </span>
      </button>
    </div>
  );
}

function TaskCardTitle({ title, completed }: { title: string; completed?: boolean }) {
  return (
    <h3
      className={`text-[14px] font-medium mb-3 leading-snug ${
        completed ? 'line-through text-on-surface-variant' : 'text-on-surface'
      }`}
    >
      {title}
    </h3>
  );
}

function TaskWireframePreview() {
  return (
    <div className="w-full h-20 bg-surface-container rounded mb-3 border border-outline-variant p-2 flex flex-col gap-1">
      <div className="w-full h-2 bg-outline-variant/30 rounded-full" />
      <div className="flex gap-2 flex-1 mt-1">
        <div className="w-1/4 h-full bg-outline-variant/30 rounded" />
        <div className="w-3/4 h-full bg-surface-container-lowest border border-outline-variant/20 rounded" />
      </div>
    </div>
  );
}

function TaskMetaIcon({ icon }: { icon: string }) {
  return <span className="material-symbols-outlined text-[14px]">{icon}</span>;
}

function TaskMetaItem({
  icon,
  children,
  className = '',
}: {
  icon: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-1 text-[12px] ${className}`}>
      <TaskMetaIcon icon={icon} />
      {children}
    </span>
  );
}

function TaskAssignees({
  completed,
  assignees,
}: {
  completed?: boolean;
  assignees?: TaskItem['assignees'];
}) {
  if (!assignees || assignees.length === 0) return null;

  return (
    <div className="flex -space-x-1">
      {assignees.map((assignee) => (
        <img
          key={assignee.id}
          src={assignee.avatar}
          alt={assignee.name}
          title={assignee.name}
          className={`w-6 h-6 rounded-full border border-white ${
            completed ? 'grayscale' : ''
          }`}
        />
      ))}
    </div>
  );
}

function TaskCardMeta({ task }: { task: TaskItem }) {
  const dueDateClass = task.priority === 'Urgent' ? 'text-error' : task.completed ? 'text-primary' : 'text-on-surface-variant';

  return (
    <div className="flex items-center justify-between text-on-surface-variant">
      <div className="flex items-center gap-3">
        {task.dueDate && (
          <TaskMetaItem icon={task.completed ? 'check_circle' : 'schedule'} className={`gap-1 ${dueDateClass}`}>
            {task.dueDate}
          </TaskMetaItem>
        )}

        {task.hasAttachment && !task.dueDate && (
          <TaskMetaItem icon="subject" />
        )}

        {task.checklist && (
          <TaskMetaItem icon="check_box">
            {task.checklist.completed}/{task.checklist.total}
          </TaskMetaItem>
        )}

        {task.commentsCount !== undefined && (
          <TaskMetaItem icon="chat_bubble_outline">
            {task.commentsCount}
          </TaskMetaItem>
        )}
      </div>

      <TaskAssignees completed={task.completed} assignees={task.assignees} />
    </div>
  );
}

export default function TaskCard({ task, isDragging, onClick, onDragStart, onDragEnd, onDragOver, onDrop }: TaskCardProps) {
  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`kanban-card ${task.completed ? 'bg-surface-container-lowest' : 'bg-surface-container'} ${
        isDragging || task.hasWireframePreview ? 'ring-2 ring-primary border-transparent' : ''
      }`}
    >
      <TaskCardHeader priority={task.priority} onActionClick={onClick} />

      <TaskCardTitle title={task.title} completed={task.completed} />

      {task.labels && task.labels.length > 0 && <div className="mb-3 flex flex-wrap gap-1.5">{task.labels.map((label) => <span key={label.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${label.color}20`, color: label.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} />{label.name}</span>)}</div>}

      {task.hasWireframePreview && <TaskWireframePreview />}

      <TaskCardMeta task={task} />
    </div>
  );
}
