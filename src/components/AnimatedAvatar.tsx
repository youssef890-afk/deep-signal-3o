import { useEffect, useState } from 'react';

export interface AnimatedAvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  ring?: boolean;
  src?: string | null;
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

export default function AnimatedAvatar({
  name,
  size = 'md',
  ring = false,
  src,
  onClick,
}: AnimatedAvatarProps) {
  const [colorSeed] = useState(() => {
    let seed = 0;
    for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(seed) % 360;
  });

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageLoaded(true);
      setImageError(false);
      return;
    }
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
    };
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  const base = `${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white shadow-lg transition-shadow duration-200`;
  const ringClass = ring ? 'ring-2 ring-white/25 ring-offset-2 ring-offset-[var(--bg)]' : '';
  const clickClass = onClick ? 'cursor-pointer hover:opacity-80' : '';
  const animateClass = 'animate-float';

  return (
    <div
      className={`${base} ${ringClass} ${clickClass} ${animateClass}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? name : undefined}
    >
      {src && !imageError && imageLoaded ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <svg
          className="h-full w-full -rotate-6"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`grad-${colorSeed}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={`hsl(${colorSeed} 70% 50%)`} />
              <stop offset="100%" stopColor={`hsl(${colorSeed + 40} 60% 45%)`} />
            </linearGradient>
            <filter id={`glow-${colorSeed}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill={`url(#grad-${colorSeed})`}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="3"
            filter={`url(#glow-${colorSeed})`}
          />
          <circle cx="40" cy="38" r="2.5" fill="#fff">
            <animate
              attributeName="opacity"
              values="0.1;0.9;0.1"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="60" cy="38" r="2.5" fill="#fff">
            <animate
              attributeName="opacity"
              values="0.1;0.9;0.1"
              dur="3s"
              repeatCount="indefinite"
              begin="1s"
            />
          </circle>
          <path
            d="M 42 62 Q 50 72 58 62"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            opacity="0.8"
          >
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </path>
          <text
            x="50"
            y="88"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fill="#fff"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {name.charAt(0).toUpperCase()}
          </text>
        </svg>
      )}
    </div>
  );
}
