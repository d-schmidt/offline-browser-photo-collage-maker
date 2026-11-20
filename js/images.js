'use strict';

const Images = (() => {
  const isImageFile = (file) => {
    if (!file) return false;
    // Some browsers report an empty type for valid local files, so fall back
    // to the extension instead of rejecting them outright.
    if (file.type) return file.type.startsWith('image/');
    return /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i.test(file.name);
  };

  const loadElement = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(I18n.t('image.decodeFailed')));
      image.src = url;
    });

  // Alpha is sampled from a small copy: enough to spot a transparent photo
  // without scanning millions of pixels on every load.
  const ALPHA_SAMPLE = 64;

  /** True when the decoded image has at least one translucent pixel. */
  const detectAlpha = (source) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = ALPHA_SAMPLE;
      canvas.height = ALPHA_SAMPLE;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return false;
      context.clearRect(0, 0, ALPHA_SAMPLE, ALPHA_SAMPLE);
      context.drawImage(source, 0, 0, ALPHA_SAMPLE, ALPHA_SAMPLE);
      const { data } = context.getImageData(0, 0, ALPHA_SAMPLE, ALPHA_SAMPLE);
      for (let index = 3; index < data.length; index += 4) {
        if (data[index] < 255) return true;
      }
    } catch {
      // An unreadable canvas just means no detected transparency; the photo
      // still loads and behaves like an opaque one.
    }
    return false;
  };

  const measureWithElement = async (url) => {
    const image = await loadElement(url);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      hasAlpha: detectAlpha(image),
    };
  };

  const measure = async (file, url) => {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const size = {
          width: bitmap.width,
          height: bitmap.height,
          hasAlpha: detectAlpha(bitmap),
        };
        bitmap.close();
        return size;
      } catch {
        // createImageBitmap rejects some formats (notably SVG); let <img> try.
      }
    }
    return measureWithElement(url);
  };

  /** Load and decode a picked file, returning the data the box needs. */
  const load = async (file) => {
    if (!isImageFile(file)) {
      throw new Error(I18n.t('image.notImage'));
    }

    const url = URL.createObjectURL(file);
    try {
      const { width, height, hasAlpha } = await measure(file, url);
      if (!width || !height) throw new Error('empty image');
      // Keep the original file so the history shelf can store a copy later.
      return { url, width, height, blob: file, hasAlpha };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error(I18n.t('image.openFailed'));
    }
  };

  const release = (image) => {
    if (image && image.url) URL.revokeObjectURL(image.url);
  };

  return { load, loadElement, release };
})();
