'use strict';

const ICONS = Object.freeze({
  add: 'assets/add_circle_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  addPhoto: 'assets/add_photo_alternate_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  delete: 'assets/delete_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  download: 'assets/download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  dashboard: 'assets/dashboard_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  image: 'assets/image_search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  lockAspect: 'assets/image_aspect_ratio_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  lockSquare: 'assets/crop_square_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
});

const Render = (() => {
  const refs = {};
  let toastTimer = 0;
  let announceToken = 0;
  let currentState = null;
  let currentLayout = null;

  const iconElement = (name) => {
    const image = new Image(24, 24);
    image.src = ICONS[name];
    image.alt = '';
    image.className = 'icon';
    image.draggable = false;
    return image;
  };

  const toolButton = (action, label, iconName) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button';
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(iconElement(iconName));
    return button;
  };

  /** Position the photo inside a box in logical pixels; the box clips it. */
  const placeImage = (element, image, box, zoom, offsetX, offsetY) => {
    const rect = Layout.imageRect(image, box.w, box.h, zoom, offsetX, offsetY);
    if (!rect) return;
    element.style.left = `${rect.x}px`;
    element.style.top = `${rect.y}px`;
    element.style.width = `${rect.w}px`;
    element.style.height = `${rect.h}px`;
  };

  const buildBox = (layoutBox, number, selectedId) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'box';
    button.dataset.boxId = layoutBox.id;
    button.style.left = `${layoutBox.x}px`;
    button.style.top = `${layoutBox.y}px`;
    button.style.width = `${layoutBox.w}px`;
    button.style.height = `${layoutBox.h}px`;

    const hasImage = Boolean(layoutBox.image);
    const locked = Boolean(layoutBox.locked);
    button.classList.toggle('has-image', hasImage);
    button.classList.toggle('has-lock', locked);
    button.classList.toggle('is-selected', layoutBox.id === selectedId);
    button.setAttribute('aria-pressed', String(layoutBox.id === selectedId));
    const label = hasImage ? `Photo box ${number}` : `Empty photo box ${number}`;
    button.setAttribute('aria-label', label);
    button.title = label;

    if (hasImage) {
      const image = document.createElement('img');
      image.className = 'box-image';
      image.src = layoutBox.image.url;
      image.alt = `Photo ${number}`;
      image.draggable = false;
      placeImage(
        image,
        layoutBox.image,
        layoutBox,
        layoutBox.zoom,
        layoutBox.offsetX,
        layoutBox.offsetY,
      );
      button.append(image);
    } else {
      const placeholder = new Image(64, 64);
      placeholder.className = 'box-placeholder';
      placeholder.src = ICONS.addPhoto;
      placeholder.alt = '';
      placeholder.draggable = false;
      placeholder.setAttribute('aria-hidden', 'true');
      button.append(placeholder);
    }

    return button;
  };

  const paintActions = (state) => {
    refs.selectionActions.replaceChildren();
    if (!state.selectedBoxId) return;

    const found = state.findBox(state.selectedBoxId);
    const box = found ? found.box : null;
    const hasImage = Boolean(box && box.image);
    const lock = box ? box.lock : null;
    const canSquare = box ? state.canLockBox(box.id) : false;
    const canAspect = box ? state.canAspectLock(box.id) : false;
    const limitHint =
      hasImage && !canSquare
        ? 'At least one box in a row must stay unlocked'
        : null;
    const ratioHint =
      hasImage && canSquare && !canAspect
        ? 'Aspect locks in a row must use the same image ratio'
        : null;

    const square = toolButton('lock-square', 'Lock square box', 'lockSquare');
    square.disabled = !canSquare;
    square.setAttribute('aria-pressed', String(lock === 'square'));
    square.classList.toggle('is-active', lock === 'square');
    if (limitHint) square.title = limitHint;

    const aspect = toolButton(
      'lock-aspect',
      'Lock image aspect ratio',
      'lockAspect',
    );
    aspect.disabled = !canAspect;
    aspect.setAttribute('aria-pressed', String(lock === 'aspect'));
    aspect.classList.toggle('is-active', lock === 'aspect');
    if (limitHint) aspect.title = limitHint;
    else if (ratioHint) aspect.title = ratioHint;

    refs.selectionActions.append(
      toolButton('delete-box', 'Delete box', 'delete'),
      toolButton('select-image', 'Select image', 'image'),
      square,
      aspect,
    );
  };

  const selectedZoomTarget = () => {
    if (!currentLayout || !currentState || !currentState.selectedBoxId) return null;
    const found = currentState.findBox(currentState.selectedBoxId);
    if (!found || !found.box.image) return null;
    const layoutRow = currentLayout.rows.find((row) => row.id === found.row.id);
    if (!layoutRow) return null;
    const layoutBox = layoutRow.boxes.find((box) => box.id === found.box.id);
    if (!layoutBox) return null;
    return { layoutRow, layoutBox, box: found.box };
  };

  /**
   * The zoom handle and the ghost of the full photo are editor-only chrome;
   * they follow the selection and never reach the exported PNG.
   */
  const paintImageChrome = (target = selectedZoomTarget()) => {
    if (!target) {
      refs.zoomHandle.hidden = true;
      refs.zoomOverlay.hidden = true;
      return;
    }

    const { layoutRow, layoutBox, box } = target;
    const top = layoutRow.y + layoutBox.y;
    const image = box.image;

    refs.zoomHandle.hidden = false;
    refs.zoomHandle.style.left = `${layoutBox.x + layoutBox.w}px`;
    refs.zoomHandle.style.top = `${top + layoutBox.h}px`;
    refs.zoomHandle.setAttribute(
      'aria-valuenow',
      String(Math.round(box.zoom * 100) / 100),
    );

    const rect = Layout.imageRect(
      image,
      layoutBox.w,
      layoutBox.h,
      box.zoom,
      box.offsetX,
      box.offsetY,
    );
    if (!rect) {
      refs.zoomOverlay.hidden = true;
      return;
    }

    if (refs.zoomOverlay.dataset.src !== image.url) {
      refs.zoomOverlay.src = image.url;
      refs.zoomOverlay.dataset.src = image.url;
    }
    refs.zoomOverlay.hidden = false;
    refs.zoomOverlay.style.left = `${layoutBox.x + rect.x}px`;
    refs.zoomOverlay.style.top = `${top + rect.y}px`;
    refs.zoomOverlay.style.width = `${rect.w}px`;
    refs.zoomOverlay.style.height = `${rect.h}px`;
  };

  /** Repaint only the selected box's photo and its chrome during a zoom/pan. */
  const updateZoom = () => {
    const target = selectedZoomTarget();
    if (!target) return;
    const image = refs.rows.querySelector(
      `[data-box-id="${target.layoutBox.id}"] .box-image`,
    );
    if (image) {
      placeImage(
        image,
        target.box.image,
        target.layoutBox,
        target.box.zoom,
        target.box.offsetX,
        target.box.offsetY,
      );
    }
    paintImageChrome(target);
  };

  const paintRail = (layout, rail, side) => {
    const fragment = document.createDocumentFragment();
    layout.rows.forEach((layoutRow, index) => {
      const button = toolButton(
        'add-box',
        `Add image box to row ${index + 1} on the ${side}`,
        'add',
      );
      button.classList.add('rail-button');
      button.dataset.rowId = layoutRow.id;
      button.style.setProperty('--row-center', `${layoutRow.y + layoutRow.h / 2}px`);
      fragment.append(button);
    });
    rail.replaceChildren(fragment);
  };

  const updateRailGeometry = (layout) => {
    for (const rail of [refs.railLeft, refs.railRight]) {
      const buttons = rail.querySelectorAll('.rail-button');
      layout.rows.forEach((layoutRow, index) => {
        if (buttons[index]) {
          buttons[index].style.setProperty(
            '--row-center',
            `${layoutRow.y + layoutRow.h / 2}px`,
          );
        }
      });
    }
  };

  const showRowBoundary = (y) => {
    refs.rowBoundary.hidden = false;
    refs.rowBoundary.style.top = `${y - 1}px`;
  };

  const hideRowBoundary = () => {
    refs.rowBoundary.hidden = true;
  };

  const setRowResizeCursor = (active) => {
    refs.canvas.classList.toggle('is-row-resizable', active);
  };

  const showBoxBoundary = (x, y, height) => {
    refs.boxBoundary.hidden = false;
    refs.boxBoundary.style.left = `${x - 1}px`;
    refs.boxBoundary.style.top = `${y}px`;
    refs.boxBoundary.style.height = `${height}px`;
  };

  const hideBoxBoundary = () => {
    refs.boxBoundary.hidden = true;
  };

  const setBoxResizeCursor = (active) => {
    refs.canvas.classList.toggle('is-box-resizable', active);
  };

  /** Cheapest possible update while dragging a row boundary. */
  const updateGeometry = (layout) => {
    currentLayout = layout;
    const rowElements = refs.rows.querySelectorAll('.row');
    layout.rows.forEach((layoutRow, rowIndex) => {
      const row = rowElements[rowIndex];
      if (!row) return;
      row.style.top = `${layoutRow.y}px`;
      row.style.height = `${layoutRow.h}px`;

      const boxElements = row.querySelectorAll('.box');
      layoutRow.boxes.forEach((layoutBox, boxIndex) => {
        const box = boxElements[boxIndex];
        if (!box) return;
        box.style.left = `${layoutBox.x}px`;
        box.style.top = `${layoutBox.y}px`;
        box.style.width = `${layoutBox.w}px`;
        box.style.height = `${layoutBox.h}px`;

        const image = box.querySelector('.box-image');
        if (image && layoutBox.image) {
          placeImage(
            image,
            layoutBox.image,
            layoutBox,
            layoutBox.zoom,
            layoutBox.offsetX,
            layoutBox.offsetY,
          );
        }
      });
    });
    updateRailGeometry(layout);
    paintImageChrome();
  };

  const init = () => {
    refs.selectionActions = document.getElementById('selection-actions');
    refs.canvas = document.getElementById('canvas');
    refs.rows = document.getElementById('rows');
    refs.railLeft = document.getElementById('row-rail-left');
    refs.railRight = document.getElementById('row-rail-right');
    refs.empty = document.getElementById('canvas-empty');
    refs.rowBoundary = document.getElementById('row-boundary');
    refs.boxBoundary = document.getElementById('box-boundary');
    refs.zoomHandle = document.getElementById('zoom-handle');
    refs.zoomOverlay = document.getElementById('zoom-overlay');
    refs.zoomHandle.setAttribute('aria-valuemin', String(Layout.minZoom));
    refs.zoomHandle.setAttribute('aria-valuemax', String(Layout.maxZoom));
    refs.toast = document.getElementById('toast');
    refs.live = document.getElementById('live-region');

    // Static controls only carry a data-icon name; the long asset paths live
    // in ICONS alone.
    document.querySelectorAll('[data-icon]').forEach((button) => {
      const name = button.dataset.icon;
      if (ICONS[name]) button.append(iconElement(name));
      button.title = button.getAttribute('aria-label') || '';
    });
  };

  const paint = (state, layout) => {
    currentState = state;
    currentLayout = layout;
    refs.empty.hidden = state.rows.length > 0;
    hideRowBoundary();
    hideBoxBoundary();
    setRowResizeCursor(false);
    setBoxResizeCursor(false);

    const fragment = document.createDocumentFragment();
    const selectedId = state.selectedBoxId;
    let number = 0;

    layout.rows.forEach((layoutRow) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.rowId = layoutRow.id;
      row.style.top = `${layoutRow.y}px`;
      row.style.height = `${layoutRow.h}px`;

      layoutRow.boxes.forEach((layoutBox) => {
        number += 1;
        row.append(buildBox(layoutBox, number, selectedId));
      });

      fragment.append(row);
    });

    refs.rows.replaceChildren(fragment);
    paintRail(layout, refs.railLeft, 'left');
    paintRail(layout, refs.railRight, 'right');
    paintActions(state);
    paintImageChrome();
  };

  const paintSelection = (state) => {
    currentState = state;
    refs.rows.querySelectorAll('.box').forEach((box) => {
      const selected = box.dataset.boxId === state.selectedBoxId;
      box.classList.toggle('is-selected', selected);
      box.setAttribute('aria-pressed', String(selected));
    });
    paintActions(state);
    paintImageChrome();
  };

  const announce = (message) => {
    // Clear first so repeating the same message is announced again, and keep
    // only the newest message if several arrive before the next frame.
    announceToken += 1;
    const token = announceToken;
    refs.live.textContent = '';
    requestAnimationFrame(() => {
      if (token === announceToken) refs.live.textContent = message;
    });
  };

  const toast = (message, isError = false) => {
    refs.toast.textContent = message;
    refs.toast.classList.toggle('is-error', isError);
    refs.toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      refs.toast.hidden = true;
    }, 5000);
    announce(message);
  };

  const focusBox = (boxId) => {
    const box = refs.rows.querySelector(`[data-box-id="${boxId}"]`);
    if (box) box.focus({ preventScroll: true });
  };

  const focusCanvas = () => {
    refs.canvas.focus({ preventScroll: true });
  };

  return {
    init,
    paint,
    paintSelection,
    updateGeometry,
    updateZoom,
    showRowBoundary,
    hideRowBoundary,
    setRowResizeCursor,
    showBoxBoundary,
    hideBoxBoundary,
    setBoxResizeCursor,
    announce,
    toast,
    focusBox,
    focusCanvas,
  };
})();
