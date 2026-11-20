'use strict';

/**
 * Generated margin paints. The random-spots style cannot be expressed in CSS:
 * it draws organic shapes into an SVG, blurs the group with a Gaussian filter,
 * and rasterises the result once. The scene is always composed at 1920 × 1080
 * or 1080 × 1920 and centre-cropped to the chosen format, so the pattern keeps
 * the same scale on every canvas and cropping never resamples the blur.
 *
 * The editor and the export share the cached bitmap, so both show the exact
 * same pattern, and the seeded random keeps a shuffle reproducible.
 */
const Paint = (() => {
  const SPOT_SEED = 0x5eed;
  const BLUR = 115;
  const HOST_COUNT = 5;
  const HOST_TRIES = 300;
  const HOST_SPACING = 360;
  const BASE_COUNT = 3;
  const WIDE_SCENE = { width: 1920, height: 1080 };
  const TALL_SCENE = { width: 1080, height: 1920 };
  const JITTER = 0.26;
  const SCALE_MIN = 0.72;
  const SCALE_MAX = 1.28;
  const POINTS_MIN = 5;
  const POINTS_MAX = 8;
  const JPEG_QUALITY = 0.85;

  // One bitmap is enough: only the live margin matters, and the export reuses
  // the same entry while the format, colors, and seed stay unchanged.
  let cache = null;
  let seed = SPOT_SEED;
  // Rasterising two megapixels is expensive, so jobs run one after another and
  // identical requests share a promise.
  const inflight = new Map();
  let queue = Promise.resolve();

  const seededRandom = (seedValue) => {
    let value = seedValue >>> 0;
    return () => {
      value = (value + 0x6d2b79f5) | 0;
      let mixed = Math.imul(value ^ (value >>> 15), value | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  };

  const randomIn = (random, min, max) => random() * (max - min) + min;

  /**
   * A closed blob: points scattered around an ellipse, joined by cubic
   * segments whose control points follow the neighbouring vertices. The result
   * is round but irregular, which is what makes the blurred paint organic.
   */
  const organicPath = (random, cx, cy, rx, ry, rotation, points) => {
    const step = (Math.PI * 2) / points;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const vertices = [];
    for (let index = 0; index < points; index += 1) {
      const angle = index * step + randomIn(random, -JITTER, JITTER);
      const scale = randomIn(random, SCALE_MIN, SCALE_MAX);
      const x = Math.cos(angle) * rx * scale;
      const y = Math.sin(angle) * ry * scale;
      vertices.push({
        x: cx + x * cos - y * sin,
        y: cy + x * sin + y * cos,
      });
    }
    let path = `M ${vertices[0].x.toFixed(1)},${vertices[0].y.toFixed(1)} `;
    for (let index = 0; index < points; index += 1) {
      const before = vertices[(index - 1 + points) % points];
      const start = vertices[index];
      const end = vertices[(index + 1) % points];
      const after = vertices[(index + 2) % points];
      path +=
        `C ${(start.x + (end.x - before.x) / 6).toFixed(1)},` +
        `${(start.y + (end.y - before.y) / 6).toFixed(1)} ` +
        `${(end.x - (after.x - start.x) / 6).toFixed(1)},` +
        `${(end.y - (after.y - start.y) / 6).toFixed(1)} ` +
        `${end.x.toFixed(1)},${end.y.toFixed(1)} `;
    }
    return `${path}Z`;
  };

  const shuffled = (random, items) => {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  };

  /**
   * The fixed scene the paint is composed in. Portrait and square canvases use
   * the tall scene, landscape ones the wide scene; the shorter side always
   * matches the canvas, so a crop only trims the longer axis.
   */
  const sceneFor = (width, height) => {
    const scene = height >= width ? TALL_SCENE : WIDE_SCENE;
    const cropWidth = Math.min(width, scene.width);
    const cropHeight = Math.min(height, scene.height);
    return {
      width: scene.width,
      height: scene.height,
      cropWidth,
      cropHeight,
      left: Math.round((scene.width - cropWidth) / 2),
      top: Math.round((scene.height - cropHeight) / 2),
    };
  };

  const sceneSvg = (colorA, colorB, scene, random) => {
    const hosts = [];
    let secondaryPaths = '';
    // Five well-spaced hosts carry the second color; rejecting candidates that
    // are too close keeps the blobs from clumping into one patch.
    for (
      let attempt = 0;
      attempt < HOST_TRIES && hosts.length < HOST_COUNT;
      attempt += 1
    ) {
      const cx = randomIn(random, 200, scene.width - 200);
      const cy = randomIn(random, 150, scene.height - 150);
      if (
        hosts.some((host) => Math.hypot(host.x - cx, host.y - cy) < HOST_SPACING)
      ) {
        continue;
      }
      hosts.push({ x: cx, y: cy });
      const rx = randomIn(random, 315, 455);
      const ry = randomIn(random, 210, 330);
      const rotation = randomIn(random, 0, Math.PI * 2);
      const points = Math.floor(randomIn(random, POINTS_MIN, POINTS_MAX));
      const opacity = randomIn(random, 0.86, 0.96).toFixed(2);
      secondaryPaths +=
        `<path d="${organicPath(random, cx, cy, rx, ry, rotation, points)}" ` +
        `fill="${colorB}" opacity="${opacity}"/>`;
    }

    // Three first-color blobs sit offset from the hosts, so the base color
    // pushes back into the second-color patches instead of only framing them.
    let primaryPaths = '';
    const order = shuffled(random, hosts);
    for (let index = 0; index < BASE_COUNT && order.length > 0; index += 1) {
      const host = order[index % order.length];
      const angle = randomIn(random, 0, Math.PI * 2);
      const distance = randomIn(random, 55, 155);
      const cx = host.x + Math.cos(angle) * distance;
      const cy = host.y + Math.sin(angle) * distance;
      const rx = randomIn(random, 245, 365);
      const ry = randomIn(random, 170, 270);
      const rotation = randomIn(random, 0, Math.PI * 2);
      const points = Math.floor(randomIn(random, POINTS_MIN, POINTS_MAX));
      const opacity = randomIn(random, 0.72, 0.88).toFixed(2);
      primaryPaths +=
        `<path d="${organicPath(random, cx, cy, rx, ry, rotation, points)}" ` +
        `fill="${colorA}" opacity="${opacity}"/>`;
    }

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" ` +
      `height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">` +
      '<defs><filter id="blur" x="-30%" y="-30%" width="160%" height="160%" ' +
      `color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${BLUR}"/>` +
      '</filter></defs>' +
      `<rect width="${scene.width}" height="${scene.height}" fill="${colorA}"/>` +
      `<g filter="url(#blur)">${secondaryPaths}${primaryPaths}</g></svg>`
    );
  };

  /** Rasterise the scene and crop the format window out of its centre. */
  const rasterise = async (svg, scene) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () =>
          reject(new Error('The generated margin paint could not be decoded.'));
        element.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = scene.cropWidth;
      canvas.height = scene.cropHeight;
      const context = canvas.getContext('2d');
      context.drawImage(
        image,
        scene.left,
        scene.top,
        scene.cropWidth,
        scene.cropHeight,
        0,
        0,
        scene.cropWidth,
        scene.cropHeight,
      );
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const render = async (width, height, first, second, sceneSeed) => {
    const scene = sceneFor(width, height);
    // The base is the first color; second-color blobs are laid over it.
    const svg = sceneSvg(first, second, scene, seededRandom(sceneSeed));
    const canvas = await rasterise(svg, scene);
    return { canvas, url: canvas.toDataURL('image/jpeg', JPEG_QUALITY) };
  };

  /**
   * The spots bitmap for a canvas size, resolving with `{ canvas, url }`.
   * `canvas` is what the export draws, `url` is the editor's background image.
   */
  const spots = (width, height, first, second) => {
    // The seed belongs to the request: a shuffle while the queue is busy must
    // not rewrite a scene that is already claimed under an older key.
    const sceneSeed = seed;
    const key = `${width}x${height}:${first}:${second}:${sceneSeed}`;
    if (cache && cache.key === key) return Promise.resolve(cache);
    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = queue.then(async () => {
      const entry = {
        key,
        ...(await render(width, height, first, second, sceneSeed)),
      };
      cache = entry;
      return entry;
    });
    queue = promise.catch(() => {});
    inflight.set(key, promise);
    const settle = () => inflight.delete(key);
    promise.then(settle, settle);
    return promise;
  };

  /** Pick a new seed and drop the bitmap, so the next paint has new shapes. */
  const shuffle = () => {
    seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
    cache = null;
  };

  return { spots, shuffle };
})();
