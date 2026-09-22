'use client';

import React from 'react';
import TaskField from './TaskField';

interface TaskTitleFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TaskTitleField({ value, onChange }: TaskTitleFieldProps) {
  return (
    <TaskField label="Task Title">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Task title..."
        className="w-full text-[18px] font-semibold text-on-surface border border-outline-variant rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        required
      />
    </TaskField>
  );
}
