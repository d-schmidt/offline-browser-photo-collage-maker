'use strict';

const Export = (() => {
  const WIDTH = 1080;
  const HEIGHT = 1920;
  const DEFAULT_BACKGROUND = '#ffffff';
  const PLACEHOLDER = '#d9d9d9';

  const pad = (value) => String(value).padStart(2, '0');

  /** Local-time download name: collage-yyyy-MM-dd-HH-mm.png */
  const filename = (date = new Date()) =>
    `collage-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}-${pad(date.getHours())}-${pad(date.getMinutes())}.png`;

  const drawPhoto = (ctx, image, box, pageX, pageY) => {
    const source = {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
    const rect = Layout.imageRect(
      source,
      box.w,
      box.h,
      box.zoom,
      box.offsetX,
      box.offsetY,
      box.rotation,
    );
    if (!rect) return;

    // The ghost overlay used while editing is deliberately absent here: only
    // the cropped, zoomed, rotated photo that shows inside the box reaches
    // the PNG.
    ctx.save();
    ctx.beginPath();
    ctx.rect(pageX, pageY, box.w, box.h);
    ctx.clip();
    ctx.translate(
      pageX + rect.x + rect.w / 2,
      pageY + rect.y + rect.h / 2,
    );
    ctx.rotate((rect.rotation * Math.PI) / 180);
    ctx.drawImage(image, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
  };

  const buildCanvas = async (state) => {
    const layout = Layout.compute(state.rows);
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // Decode everything first so a broken image fails before any download
    // starts, and so drawing below stays synchronous.
    const loaded = await Promise.all(
      state
        .orderedBoxes()
        .filter((box) => box.image)
        .map(async (box) => [box.id, await Images.loadElement(box.image.url)]),
    );
    const images = new Map(loaded);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = state.canvasColor || DEFAULT_BACKGROUND;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw in logical canvas pixels. The export size matches the logical
    // canvas, so this scale is 1 unless those constants diverge later.
    ctx.scale(WIDTH / METRICS.canvasW, HEIGHT / METRICS.canvasH);

    for (const row of layout.rows) {
      for (const box of row.boxes) {
        const y = row.y + box.y;
        if (box.w <= 0 || box.h <= 0) continue;

        const image = box.image ? images.get(box.id) : null;
        if (image) {
          drawPhoto(ctx, image, box, box.x, y);
        } else {
          ctx.fillStyle = PLACEHOLDER;
          ctx.fillRect(box.x, y, box.w, box.h);
        }
      }
    }

    return canvas;
  };

  /** Composite the current collage and trigger a PNG download. */
  const save = async (state) => {
    const canvas = await buildCanvas(state);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The collage could not be encoded as a PNG.');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const name = filename();
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();

    // Give the browser a moment to start the download before releasing the URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return name;
  };

  return { save, WIDTH, HEIGHT };
})();
