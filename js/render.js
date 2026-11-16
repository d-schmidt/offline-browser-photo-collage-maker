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
  rows: 'assets/table_rows_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  column: 'assets/view_column_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  format9x16: 'assets/crop_9_16_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  format16x9: 'assets/crop_16_9_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  format7x9: 'assets/crop_portrait_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  format5x4: 'assets/crop_5_4_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  format1x1: 'assets/crop_square_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
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
  const placeImage = (
    element,
    image,
    box,
    zoom,
    offsetX,
    offsetY,
    rotation,
  ) => {
    const rect = Layout.imageRect(
      image,
      box.w,
      box.h,
      zoom,
      offsetX,
      offsetY,
      rotation,
    );
    if (!rect) return;
    element.style.left = `${rect.x}px`;
    element.style.top = `${rect.y}px`;
    element.style.width = `${rect.w}px`;
    element.style.height = `${rect.h}px`;
    element.style.transform = rect.rotation
      ? `rotate(${rect.rotation}deg)`
      : '';
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
        layoutBox.rotation,
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
    const group = state.orientation === 'column' ? 'column' : 'row';
    const limitHint =
      hasImage && !canSquare
        ? `At least one box in a ${group} must stay unlocked`
        : null;
    const ratioHint =
      hasImage && canSquare && !canAspect
        ? `Aspect locks in a ${group} must use the same image ratio`
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

  const selectedPhotoTarget = () => {
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
   * The zoom/rotate handles and the ghost of the full photo are editor-only
   * chrome; they follow the selection and never reach the exported PNG.
   */
  const paintImageChrome = (target = selectedPhotoTarget()) => {
    if (!target) {
      refs.zoomHandle.hidden = true;
      refs.rotateHandle.hidden = true;
      refs.zoomOverlay.hidden = true;
      return;
    }

    const { layoutRow, layoutBox, box } = target;
    const left = layoutRow.x + layoutBox.x;
    const top = layoutRow.y + layoutBox.y;
    const image = box.image;

    if (box.lock === 'aspect') {
      // An aspect-locked box keeps the natural crop, so zoom is not offered.
      refs.zoomHandle.hidden = true;
    } else {
      const range = Layout.zoomRange(
        image,
        layoutBox.w,
        layoutBox.h,
        box.rotation,
      );
      refs.zoomHandle.hidden = false;
      refs.zoomHandle.style.left = `${left + layoutBox.w}px`;
      refs.zoomHandle.style.top = `${top + layoutBox.h}px`;
      refs.zoomHandle.setAttribute('aria-valuemin', String(range.min));
      refs.zoomHandle.setAttribute('aria-valuemax', String(range.max));
      refs.zoomHandle.setAttribute(
        'aria-valuenow',
        String(
          Math.round(Math.min(range.max, Math.max(range.min, box.zoom)) * 100) /
            100,
        ),
      );
    }

    refs.rotateHandle.hidden = false;
    refs.rotateHandle.style.left = `${left + layoutBox.w}px`;
    refs.rotateHandle.style.top = `${top + layoutBox.h}px`;
    refs.rotateHandle.setAttribute(
      'aria-valuenow',
      String(Math.round(box.rotation)),
    );
    refs.rotateHandle.setAttribute(
      'aria-valuetext',
      `${Math.round(box.rotation)} degrees`,
    );

    const rect = Layout.imageRect(
      image,
      layoutBox.w,
      layoutBox.h,
      box.zoom,
      box.offsetX,
      box.offsetY,
      box.rotation,
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
    refs.zoomOverlay.style.left = `${left + rect.x}px`;
    refs.zoomOverlay.style.top = `${top + rect.y}px`;
    refs.zoomOverlay.style.width = `${rect.w}px`;
    refs.zoomOverlay.style.height = `${rect.h}px`;
    refs.zoomOverlay.style.transform = rect.rotation
      ? `rotate(${rect.rotation}deg)`
      : '';
  };

  /** Repaint only the selected photo and its chrome during a zoom/pan/rotate. */
  const updatePhoto = () => {
    const target = selectedPhotoTarget();
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
        target.box.rotation,
      );
    }
    paintImageChrome(target);
  };

  /** Cross-axis center of a group: its row center or its column center. */
  const groupCenter = (layoutRow, column) =>
    column ? layoutRow.x + layoutRow.w / 2 : layoutRow.y + layoutRow.h / 2;

  const paintRail = (layout, rail, side) => {
    const column = layout.column;
    const fragment = document.createDocumentFragment();
    layout.rows.forEach((layoutRow, index) => {
      const place = side === 'left' ? 'above' : 'below';
      const label = column
        ? `Add image box to column ${index + 1} ${place}`
        : `Add image box to row ${index + 1} on the ${side}`;
      const button = toolButton('add-box', label, 'add');
      button.classList.add('rail-button');
      button.dataset.rowId = layoutRow.id;
      button.style.setProperty(
        '--row-center',
        `${groupCenter(layoutRow, column)}px`,
      );
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
            `${groupCenter(layoutRow, layout.column)}px`,
          );
        }
      });
    }
  };

  /**
   * Group boundary: horizontal between rows, vertical between columns. The
   * element is shared, so both its position and its orientation are set here.
   */
  const showGroupBoundary = (position, horizontal) => {
    const element = refs.rowBoundary;
    element.hidden = false;
    element.style.left = horizontal ? '0' : `${position - 1}px`;
    element.style.top = horizontal ? `${position - 1}px` : '0';
    element.style.width = horizontal ? '100%' : '2px';
    element.style.height = horizontal ? '2px' : '100%';
  };

  const hideGroupBoundary = () => {
    refs.rowBoundary.hidden = true;
  };

  const setGroupResizeCursor = (active) => {
    refs.canvas.classList.toggle('is-group-resizable', active);
  };

  /**
   * Box boundary: vertical between boxes in a row, horizontal between boxes in
   * a column. `hit` carries the axis, the boundary position, and the extent of
   * the line across it.
   */
  const showBoxBoundary = (hit) => {
    const element = refs.boxBoundary;
    element.hidden = false;
    if (hit.axis === 'x') {
      element.style.left = `${hit.boundary - 1}px`;
      element.style.top = `${hit.start}px`;
      element.style.width = '2px';
      element.style.height = `${hit.extent}px`;
    } else {
      element.style.left = `${hit.start}px`;
      element.style.top = `${hit.boundary - 1}px`;
      element.style.width = `${hit.extent}px`;
      element.style.height = '2px';
    }
  };

  const hideBoxBoundary = () => {
    refs.boxBoundary.hidden = true;
  };

  const setBoxResizeCursor = (active) => {
    refs.canvas.classList.toggle('is-box-resizable', active);
  };

  /** Cheapest possible update while dragging a boundary. */
  const updateGeometry = (layout) => {
    currentLayout = layout;
    const rowElements = refs.rows.querySelectorAll('.row');
    layout.rows.forEach((layoutRow, rowIndex) => {
      const row = rowElements[rowIndex];
      if (!row) return;
      row.style.left = `${layoutRow.x}px`;
      row.style.top = `${layoutRow.y}px`;
      row.style.width = `${layoutRow.w}px`;
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
            layoutBox.rotation,
          );
        }
      });
    });
    updateRailGeometry(layout);
    paintImageChrome();
  };

  /** Start-screen buttons: one per canvas format, sized from the format list. */
  const paintFormats = (formats, onChoose) => {
    const container = document.getElementById('format-options');
    const fragment = document.createDocumentFragment();

    for (const format of formats) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'format-button';
      button.dataset.format = format.id;

      const label = format.name
        ? `${format.label} ${format.name}`
        : format.label;
      button.setAttribute(
        'aria-label',
        `${label}, ${format.canvasW} × ${format.canvasH} pixels`,
      );
      button.append(iconElement(format.icon));

      const ratio = document.createElement('span');
      ratio.className = 'format-ratio';
      ratio.textContent = format.label;
      button.append(ratio);

      if (format.name) {
        const name = document.createElement('span');
        name.className = 'format-name';
        name.textContent = format.name;
        button.append(name);
      }

      const size = document.createElement('span');
      size.className = 'format-size';
      size.textContent = `${format.canvasW} × ${format.canvasH}`;
      button.append(size);

      button.addEventListener('click', () => onChoose(format));
      fragment.append(button);
    }

    container.replaceChildren(fragment);
  };

  /** The orientation toggle shows the current mode and acts on the next one. */
  const paintOrientation = (state) => {
    const column = state.orientation === 'column';
    const button = refs.orientationButton;
    button.setAttribute('aria-pressed', String(column));
    button.title = column ? 'Switch to row layout' : 'Switch to column layout';
    if (button.dataset.orientation !== state.orientation) {
      button.dataset.orientation = state.orientation;
      button.replaceChildren(iconElement(column ? 'column' : 'rows'));
    }
  };

  /**
   * Swap the stage between its two mirrored arrangements: the group add
   * buttons move above/below or left/right, and the box rails move to the
   * matching sides. The canvas itself keeps its chosen format.
   */
  const paintMode = (state) => {
    const column = state.orientation === 'column';
    refs.stage.classList.toggle('is-column-mode', column);
    refs.canvas.classList.toggle('is-column-mode', column);
    refs.railLeft.setAttribute(
      'aria-label',
      column ? 'Column actions, above the canvas' : 'Row actions, left side',
    );
    refs.railRight.setAttribute(
      'aria-label',
      column ? 'Column actions, below the canvas' : 'Row actions, right side',
    );
    refs.empty.textContent = column
      ? 'No columns yet. Use the + button to the left or right of the canvas to add one.'
      : 'No rows yet. Use the + button above or below the canvas to add one.';
    paintOrientation(state);
  };

  const paintAddGroupButtons = (column) => {
    refs.addRowTop.setAttribute(
      'aria-label',
      column
        ? 'Add column to the left of the canvas'
        : 'Add row above the canvas',
    );
    refs.addRowTop.title = refs.addRowTop.getAttribute('aria-label');
    refs.addRowBottom.setAttribute(
      'aria-label',
      column
        ? 'Add column to the right of the canvas'
        : 'Add row below the canvas',
    );
    refs.addRowBottom.title = refs.addRowBottom.getAttribute('aria-label');
  };

  const init = () => {
    refs.selectionActions = document.getElementById('selection-actions');
    refs.canvas = document.getElementById('canvas');
    refs.rows = document.getElementById('rows');
    refs.stage = document.getElementById('stage');
    refs.railLeft = document.getElementById('row-rail-left');
    refs.railRight = document.getElementById('row-rail-right');
    refs.addRowTop = document.getElementById('add-row-top');
    refs.addRowBottom = document.getElementById('add-row-bottom');
    refs.empty = document.getElementById('canvas-empty');
    refs.orientationButton = document.getElementById('orientation-button');
    refs.rowBoundary = document.getElementById('row-boundary');
    refs.boxBoundary = document.getElementById('box-boundary');
    refs.zoomHandle = document.getElementById('zoom-handle');
    refs.rotateHandle = document.getElementById('rotate-handle');
    refs.zoomOverlay = document.getElementById('zoom-overlay');
    refs.zoomHandle.setAttribute('aria-valuemin', String(Layout.minZoom));
    refs.zoomHandle.setAttribute('aria-valuemax', String(Layout.maxZoom));
    refs.toast = document.getElementById('toast');
    refs.live = document.getElementById('live-region');

    // Static controls only carry a data-icon name; the long asset paths live
    // in ICONS alone. The orientation button is painted per mode instead.
    document.querySelectorAll('[data-icon]').forEach((button) => {
      const name = button.dataset.icon;
      if (ICONS[name]) button.append(iconElement(name));
      button.title = button.getAttribute('aria-label') || '';
    });
  };

  const paint = (state, layout) => {
    currentState = state;
    currentLayout = layout;
    paintMode(state);
    paintAddGroupButtons(state.orientation === 'column');
    refs.empty.hidden = state.rows.length > 0;
    hideGroupBoundary();
    hideBoxBoundary();
    setGroupResizeCursor(false);
    setBoxResizeCursor(false);

    const fragment = document.createDocumentFragment();
    const selectedId = state.selectedBoxId;
    let number = 0;

    layout.rows.forEach((layoutRow) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.rowId = layoutRow.id;
      row.style.left = `${layoutRow.x}px`;
      row.style.top = `${layoutRow.y}px`;
      row.style.width = `${layoutRow.w}px`;
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
    paintFormats,
    paintSelection,
    updateGeometry,
    updatePhoto,
    showGroupBoundary,
    hideGroupBoundary,
    setGroupResizeCursor,
    showBoxBoundary,
    hideBoxBoundary,
    setBoxResizeCursor,
    announce,
    toast,
    focusBox,
    focusCanvas,
  };
})();
