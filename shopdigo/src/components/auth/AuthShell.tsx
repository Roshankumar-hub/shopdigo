'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Layout for the login and sign-up pages: a branded gradient stage with floating decorations.
 * Desktop: illustration on the left, form on the right. Mobile: form first, smaller illustration below.
 * Mouse parallax runs only on large screens with a fine pointer and only when reduced motion is off.
 */
export default function AuthShell({ form, art, heading, subheading }: {
  form: ReactNode; art: ReactNode; heading: string; subheading: string;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!canHover.matches || reduce.matches) return;

    let frame = 0;
    let targetX = 0, targetY = 0, x = 0, y = 0;
    const tick = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      el.style.setProperty('--auth-px', (x * 14).toFixed(2));
      el.style.setProperty('--auth-py', (y * 10).toFixed(2));
      frame = Math.abs(targetX - x) > 0.002 || Math.abs(targetY - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-br from-brand-700 via-indigo-700 to-purple-700">
      {/* Soft glows */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sky-400/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

      {/* Floating decorations: bags, stars, gift boxes and rings, drifting at different speeds */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" focusable="false">
        <g className="auth-float" style={{ animationDelay: '-2s' }}>
          <rect x="6%" y="18%" width="30" height="30" rx="5" fill="#fde68a" opacity="0.35" />
        </g>
        <g className="auth-float" style={{ animationDelay: '-4s' }}>
          <rect x="88%" y="14%" width="34" height="34" rx="6" fill="#c4b5fd" opacity="0.35" />
        </g>
        <g className="auth-float" style={{ animationDelay: '-1s' }}>
          <rect x="82%" y="74%" width="28" height="28" rx="4" fill="#a5b4fc" opacity="0.3" />
        </g>
        <circle cx="12%" cy="78%" r="10" fill="none" stroke="#e0e7ff" strokeWidth="2" opacity="0.3" className="auth-drift" />
        <circle cx="48%" cy="8%" r="6" fill="#ffffff" opacity="0.4" className="auth-twinkle" />
        <circle cx="70%" cy="88%" r="5" fill="#fde68a" opacity="0.45" className="auth-twinkle" style={{ animationDelay: '-1.5s' }} />
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute left-[8%] top-[60%] hidden text-amber-200/70 lg:block auth-twinkle">
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="currentColor" /></svg>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute right-[10%] top-[38%] hidden text-indigo-200/70 lg:block auth-twinkle" style={{ animationDelay: '-2s' }}>
        <svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="currentColor" /></svg>
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-2 lg:gap-12 lg:py-16">
        {/* Form: first on mobile, right column on desktop */}
        <div className="order-1 auth-enter auth-enter-delay-2 lg:order-2">
          {form}
        </div>

        {/* Illustration: below the form on mobile (smaller), left column on desktop */}
        <div className="order-2 auth-enter auth-enter-delay-1 lg:order-1">
          <div className="mx-auto max-w-[220px] text-center text-white sm:max-w-[300px] lg:max-w-none lg:text-left">
            <h2 className="hidden text-3xl font-bold tracking-tight lg:block">{heading}</h2>
            <p className="mt-2 hidden text-indigo-100 lg:block">{subheading}</p>
          </div>
          <div ref={sceneRef} className="auth-parallax mx-auto mt-4 w-full max-w-[220px] sm:max-w-[300px] lg:mt-8 lg:max-w-[540px]">
            {art}
          </div>
        </div>
      </div>
    </div>
  );
}
