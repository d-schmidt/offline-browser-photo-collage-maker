'use strict';

const Export = (() => {
  const DEFAULT_BACKGROUND = '#ffffff';
  const PLACEHOLDER = '#d9d9d9';

  const pad = (value) => String(value).padStart(2, '0');

  /** Local-time download name: collage-yyyy-MM-dd-HH-mm.<extension> */
  const filename = (extension, date = new Date()) =>
    `collage-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}-${pad(date.getHours())}-${pad(date.getMinutes())}.${extension}`;

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

  /**
   * Draw one free-form box. It is rotated around its centre and stretched to
   * its locked aspect ratio; the export canvas clips whatever hangs over the
   * edge, exactly like the unselected preview.
   */
  const drawFreeBox = (ctx, image, box) => {
    const width = box.width;
    const height = box.width / (box.aspect || 1);
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.rotate(((box.rotation || 0) * Math.PI) / 180);
    if (image) {
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = PLACEHOLDER;
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }
    ctx.restore();
  };

  const buildCanvas = async (state) => {
    // The export uses the same padding and gaps as the editor, so the current
    // border thickness has to be in the layout before it computes geometry.
    Layout.setBorderThickness(state.borderThickness);
    const layout = Layout.compute(state.rows, state.orientation);
    // The export canvas matches the chosen format's logical size, so it can be
    // drawn in the same pixels the editor lays out.
    const width = Layout.canvasW;
    const height = Layout.canvasH;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    // Decode everything first so a broken image fails before any download
    // starts, and so drawing below stays synchronous.
    const loaded = await Promise.all(
      state
        .orderedBoxes()
        .filter((box) => box.image)
        .map(async (box) => [box.id, await Images.loadElement(box.image.url)]),
    );
    const images = new Map(loaded);

    const loadedFree = await Promise.all(
      state.freeBoxes
        .filter((box) => box.image)
        .map(async (box) => [box.id, await Images.loadElement(box.image.url)]),
    );
    const freeImages = new Map(loadedFree);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = state.canvasColor || DEFAULT_BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    for (const row of layout.rows) {
      for (const box of row.boxes) {
        // Boxes are positioned relative to their group; columns start at x > 0.
        const x = row.x + box.x;
        const y = row.y + box.y;
        if (box.w <= 0 || box.h <= 0) continue;
        // A hidden photo leaves the canvas background showing in its cell;
        // the image stays in state and the box keeps its size.
        if (box.visible === false) continue;

        const image = box.image ? images.get(box.id) : null;
        if (image) {
          drawPhoto(ctx, image, box, x, y);
        } else {
          ctx.fillStyle = PLACEHOLDER;
          ctx.fillRect(x, y, box.w, box.h);
        }
      }
    }

    // The free-form layer paints above the grid, in the same order as on
    // screen. The canvas edge clips any overhang.
    for (const box of state.freeBoxes) {
      drawFreeBox(ctx, box.image ? freeImages.get(box.id) : null, box);
    }

    return canvas;
  };

  /**
   * Composite the current collage and trigger a download. `format` is `png`
   * (lossless, the default) or `jpeg` at 85% quality.
   */
  const save = async (state, format = 'png') => {
    const jpeg = format === 'jpeg';
    const mime = jpeg ? 'image/jpeg' : 'image/png';
    const extension = jpeg ? 'jpg' : 'png';
    const canvas = await buildCanvas(state);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, mime, jpeg ? 0.85 : undefined),
    );
    if (!blob) throw new Error(I18n.t('export.encodeFailed'));
    if (blob.type !== mime) {
      throw new Error(
        I18n.t('export.unsupported', { format: jpeg ? 'JPEG' : 'PNG' }),
      );
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const name = filename(extension);
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();

    // Give the browser a moment to start the download before releasing the URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return name;
  };

  return { save };
})();
