'use strict';

const Export = (() => {
  const DEFAULT_BACKGROUND = '#ffffff';
  // Empty grid cells and empty free-form boxes share one translucent gray: 0.8
  // × #cfcfcf over a white canvas reads as the old #d9d9d9, so the transparency
  // only shows where the margin paint differs from white.
  const PLACEHOLDER = 'rgba(207, 207, 207, 0.8)';

  /** The paint of an empty grid cell that was recolored through its menu. */
  const boxFillStyle = (fill) => {
    const channel = (offset) =>
      parseInt(fill.color.slice(offset, offset + 2), 16);
    return `rgba(${channel(1)}, ${channel(3)}, ${channel(5)}, ${fill.opacity})`;
  };

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
   * Ring of canvas paint around a free-form box, drawn in its rotated space and
   * then canvas-aligned. The sampled color fills the part over the canvas edge.
   */
  const drawFreeFrame = (ctx, paint, frameColor, rect, border) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.left, rect.top, rect.width, rect.height);
    ctx.rect(
      rect.left + border,
      rect.top + border,
      rect.width - 2 * border,
      rect.height - 2 * border,
    );
    ctx.clip('evenodd');
    ctx.fillStyle = frameColor;
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(paint, 0, 0);
    ctx.restore();
  };

  /**
   * Split text into lines the way the editor's flexbox wraps it: explicit
   * newlines first, then greedy word wrapping at the available width.
   */
  const wrapText = (ctx, text, maxWidth) => {
    const lines = [];
    for (const paragraph of String(text).split('\n')) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push('');
        continue;
      }
      let line = words[0];
      for (let index = 1; index < words.length; index += 1) {
        const candidate = `${line} ${words[index]}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
          line = candidate;
        } else {
          lines.push(line);
          line = words[index];
        }
      }
      lines.push(line);
    }
    return lines;
  };

  /** Outlined, centred text lines inside the border of a free-form text box. */
  const drawFreeText = (ctx, box, left, top, width, height, border) => {
    const innerW = width - 2 * border;
    const innerH = height - 2 * border;
    if (!box.text || innerW <= 0 || innerH <= 0) return;

    const size = Layout.freeTextSize(box);
    const family = Layout.textFontStack(box.font);
    ctx.save();
    ctx.beginPath();
    ctx.rect(left + border, top + border, innerW, innerH);
    ctx.clip();
    ctx.font = `${size}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const padding = size * Layout.textPadding;
    const lines = wrapText(ctx, box.text, Math.max(0, innerW - 2 * padding));
    const lineHeight = size * Layout.textLineHeight;
    const centerX = left + border + innerW / 2;
    const centerY = top + border + innerH / 2;
    const firstY = centerY - ((lines.length - 1) / 2) * lineHeight;

    lines.forEach((line, index) => {
      const y = firstY + index * lineHeight;
      // Stroke first, then fill, matching `paint-order: stroke fill`.
      ctx.lineWidth = 1;
      ctx.strokeStyle = box.outline;
      ctx.strokeText(line, centerX, y);
      ctx.fillStyle = box.color;
      ctx.fillText(line, centerX, y);
    });
    ctx.restore();
  };

  /**
   * Draw one free-form box. Its optional frame is a ring cut through the canvas
   * paint, the photo is cover-cropped to the inner area, and the whole box
   * rotates around its centre. The export canvas clips any overhang.
   */
  const drawFreeBox = (ctx, image, box, paint, frameColor) => {
    const width = box.width;
    const height = box.width / (box.aspect || 1);
    const left = -width / 2;
    const top = -height / 2;
    const border = Layout.freeBorder(box);
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.rotate(((box.rotation || 0) * Math.PI) / 180);
    if (box.kind === 'text') {
      // The gray backdrop is the text box's background flag; the words sit on
      // it inside the optional frame.
      if (box.background !== false) {
        ctx.fillStyle = box.fill ? boxFillStyle(box.fill) : PLACEHOLDER;
        ctx.fillRect(left, top, width, height);
      }
      if (border > 0) {
        drawFreeFrame(
          ctx,
          paint,
          frameColor,
          { left, top, width, height },
          border,
        );
      }
      drawFreeText(ctx, box, left, top, width, height, border);
      ctx.restore();
      return;
    }
    if (!image) {
      // An empty box is framed like a photo, with the placeholder inside it.
      if (border > 0) {
        drawFreeFrame(
          ctx,
          paint,
          frameColor,
          { left, top, width, height },
          border,
        );
      }
      ctx.fillStyle = box.fill ? boxFillStyle(box.fill) : PLACEHOLDER;
      ctx.fillRect(
        left + border,
        top + border,
        width - 2 * border,
        height - 2 * border,
      );
      ctx.restore();
      return;
    }
    if (border > 0) {
      drawFreeFrame(
        ctx,
        paint,
        frameColor,
        { left, top, width, height },
        border,
      );
    }
    const innerW = width - 2 * border;
    const innerH = height - 2 * border;
    if (box.background && innerW > 0 && innerH > 0) {
      // Fill the area behind the photo with the canvas paint, so transparent
      // pixels show the background instead of the grid. Reset the rotation
      // while drawing so a gradient or spots pattern stays canvas-aligned.
      ctx.save();
      ctx.beginPath();
      ctx.rect(left + border, top + border, innerW, innerH);
      ctx.clip();
      ctx.fillStyle = frameColor;
      ctx.fillRect(left + border, top + border, innerW, innerH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(paint, 0, 0);
      ctx.restore();
    }
    const sourceW = image.naturalWidth || image.width;
    const sourceH = image.naturalHeight || image.height;
    if (innerW > 0 && innerH > 0 && sourceW > 0 && sourceH > 0) {
      // The editor fills the photo with `object-fit: cover`; mirror that crop.
      const cover = Math.max(innerW / sourceW, innerH / sourceH);
      const cropW = innerW / cover;
      const cropH = innerH / cover;
      ctx.drawImage(
        image,
        (sourceW - cropW) / 2,
        (sourceH - cropH) / 2,
        cropW,
        cropH,
        left + border,
        top + border,
        innerW,
        innerH,
      );
    }
    ctx.restore();
  };

  /**
   * Build a canvas-sized copy of the margin paint. The editor's CSS uses the
   * same definitions; random spots reuse the generated bitmap, so the export
   * shows the exact pattern from the screen. Free-form frames are cut through
   * this canvas.
   */
  const buildPaintCanvas = async (state, width, height) => {
    if (state.canvasMode !== 'gradient') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = state.canvasColor || DEFAULT_BACKGROUND;
      ctx.fillRect(0, 0, width, height);
      return canvas;
    }

    const first = state.gradientTop;
    const second = state.gradientBottom;
    if (state.gradientStyle === 'spots') {
      // The same rasterised bitmap the editor shows, cropped to the format.
      return (await Paint.spots(width, height, first, second)).canvas;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    let paint;
    if (state.gradientStyle === 'horizontal') {
      paint = ctx.createLinearGradient(0, 0, width, 0);
    } else if (state.gradientStyle === 'radial') {
      paint = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.hypot(width / 2, height / 2),
      );
    } else {
      paint = ctx.createLinearGradient(0, 0, 0, height);
    }
    // The circular style is second color in the centre, first in the corners.
    paint.addColorStop(0, state.gradientStyle === 'radial' ? second : first);
    paint.addColorStop(1, state.gradientStyle === 'radial' ? first : second);
    ctx.fillStyle = paint;
    ctx.fillRect(0, 0, width, height);
    return canvas;
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
    const paint = await buildPaintCanvas(state, width, height);
    ctx.drawImage(paint, 0, 0);

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
          ctx.fillStyle = box.fill ? boxFillStyle(box.fill) : PLACEHOLDER;
          ctx.fillRect(x, y, box.w, box.h);
        }
      }
    }

    // The free-form layer paints above the grid, in the same order as on
    // screen. The canvas edge clips any overhang.
    for (const box of state.freeBoxes) {
      drawFreeBox(
        ctx,
        box.image ? freeImages.get(box.id) : null,
        box,
        paint,
        state.canvasColorAt(box.x, box.y),
      );
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
