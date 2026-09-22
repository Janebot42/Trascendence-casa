import Link from 'next/link';

interface BoardAvatar {
  src: string;
  alt: string;
}

interface BoardCardProps {
  title: string;
  updatedText: string;
  label: string;
  href?: string;
  imageUrl: string;
  avatars: BoardAvatar[];
  progressPercent: number;
  labelClassName: string;
  progressClassName: string;
  imageOverlayClassName?: string;
  className?: string;
}

function BoardCardContent({
  title,
  updatedText,
  label,
  imageUrl,
  avatars,
  progressPercent,
  labelClassName,
  progressClassName,
  imageOverlayClassName,
}: Omit<BoardCardProps, 'href' | 'className'>) {
  return (
    <>
      <div className="h-32 w-full bg-surface-container-low relative overflow-hidden">
        <div
          className="bg-cover bg-center w-full h-full opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500"
          style={{ backgroundImage: `url('${imageUrl}')` }}
        />
        <div
          className={`absolute inset-0 ${imageOverlayClassName ?? ''}`}
          style={{
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent)',
          }}
        />
        <div className="absolute bottom-3 left-3 text-white">
          <span
            className={`${labelClassName} font-semibold text-[10px] uppercase rounded backdrop-blur-xs shadow-xs inline-block mb-1 px-2 py-1`}
          >
            {label}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h4 className="text-[16px] font-semibold text-on-surface group-hover:text-primary transition-colors mb-1">
          {title}
        </h4>
        <p className="text-[12px] text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">update</span>
          {updatedText}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
            {avatars.map((avatar) => (
              <img
                key={avatar.src}
                className="w-6 h-6 rounded-full border-2 border-white object-cover"
                src={avatar.src}
                alt={avatar.alt}
              />
            ))}
          </div>
          <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className={`${progressClassName} h-full`} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>
    </>
  );
}

export default function BoardCard({ href, className, ...contentProps }: BoardCardProps) {
  const cardClassName = `group block bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/30 ${className ?? ''}`;

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        <BoardCardContent {...contentProps} />
      </Link>
    );
  }

  return (
    <div className={`${cardClassName} cursor-pointer`}>
      <BoardCardContent {...contentProps} />
    </div>
  );
}
