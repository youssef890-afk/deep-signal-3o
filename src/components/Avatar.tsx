import { useEffect, useState, type KeyboardEvent } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  showStatus?: boolean;
  online?: boolean;
  type?: 'uploaded' | 'generated' | 'emoji' | null;
  emoji?: string | null;
  ring?: boolean;
  onClick?: () => void;
}

export default function Avatar({
  src,
  name,
  size = 40,
  showStatus = false,
  online = false,
  type,
  emoji,
  ring = false,
  onClick,
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = name?.trim() || 'مستخدم';
  const imageSrc = src?.trim() || null;
  let colorSeed = 0;
  for (const character of displayName) colorSeed = (colorSeed * 31 + character.charCodeAt(0)) >>> 0;
  const fallbackColor = `hsl(${colorSeed % 360} 44% 34%)`;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  useEffect(() => setImageFailed(false), [imageSrc]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full font-semibold text-white transition duration-200 ${ring ? 'ring-2 ring-white/20 ring-offset-2 ring-offset-[var(--bg)]' : ''} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.38) }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? displayName : undefined}
    >
      {type === 'emoji' && emoji?.trim() ? (
        <span className="flex h-full w-full items-center justify-center bg-[var(--surface-2)] text-[0.7em]">
          {emoji}
        </span>
      ) : imageSrc && !imageFailed ? (
        <img
          src={imageSrc}
          alt={displayName}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: fallbackColor }}>
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
      {showStatus && online && (
        <span
          aria-label="متصل الآن"
          className="absolute bottom-0 end-0 rounded-full border-2 border-[var(--bg)] bg-[var(--accent)]"
          style={{ width: Math.max(8, size * 0.24), height: Math.max(8, size * 0.24) }}
        />
      )}
    </div>
  );
}
