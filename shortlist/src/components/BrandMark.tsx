// The Shortlist logo: an "S" traced as a rising line that ends in an
// up-and-right arrow, in the brand gradient on a deep navy tile. The same
// artwork as the app icon (brand/shortlist-icon.svg), simplified for small
// sizes. Server-safe: no hooks.
export default function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" className={className} role="img" aria-label="Shortlist">
      <defs>
        <linearGradient id="sl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1c2042" />
          <stop offset="1" stopColor="#07080d" />
        </linearGradient>
        <linearGradient id="sl-ink" gradientUnits="userSpaceOnUse" x1="292" y1="760" x2="760" y2="220">
          <stop offset="0" stopColor="#fb7185" />
          <stop offset="0.55" stopColor="#e879f9" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="230" fill="url(#sl-bg)" />
      <g transform="translate(-8 26)">
        <path d="M292 744 C 420 812, 716 796, 714 640 C 712 500, 312 540, 310 404 C 306 292, 520 296, 690 246" fill="none" stroke="url(#sl-ink)" strokeWidth={100} strokeLinecap="round" />
        <path d="M715.8 355.1 L 803.2 212.7 L 652.6 140.2 Z" fill="url(#sl-ink)" stroke="url(#sl-ink)" strokeWidth={18} strokeLinejoin="round" />
      </g>
    </svg>
  );
}
