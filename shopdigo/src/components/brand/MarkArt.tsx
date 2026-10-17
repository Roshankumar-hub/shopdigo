import { useId } from 'react';
import { MARK, PALETTE } from './geometry';

/**
 * The SHOPDIGO symbol: blue and yellow tags forming an S.
 * Geometry comes from tools/build_logo.py (single source for the static SVGs too).
 * Every instance gets its own ids, so several marks can be on one page safely.
 */
export function useMarkIds() {
  const raw = useId();
  const uid = `sd${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return { blue: `${uid}-blue`, yellow: `${uid}-yellow`, cut: `${uid}-cut` };
}

export function MarkDefs({ ids }: { ids: ReturnType<typeof useMarkIds> }) {
  const holes = MARK.holes.map((h) => <circle key={`${h.cx}-${h.cy}`} cx={h.cx} cy={h.cy} r={h.r} fill="#000" />);
  return (
    <defs>
      <linearGradient id={ids.blue} x1="160" y1="8" x2="60" y2="330" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#3B82F6" />
        <stop offset="0.55" stopColor={PALETTE.blue} />
        <stop offset="1" stopColor="#1E40AF" />
      </linearGradient>
      <linearGradient id={ids.yellow} x1="300" y1="205" x2="250" y2="520" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FDE68A" />
        <stop offset="0.6" stopColor={PALETTE.yellow} />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
      <mask id={ids.cut} maskUnits="userSpaceOnUse" x="-40" y="-40" width="540" height="620">
        <rect x="-40" y="-40" width="540" height="620" fill="#fff" />
        <path d={MARK.cut} fill="none" stroke="#000" strokeWidth={MARK.cutWidth} strokeLinecap="round" />
        {holes}
      </mask>
    </defs>
  );
}

/** The mark's artwork (defs + masked tags) in local units. Wrap it in a <g transform> to place it. */
export function MarkArt({ ids, className }: { ids: ReturnType<typeof useMarkIds>; className?: string }) {
  return (
    <>
      <MarkDefs ids={ids} />
      <g mask={`url(#${ids.cut})`} className={className}>
        <path d={MARK.blue} fill={`url(#${ids.blue})`} />
        <path d={MARK.yellow} fill={`url(#${ids.yellow})`} />
      </g>
    </>
  );
}

/** Symbol only, for icons and standalone use. */
export default function ShopdigoMark({ className, title = 'SHOPDIGO' }: { className?: string; title?: string }) {
  const ids = useMarkIds();
  const [, , w, h] = MARK.viewBox;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <MarkArt ids={ids} />
    </svg>
  );
}
