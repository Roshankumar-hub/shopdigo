/**
 * Animated shopper illustration for the login and sign-up pages.
 * Vector art with gradients and highlights for a soft 3D look. Motion is pure CSS
 * (transform and opacity), and the global reduced-motion rule freezes it.
 * It shows no product, price, rating or seller information.
 */
export default function ShopperIllustration({ className = '' }: { className?: string }) {
  const waveOrigin = { transformOrigin: '210px 252px', transformBox: 'view-box' as const };
  return (
    <svg viewBox="0 0 560 500" className={className} role="img" aria-label="Illustration of two shoppers carrying bags and browsing on a phone" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="auth-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" /><stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="auth-jacket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="auth-bag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="auth-bag2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" /><stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="auth-gift" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="auth-pants" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4338ca" /><stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <radialGradient id="auth-ground" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.45" /><stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Floor shadow */}
      <ellipse cx="280" cy="462" rx="250" ry="24" fill="url(#auth-ground)" />

      {/* ── Shopper A: waving, holding a bag ── */}
      <g className="auth-bob">
        <rect x="150" y="326" width="19" height="118" rx="9" fill="url(#auth-pants)" />
        <rect x="178" y="326" width="19" height="118" rx="9" fill="url(#auth-pants)" />
        <ellipse cx="159" cy="448" rx="17" ry="7" fill="#0f172a" />
        <ellipse cx="189" cy="448" rx="17" ry="7" fill="#0f172a" />
        <path d="M130 246 Q170 224 210 246 L206 344 Q170 352 134 344 Z" fill="url(#auth-top)" />
        <path d="M152 232 Q170 250 188 232" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
        <rect x="160" y="208" width="20" height="22" rx="8" fill="#d89a6c" />
        <circle cx="170" cy="182" r="31" fill="#e8b28a" />
        <ellipse cx="158" cy="166" rx="12" ry="7" fill="#ffffff" opacity="0.14" />
        <path d="M137 180 Q133 136 170 134 Q208 135 203 180 Q199 158 186 152 Q170 146 152 156 Q140 164 137 180 Z" fill="#1f2937" />
        <circle cx="171" cy="132" r="13" fill="#1f2937" />
        <circle cx="158" cy="184" r="2.8" fill="#111827" />
        <circle cx="182" cy="184" r="2.8" fill="#111827" />
        <path d="M160 197 Q170 206 180 197" fill="none" stroke="#7c2d12" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="149" cy="197" r="4.5" fill="#fb7185" opacity="0.35" />
        <circle cx="191" cy="197" r="4.5" fill="#fb7185" opacity="0.35" />
        {/* hanging arm holding a shopping bag */}
        <path d="M134 256 L118 326" stroke="url(#auth-top)" strokeWidth="22" strokeLinecap="round" fill="none" />
        <circle cx="117" cy="334" r="10" fill="#e8b28a" />
        <g className="auth-sway" style={{ transformOrigin: '118px 330px', transformBox: 'view-box' }}>
          <path d="M120 332 Q116 306 90 296" stroke="#92400e" strokeWidth="2.5" fill="none" />
          <rect x="72" y="296" width="60" height="66" rx="7" fill="url(#auth-bag)" />
          <path d="M86 296 Q102 270 118 296" stroke="#b45309" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="72" y="312" width="60" height="5" fill="#ffffff" opacity="0.35" />
        </g>
        {/* waving arm */}
        <g className="auth-wave" style={waveOrigin}>
          <path d="M206 256 L244 206 L262 162" stroke="url(#auth-top)" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="266" cy="150" r="13" fill="#e8b28a" />
          <path d="M258 140 L256 124 M266 138 L266 120 M274 140 L278 124" stroke="#e8b28a" strokeWidth="7" strokeLinecap="round" />
        </g>
      </g>

      {/* ── Shopper B: browsing on a phone, carrying a bag ── */}
      <g className="auth-bob" style={{ animationDelay: '-1.8s' }}>
        <rect x="386" y="326" width="19" height="118" rx="9" fill="#0f172a" />
        <rect x="414" y="326" width="19" height="118" rx="9" fill="#0f172a" />
        <ellipse cx="395" cy="448" rx="17" ry="7" fill="#020617" />
        <ellipse cx="425" cy="448" rx="17" ry="7" fill="#020617" />
        <path d="M368 246 Q400 224 432 246 L430 344 Q400 352 370 344 Z" fill="url(#auth-jacket)" />
        <path d="M388 232 L400 254 L412 232" fill="#ffffff" opacity="0.9" />
        <rect x="390" y="208" width="20" height="22" rx="8" fill="#a06a43" />
        <circle cx="400" cy="182" r="31" fill="#b57a50" />
        <ellipse cx="388" cy="166" rx="12" ry="7" fill="#ffffff" opacity="0.12" />
        <path d="M370 176 Q372 146 400 146 Q430 146 430 176 Q420 160 400 160 Q384 160 370 176 Z" fill="#111827" />
        <path d="M368 178 Q366 186 370 196" stroke="#111827" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="390" cy="184" r="2.8" fill="#111827" />
        <circle cx="412" cy="184" r="2.8" fill="#111827" />
        <path d="M391 198 Q400 206 410 198" fill="none" stroke="#4a1d0c" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="381" cy="198" r="4.5" fill="#f87171" opacity="0.25" />
        <circle cx="419" cy="198" r="4.5" fill="#f87171" opacity="0.25" />
        {/* forearm raised to a phone */}
        <path d="M370 256 L346 286 L362 296" stroke="url(#auth-jacket)" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <g className="auth-float" style={{ animationDuration: '6s' }}>
          <rect x="330" y="236" width="34" height="58" rx="6" fill="#111827" />
          <rect x="334" y="242" width="26" height="44" rx="3" fill="#93c5fd" />
          <rect x="339" y="248" width="16" height="4" rx="2" fill="#ffffff" opacity="0.8" />
          <rect x="339" y="256" width="10" height="4" rx="2" fill="#ffffff" opacity="0.5" />
        </g>
        <circle cx="366" cy="296" r="10" fill="#b57a50" />
        {/* hanging arm with a purple bag */}
        <path d="M430 256 L442 326" stroke="url(#auth-jacket)" strokeWidth="20" strokeLinecap="round" fill="none" />
        <circle cx="443" cy="334" r="10" fill="#b57a50" />
        <g className="auth-sway" style={{ transformOrigin: '444px 330px', transformBox: 'view-box', animationDelay: '-2s' }}>
          <path d="M444 332 Q452 306 472 300" stroke="#5b21b6" strokeWidth="2.5" fill="none" />
          <rect x="454" y="300" width="50" height="58" rx="7" fill="url(#auth-bag2)" />
          <path d="M466 300 Q479 278 492 300" stroke="#5b21b6" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* ── Floating decorations ── */}
      <g className="auth-float" style={{ animationDelay: '-1s' }}>
        <rect x="462" y="60" width="44" height="40" rx="5" fill="url(#auth-gift)" />
        <rect x="462" y="72" width="44" height="6" fill="#c7d2fe" />
        <rect x="481" y="60" width="6" height="40" fill="#c7d2fe" />
        <circle cx="478" cy="56" r="7" fill="none" stroke="#c7d2fe" strokeWidth="3" />
        <circle cx="490" cy="56" r="7" fill="none" stroke="#c7d2fe" strokeWidth="3" />
      </g>
      <g className="auth-float" style={{ animationDelay: '-3s' }}>
        <rect x="34" y="92" width="36" height="42" rx="5" fill="url(#auth-bag)" opacity="0.9" />
        <path d="M46 92 Q52 74 58 92" stroke="#fde68a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <g className="auth-float" style={{ animationDelay: '-5s' }}>
        <rect x="496" y="330" width="28" height="30" rx="4" fill="url(#auth-bag2)" opacity="0.85" />
        <path d="M504 330 Q510 316 516 330" stroke="#c4b5fd" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <polygon points="302,46 306,58 318,62 306,66 302,78 298,66 286,62 298,58" fill="#fde68a" className="auth-twinkle" />
      <polygon points="92,220 95,229 104,232 95,235 92,244 89,235 80,232 89,229" fill="#c7d2fe" className="auth-twinkle" style={{ animationDelay: '-1s' }} />
      <polygon points="520,226 523,235 532,238 523,241 520,250 517,241 508,238 517,235" fill="#fcd34d" className="auth-twinkle" style={{ animationDelay: '-2.2s' }} />
      <circle cx="40" cy="380" r="7" fill="none" stroke="#a5b4fc" strokeWidth="2" opacity="0.6" />
      <circle cx="530" cy="410" r="5" fill="#c4b5fd" opacity="0.6" />
      <circle cx="262" cy="92" r="4" fill="#ffffff" opacity="0.6" className="auth-twinkle" style={{ animationDelay: '-0.5s' }} />
    </svg>
  );
}
