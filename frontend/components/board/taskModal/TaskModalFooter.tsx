interface TaskModalFooterProps {
  taskId: string;
  currentColumnId: string;
  onClose: () => void;
  onDelete: (taskId: string, columnId: string) => void;
}

export default function TaskModalFooter({
  taskId,
  currentColumnId,
  onClose,
  onDelete,
}: TaskModalFooterProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-surface-container-highest">
      <button
        type="button"
        onClick={() => {
          if (confirm('Are you sure you want to delete this task?')) {
            onDelete(taskId, currentColumnId);
            onClose();
          }
        }}
        className="flex items-center gap-1 text-error hover:bg-error/10 px-3 py-2 rounded-md text-[13px] font-semibold transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
        Delete Task
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-md text-[14px] font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-primary hover:bg-primary-container text-white rounded-md text-[14px] font-semibold transition-colors shadow-xs cursor-pointer"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}