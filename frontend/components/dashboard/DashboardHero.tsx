interface DashboardHeroProps {
  title: string;
  subtitle: string;
}

export default function DashboardHero({ title, subtitle }: DashboardHeroProps) {
  return (
    <header className="flex justify-between items-end mb-6">
      <div>
        <h2 className="text-[32px] font-bold text-on-surface tracking-tight leading-none">
          {title}
        </h2>
        <p className="text-[14px] text-on-surface-variant mt-2">{subtitle}</p>
      </div>
    </header>
  );
}
