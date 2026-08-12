import { cn } from '@/lib/shadcn/utils';

interface VidyaLogoProps {
  size?: number;
  className?: string;
  /** Show just the mark (no text) */
  markOnly?: boolean;
}

/**
 * Vidya SVG Logo — open book + AI waveform arc + knowledge node
 * Works at any size. All paths use currentColor so it inherits text colour.
 */
export function VidyaLogo({ size = 32, className, markOnly = false }: VidyaLogoProps) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2', className)}>
      {/* ── Mark ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer glow circle */}
        <circle cx="18" cy="18" r="17" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />

        {/* Open book — left page */}
        <path
          d="M18 10.5C18 10.5 12 9 7 12V27C12 24.5 18 26 18 26V10.5Z"
          fill="currentColor"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Open book — right page */}
        <path
          d="M18 10.5C18 10.5 24 9 29 12V27C24 24.5 18 26 18 26V10.5Z"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Book text lines — left */}
        <line
          x1="9.5"
          y1="16"
          x2="15.5"
          y2="15"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        <line
          x1="9.5"
          y1="19.5"
          x2="15.5"
          y2="18.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        {/* AI waveform arc — top right quadrant */}
        <path
          d="M22 8 Q25.5 5.5 29 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeOpacity="0.85"
          fill="none"
        />
        {/* Knowledge node — top right */}
        <circle cx="29" cy="8" r="2.2" fill="currentColor" fillOpacity="0.9" />
        <circle cx="29" cy="8" r="1" fill="currentColor" />
      </svg>

      {/* ── Wordmark ── */}
      {!markOnly && (
        <span
          className="text-foreground font-mono text-sm font-extrabold tracking-[0.18em] select-none"
          aria-label="Vidya"
        >
          VIDYA
        </span>
      )}
    </span>
  );
}
