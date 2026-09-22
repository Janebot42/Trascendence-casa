interface TaskFieldProps {
  label: string;
  children: React.ReactNode;
}

export default function TaskField({ label, children }: TaskFieldProps) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}