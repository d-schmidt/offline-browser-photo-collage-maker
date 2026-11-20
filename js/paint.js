'use strict';

/**
 * Generated margin paints. The random-spots style needs a bitmap because CSS
 * cannot blur an arbitrary set of discs. The current seed keeps the editor and
 * the export identical; shuffling picks a new seed for both.
 */
const Paint = (() => {
  const SPOT_COUNT = 17;
  const SPOT_MIN = 100;
  const SPOT_MAX = 300;
  const SPOT_OVERHANG = 20;
  const SPOT_BLUR = 96;
  const SPOT_SEED = 0x5eed;

  // One cached bitmap is enough: only the live margin matters, and the export
  // reuses the same entry while the format and colors stay unchanged.
  let cache = null;
  let seed = SPOT_SEED;

  const seededRandom = (seed) => {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6d2b79f5) | 0;
      let mixed = Math.imul(value ^ (value >>> 15), value | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  };

  const spotsCanvas = (width, height, first, second) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // The background is the second color; the first color sits in soft discs.
    ctx.fillStyle = second;
    ctx.fillRect(0, 0, width, height);

    // Blurring each fill fades the rims, so the spots read as a mottled
    // gradient instead of hard circles. Overlaps are allowed by design.
    const blur = `blur(${SPOT_BLUR}px)`;
    ctx.filter = blur;
    const blurred = ctx.filter === blur;
    ctx.fillStyle = first;
    const random = seededRandom(seed);
    for (let index = 0; index < SPOT_COUNT; index += 1) {
      const x = random() * (width + 2 * SPOT_OVERHANG) - SPOT_OVERHANG;
      const y = random() * (height + 2 * SPOT_OVERHANG) - SPOT_OVERHANG;
      const radius = (SPOT_MIN + random() * (SPOT_MAX - SPOT_MIN)) / 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (blurred) ctx.filter = 'none';
    return canvas;
  };

  const spots = (width, height, first, second) => {
    const key = `${width}x${height}:${first}:${second}:${seed}`;
    if (cache && cache.key === key) return cache;
    cache = { key, canvas: spotsCanvas(width, height, first, second) };
    cache.url = cache.canvas.toDataURL('image/jpeg', 0.85);
    return cache;
  };

  /** Pick a new seed and drop the bitmap, so the next paint has new spots. */
  const shuffle = () => {
    seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
    cache = null;
  };

  return {
    spots,
    spotsUrl: (width, height, first, second) =>
      spots(width, height, first, second).url,
    shuffle,
  };
})();
