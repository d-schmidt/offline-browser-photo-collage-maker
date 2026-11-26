'use strict';

/**
 * JSON project files for work in progress. Every photo is embedded as a data
 * URL with its original pixels, so a file restores the collage exactly without
 * depending on the images still being on disk.
 *
 * The browser-local deleted-photo shelf is deliberately not part of a project:
 * its photos never enter the JSON, and importing a project leaves the shelf as
 * it is instead of replacing or filling it.
 */
const Project = (() => {
  const APP = 'photo-collage-editor';
  const VERSION = 1;

  const pad = (value) => String(value).padStart(2, '0');

  /** Local-time download name: collage-yyyy-MM-dd-HH-mm.json */
  const filename = (date = new Date()) =>
    `collage-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}-${pad(date.getHours())}-${pad(date.getMinutes())}.json`;

  const readDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error(I18n.t('save.exportFailed')));
      reader.onerror = () => reject(new Error(I18n.t('save.exportFailed')));
      reader.readAsDataURL(blob);
    });

  /**
   * A photo in a project: the original bytes as a data URL, plus the size and
   * transparency flag so a reader can sanity-check the decode.
   */
  const encodeImage = async (image) => {
    let dataUrl = null;
    if (typeof image.url === 'string' && image.url.startsWith('data:image/')) {
      // A photo taken back from the deleted-photo shelf is already embedded.
      dataUrl = image.url;
    } else if (image.blob) {
      dataUrl = await readDataUrl(image.blob);
    }
    if (!dataUrl) throw new Error(I18n.t('save.exportFailed'));
    return {
      dataUrl,
      width: image.width,
      height: image.height,
      hasAlpha: Boolean(image.hasAlpha),
      name: image.blob && image.blob.name ? image.blob.name : '',
    };
  };

  const serializeBox = async (box) => ({
    weight: box.weight,
    visible: box.visible !== false,
    lock: box.lock,
    ratio: box.ratio,
    lockSeq: box.lockSeq,
    zoom: box.zoom,
    offsetX: box.offsetX,
    offsetY: box.offsetY,
    rotation: box.rotation,
    tint: box.tint,
    fill: box.fill ? { color: box.fill.color, opacity: box.fill.opacity } : null,
    radius: box.radius || 0,
    image: box.image ? await encodeImage(box.image) : null,
  });

  const serializeFreeBox = async (box) => ({
    kind: box.kind,
    x: box.x,
    y: box.y,
    width: box.width,
    aspect: box.aspect,
    rotation: box.rotation,
    shape: box.shape || 'ratio',
    // Older readers only understand the square crop flag.
    square: box.shape === 'square',
    tint: box.tint,
    border: box.border !== false,
    background: box.background !== false,
    fill: box.fill ? { color: box.fill.color, opacity: box.fill.opacity } : null,
    radius: box.radius || 0,
    text: box.kind === 'text' ? box.text : '',
    font: box.font,
    color: box.color,
    outline: box.outline,
    align: box.align,
    bold: box.bold === true,
    italic: box.italic === true,
    underline: box.underline === true,
    outlineWidth: box.outlineWidth,
    image:
      box.kind === 'photo' && box.image
        ? await encodeImage(box.image)
        : null,
  });

  /** Build the complete, self-contained project object for a download. */
  const snapshot = async (state, { format, spotsSeed }) => {
    const rows = [];
    for (const row of state.rows) {
      const boxes = [];
      for (const box of row.boxes) boxes.push(await serializeBox(box));
      rows.push({ weight: row.weight, boxes });
    }

    const freeBoxes = [];
    for (const box of state.freeBoxes) {
      freeBoxes.push(await serializeFreeBox(box));
    }

    return {
      app: APP,
      kind: 'collage-project',
      version: VERSION,
      savedAt: new Date().toISOString(),
      format: {
        id: format.id,
        label: format.label,
        orientation:
          format.orientation ||
          (format.canvasW > format.canvasH ? 'landscape' : 'portrait'),
        canvasW: format.canvasW,
        canvasH: format.canvasH,
      },
      orientation: state.orientation,
      borderThickness: state.borderThickness,
      cornerRadius: state.canvasRadius,
      canvas: {
        mode: state.canvasMode,
        color: state.canvasColor,
        gradientTop: state.gradientTop,
        gradientBottom: state.gradientBottom,
        gradientStyle: state.gradientStyle,
        spotsSeed,
      },
      textDefaults: {
        font: state.textDefaults.font,
        color: state.textDefaults.color,
        outline: state.textDefaults.outline,
      },
      rows,
      freeBoxes,
    };
  };

  /** Trigger a JSON download and return the chosen filename. */
  const download = (data) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
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

  /** Decode the base64 body of a data URL without fetch, so file:// works. */
  const dataUrlToBlob = (dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      throw new Error(I18n.t('save.importImageFailed'));
    }
    const comma = dataUrl.indexOf(',');
    if (comma === -1) throw new Error(I18n.t('save.importImageFailed'));
    const header = dataUrl.slice(5, comma).split(';');
    const type = header[0] || '';
    if (!type.startsWith('image/')) {
      throw new Error(I18n.t('save.importImageFailed'));
    }
    const base64 = header.some((part) => part.toLowerCase() === 'base64');
    const body = dataUrl.slice(comma + 1);
    if (!base64) {
      return new Blob([decodeURIComponent(body)], { type });
    }
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type });
  };

  /** Decode one embedded photo into the object a box expects. */
  const decodeImage = async (dataUrl) => {
    try {
      return await Images.load(dataUrlToBlob(dataUrl));
    } catch {
      throw new Error(I18n.t('save.importImageFailed'));
    }
  };

  /**
   * A project's format. New files name both the ratio and the orientation, so
   * the known format list decides the effective size; older files keep their
   * stored pixels, and a foreign-but-valid size is accepted as it is.
   */
  const normalizeFormat = (raw) => {
    const format = raw && typeof raw === 'object' ? raw : {};
    const known = FORMATS.find((candidate) => candidate.id === format.id);
    const orientation =
      format.orientation === 'portrait' || format.orientation === 'landscape'
        ? format.orientation
        : null;
    const width = Math.round(Number(format.canvasW));
    const height = Math.round(Number(format.canvasH));
    const validSize =
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width >= 100 &&
      height >= 100 &&
      width <= 10000 &&
      height <= 10000;

    if (known && orientation) return Layout.formatFor(known, orientation);

    if (validSize) {
      return {
        id: known ? known.id : typeof format.id === 'string' ? format.id : '',
        label: known
          ? known.label
          : typeof format.label === 'string'
            ? format.label
            : '',
        orientation:
          width > height
            ? 'landscape'
            : width < height
              ? 'portrait'
              : 'portrait',
        canvasW: width,
        canvasH: height,
      };
    }

    if (known) return Layout.formatFor(known, 'portrait');
    throw new Error(I18n.t('save.importInvalid'));
  };

  /**
   * Read a project file and decode its photos. Nothing in the editor changes
   * here: a broken file fails before the current collage is touched. The
   * returned images are owned by the caller once the state accepts them.
   */
  const parse = async (file) => {
    let data = null;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error(I18n.t('save.importInvalid'));
    }
    if (
      !data ||
      typeof data !== 'object' ||
      data.app !== APP ||
      data.version !== VERSION ||
      !Array.isArray(data.rows)
    ) {
      throw new Error(I18n.t('save.importInvalid'));
    }

    const format = normalizeFormat(data.format);
    const canvas =
      data.canvas && typeof data.canvas === 'object' ? data.canvas : {};
    const images = [];
    const fonts = new Set();

    try {
      const rows = [];
      for (const rawRow of data.rows) {
        if (!rawRow || typeof rawRow !== 'object') continue;
        const rawBoxes = Array.isArray(rawRow.boxes) ? rawRow.boxes : [];
        const boxes = [];
        for (const rawBox of rawBoxes) {
          if (!rawBox || typeof rawBox !== 'object') continue;
          const box = { ...rawBox };
          if (rawBox.image && typeof rawBox.image === 'object' && rawBox.image.dataUrl) {
            box.image = await decodeImage(rawBox.image.dataUrl);
            images.push(box.image);
          } else {
            box.image = null;
          }
          boxes.push(box);
        }
        rows.push({ ...rawRow, boxes });
      }

      const freeBoxes = [];
      for (const rawBox of Array.isArray(data.freeBoxes)
        ? data.freeBoxes
        : []) {
        if (!rawBox || typeof rawBox !== 'object') continue;
        const box = { ...rawBox };
        if (
          box.kind !== 'text' &&
          rawBox.image &&
          typeof rawBox.image === 'object' &&
          rawBox.image.dataUrl
        ) {
          box.image = await decodeImage(rawBox.image.dataUrl);
          images.push(box.image);
        } else {
          box.image = null;
        }
        if (box.kind === 'text' && typeof box.font === 'string') {
          fonts.add(box.font);
        }
        freeBoxes.push(box);
      }

      return {
        format,
        canvas,
        orientation: data.orientation,
        borderThickness: data.borderThickness,
        cornerRadius: data.cornerRadius,
        textDefaults: data.textDefaults,
        rows,
        freeBoxes,
        fonts: [...fonts],
        images,
      };
    } catch (error) {
      images.forEach((image) => Images.release(image));
      throw error;
    }
  };

  return { snapshot, parse, download, filename };
})();
