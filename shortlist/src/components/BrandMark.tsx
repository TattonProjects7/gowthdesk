// The Shortlist logo: a white "S" whose tail drops into a red arrow pointing
// down (shorting profits when prices fall), on a deep navy tile. The same
// artwork as the app icon (brand/shortlist-icon.svg). Server-safe: no hooks.
export default function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" className={className} role="img" aria-label="Shortlist">
      <defs>
        <linearGradient id="sl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12306b" />
          <stop offset="1" stopColor="#071431" />
        </linearGradient>
        <radialGradient id="sl-hi" cx="0.3" cy="0.15" r="0.75">
          <stop offset="0" stopColor="#3b6fd8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3b6fd8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" rx="230" fill="url(#sl-bg)" />
      <rect width="1024" height="1024" rx="230" fill="url(#sl-hi)" />
      <g transform="translate(512 512) scale(0.88) translate(-528 -543.5)">
        <path d="M700 296 C 648 222, 432 210, 360 296 C 296 374, 400 446, 512 480 C 640 518, 740 584, 712 690 C 694 756, 628 780, 548 804" fill="none" stroke="#ffffff" strokeWidth={104} strokeLinecap="round" />
        <path d="M417.3 843.2 L584.5 669.9 L652.3 895.9 Z" fill="#ff3b3b" stroke="#ff3b3b" strokeWidth={16} strokeLinejoin="round" />
      </g>
    </svg>
  );
}
