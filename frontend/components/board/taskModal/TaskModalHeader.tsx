interface TaskModalHeaderProps {
  onClose: () => void;
}

export default function TaskModalHeader({ onClose }: TaskModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-highest bg-surface-bright">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">article</span>
        <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
          Task Details
        </span>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
        aria-label="Close modal"
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
  );
}