import { User } from '@/types/board';

interface AssigneeSelectorProps {
  users: User[];
  assignedUserIds: string[];
  onToggleUser: (userId: string) => void;
}

export default function AssigneeSelector({ assignedUserIds, onToggleUser, users }: AssigneeSelectorProps) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-on-surface-variant mb-2 uppercase tracking-wide">
        Assignees
      </label>
      <div className="flex flex-wrap gap-2">
        {users.map((user) => {
          const isAssigned = assignedUserIds.includes(user.id);

          return (
            <button
              key={user.id}
              type="button"
              onClick={() => onToggleUser(user.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] border transition-all cursor-pointer ${
                isAssigned
                  ? 'bg-primary/10 border-primary text-primary font-medium'
                  : 'bg-white border-outline-variant text-outline hover:border-on-surface-variant'
              }`}
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span>{user.name}</span>
              {isAssigned && (
                <span className="material-symbols-outlined text-[14px]">
                  check
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}