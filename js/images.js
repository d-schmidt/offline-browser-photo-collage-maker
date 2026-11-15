'use strict';

const Images = (() => {
  const isImageFile = (file) => {
    if (!file) return false;
    // Some browsers report an empty type for valid local files, so fall back
    // to the extension instead of rejecting them outright.
    if (file.type) return file.type.startsWith('image/');
    return /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i.test(file.name);
  };

  const measureWithElement = async (url) => {
    const image = await loadElement(url);
    return { width: image.naturalWidth, height: image.naturalHeight };
  };

  const loadElement = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('An image could not be decoded.'));
      image.src = url;
    });

  const measure = async (file, url) => {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const size = { width: bitmap.width, height: bitmap.height };
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
      throw new Error('That file is not an image. Choose a photo or another image file.');
    }

    const url = URL.createObjectURL(file);
    try {
      const { width, height } = await measure(file, url);
      if (!width || !height) throw new Error('empty image');
      return { url, width, height };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error('That image could not be opened. Try a different file.');
    }
  };

  const release = (image) => {
    if (image && image.url) URL.revokeObjectURL(image.url);
  };

  return { load, loadElement, release };
})();
