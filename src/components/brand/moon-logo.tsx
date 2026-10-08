import { cn } from "@/lib/utils";

interface MoonLogoProps {
  className?: string;
  /** Disable the pulsing glow animation */
  staticGlow?: boolean;
}

/**
 * StudyMoon brand mark: a crescent moon with a soft glow.
 * Pure SVG (no emojis anywhere in the product — doc section 1).
 */
export function MoonLogo({ className, staticGlow = false }: MoonLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="StudyMoon"
      className={cn("h-10 w-10", className)}
    >
      <defs>
        <radialGradient id="moon-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#7c6cff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#6d5dfc" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6d5dfc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="moon-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e9eaf6" />
          <stop offset="100%" stopColor="#b9bdff" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#moon-glow)" />
      <path
        d="M40.5 8.6a24 24 0 1 0 14.9 33.9A19.5 19.5 0 0 1 40.5 8.6Z"
        fill="url(#moon-body)"
        stroke="#6d5dfc"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="26" r="2.1" fill="#8f86d9" opacity="0.85" />
      <circle cx="30" cy="38" r="1.5" fill="#8f86d9" opacity="0.7" />
      <circle cx="21.5" cy="35.5" r="1" fill="#8f86d9" opacity="0.6" />
      {!staticGlow && (
        <animate
          attributeName="opacity"
          values="1;0.82;1"
          dur="4s"
          repeatCount="indefinite"
        />
      )}
    </svg>
  );
}
