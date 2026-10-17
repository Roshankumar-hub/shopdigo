import Logo from './Logo';

/**
 * Startup splash. It is rendered by the server into the HTML, so it appears on the first paint,
 * before any JavaScript runs. AppBoot sets html[data-boot="done"], and CSS fades the splash out.
 * Animations are CSS only (see the "Startup splash" section of globals.css). Without JavaScript
 * the splash is hidden by a <noscript> rule.
 * The bar is indeterminate: it shows that work is running, not a percentage.
 */
export default function SplashScreen() {
  return (
    <>
      <div id="shopdigo-splash" role="status" aria-live="polite" aria-label="Loading SHOPDIGO">
        <div className="splash-stage">
          <div className="splash-logo">
            <Logo size="lg" withTagline animated asLink={false} />
          </div>
          <div className="splash-bar" aria-hidden="true"><span /></div>
          <p className="splash-text">Preparing your shopping experience...</p>
          <p className="splash-slow">Still connecting. This can take a moment on slower networks.</p>
          <a href="" className="splash-reload">Taking longer than expected? Reload</a>
        </div>
      </div>
      <noscript>
        <style>{'#shopdigo-splash{display:none!important}'}</style>
      </noscript>
    </>
  );
}
