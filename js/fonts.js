'use strict';

/**
 * Lazily registers the bundled text fonts. Opening the font menu only requests
 * the SVG previews; a WOFF2 is fetched the first time its font is selected or
 * the first caption in the default font is saved.
 */
const FontLoader = (() => {
  const injected = new Set();
  const pending = new Map();
  const primed = new Map();
  let faceStyle = null;

  const ensureStyle = () => {
    if (faceStyle) return faceStyle;
    faceStyle = document.getElementById('text-font-faces');
    if (!faceStyle) {
      faceStyle = document.createElement('style');
      faceStyle.id = 'text-font-faces';
      document.head.append(faceStyle);
    }
    return faceStyle;
  };

  const inject = (font) => {
    if (injected.has(font.id)) return;
    injected.add(font.id);
    const rule = [
      '@font-face {',
      `font-family: "${font.family}";`,
      `src: url("${font.url}") format("woff2");`,
      'font-style: normal;',
      'font-weight: 400;',
      'font-display: swap;',
      '}',
    ].join(' ');
    ensureStyle().append(document.createTextNode(rule));
  };

  /**
   * Pin a loaded face to the document with one off-screen glyph. A bundled face
   * the page stops using can be evicted, and the next canvas measurement then
   * silently falls back to the generic family. Fitting a caption with those
   * fallback metrics makes its line wrap and overflow the box. Keeping a glyph
   * in the family rendered keeps the real face available to the measurement.
   */
  const prime = (font) => {
    if (primed.has(font.id)) return;
    const node = document.createElement('span');
    node.textContent = '.';
    node.setAttribute('aria-hidden', 'true');
    node.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: -10000px',
      'font-size: 8px',
      'font-weight: 700',
      'white-space: pre',
      'pointer-events: none',
      'user-select: none',
      `font-family: "${font.family}"`,
    ].join(';');
    (document.body || document.documentElement).append(node);
    // Force layout so the face is used for layout, not merely declared.
    void node.offsetWidth;
    primed.set(font.id, node);
  };

  /** Resolve once the bundled face is ready, or false if it cannot load. */
  const ensure = (font) => {
    if (!font || !font.url || !font.family) return Promise.resolve(false);
    const running = pending.get(font.id);
    if (running) return running;
    inject(font);
    if (!document.fonts || !document.fonts.load) {
      return Promise.resolve(true);
    }
    const promise = document.fonts
      .load(`400 48px "${font.family}"`)
      .then((faces) => faces.length > 0)
      .catch(() => false)
      .then((loaded) => {
        // A failed attempt stays retryable on the next selection.
        if (!loaded) pending.delete(font.id);
        else prime(font);
        return loaded;
      });
    pending.set(font.id, promise);
    return promise;
  };

  return { ensure };
})();
