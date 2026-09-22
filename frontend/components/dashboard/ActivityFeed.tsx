interface ActivityItem {
  icon: string;
  iconClassName: string;
  actor: string;
  action: string;
  highlight: string;
  context: string;
  time: string;
  previewText?: string;
  showConnector?: boolean;
}

const activities: ActivityItem[] = [
  {
    icon: 'check_circle',
    iconClassName: 'text-primary',
    actor: 'Mark',
    action: 'completed',
    highlight: 'Finalize Copy',
    context: 'Marketing Q4',
    time: '10m ago',
    showConnector: true,
  },
  {
    icon: 'attach_file',
    iconClassName: 'text-on-surface-variant',
    actor: 'Sarah',
    action: 'attached',
    highlight: 'v2_mockups.fig',
    context: 'Website Redesign',
    time: '1h ago',
    previewText: 'Preview attached',
    showConnector: true,
  },
  {
    icon: 'comment',
    iconClassName: 'text-primary',
    actor: 'You',
    action: 'commented on',
    highlight: 'Launch Timeline',
    context: 'Product Launch',
    time: '3h ago',
  },
];

function ActivityRow({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant z-10 border-2 border-white">
          <span className={`material-symbols-outlined text-[16px] ${activity.iconClassName}`}>
            {activity.icon}
          </span>
        </div>
        {activity.showConnector && <div className="w-px h-full bg-surface-container-highest -mt-2" />}
      </div>

      <div className="pb-2">
        <p className="text-[14px] text-on-surface">
          <span className="font-semibold">{activity.actor}</span> {activity.action}{' '}
          <span className="font-medium text-primary cursor-pointer hover:underline">
            {activity.highlight}
          </span>
        </p>
        <p className="text-[12px] text-on-surface-variant mt-0.5">
          {activity.context} • {activity.time}
        </p>
        {activity.previewText && (
          <div className="mt-2 p-2 bg-surface-container-low rounded border border-surface-container-highest text-[12px] text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">image</span>
            {activity.previewText}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  return (
    <section className="bg-surface-container-lowest rounded-xl border border-surface-container-highest shadow-xs flex flex-col h-80">
      <div className="p-4 border-b border-surface-container-highest flex justify-between items-center bg-surface-container-lowest/80 backdrop-blur-xs rounded-t-xl sticky top-0">
        <h3 className="text-[16px] font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-outline">history</span>
          Recent Activity
        </h3>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {activities.map((activity) => (
          <ActivityRow key={`${activity.context}-${activity.time}`} activity={activity} />
        ))}
      </div>
    </section>
  );
}
