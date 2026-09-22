// Componentes principales
export { default as TaskModal } from './TaskModal';
export { default as TaskModalForm } from './TaskModalForm';
export { default as TaskModalHeader } from './TaskModalHeader';
export { default as TaskModalFooter } from './TaskModalFooter';

// Componentes de campos
export { default as TaskField } from './TaskField';
export { default as TaskTitleField } from './TaskTitleField';
export { default as TaskDescriptionField } from './TaskDescriptionField';
export { default as TaskPropertiesPanel } from './TaskPropertiesPanel';
export { default as AssigneeSelector } from './AssigneeSelector';

// Hooks personalizados
export { useTaskModalState } from './useTaskModalState';
export { useTaskModalSubmit } from './useTaskModalSubmit';
export { useModalKeyboard } from './useModalKeyboard';

// Utilidades y constantes
export { buildUpdatedTask } from './taskModal.utils';
export { taskPriorityOptions, taskPriorityBadgeClasses } from './taskModal.constants';

// Re-exportar TaskModal como default también para compatibilidad
export { default } from './TaskModal';
