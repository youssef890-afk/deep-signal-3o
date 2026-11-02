import { useEffect, useState, type KeyboardEvent } from 'react';
import { getInitials } from '@/utils/format';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  ring?: boolean;
  onClick?: () => void;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
  '2xl': 'w-28 h-28 text-3xl',
};

export default function Avatar({ src, name, size = 'md', ring = false, onClick }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [src]);

  const base = `${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold overflow-hidden shrink-0 transition-all duration-200`;
  const ringClass = ring ? 'ring-2 ring-white/20 ring-offset-2 ring-offset-[var(--bg)]' : '';
  const clickClass = onClick ? 'cursor-pointer hover:opacity-80' : '';
  let colorSeed = 0;
  for (const character of name) colorSeed = (colorSeed * 31 + character.charCodeAt(0)) | 0;
  const fallbackColor = `hsl(${Math.abs(colorSeed) % 360} 44% 34%)`;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`${base} ${ringClass} ${clickClass}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? name : undefined}
    >
      {src && !imageFailed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: fallbackColor }}>
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
