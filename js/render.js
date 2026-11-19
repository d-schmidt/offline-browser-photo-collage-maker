'use strict';

const ICONS = Object.freeze({
  add: 'assets/add_circle_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  addBox: 'assets/add_box_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  addPhoto: 'assets/add_photo_alternate_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  delete: 'assets/delete_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  download: 'assets/download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  colorFill: 'assets/format_color_fill_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  image: 'assets/image_search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  lockAspect: 'assets/image_aspect_ratio_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  lockSquare: 'assets/crop_square_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  mode: 'assets/space_dashboard_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  borderWeight: 'assets/line_weight_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  undo: 'assets/undo_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
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
    const label = hasImage
      ? I18n.t('box.label', { n: number })
      : I18n.t('box.labelEmpty', { n: number });
    button.setAttribute('aria-label', label);
    button.title = label;

    if (hasImage) {
      const image = document.createElement('img');
      image.className = 'box-image';
      image.src = layoutBox.image.url;
      image.alt = I18n.t('box.alt', { n: number });
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

  /**
   * Geometry for a free-form box. It is absolutely positioned by its centre
   * and rotated around that centre, so moving and scaling stay intuitive.
   */
  const applyFreeStyles = (element, box) => {
    element.style.left = `${box.x}px`;
    element.style.top = `${box.y}px`;
    element.style.width = `${box.width}px`;
    element.style.height = `${box.width / (box.aspect || 1)}px`;
    element.style.transform = `translate(-50%, -50%) rotate(${box.rotation}deg)`;
  };

  const paintFreeHandleValues = (scale, rotate, box) => {
    scale.setAttribute('aria-valuemin', '40');
    scale.setAttribute('aria-valuemax', '10000');
    scale.setAttribute('aria-valuenow', String(Math.round(box.width)));
    scale.setAttribute('aria-valuetext', I18n.t('free.size', {
      n: Math.round(box.width),
    }));
    rotate.setAttribute('aria-valuemin', '-180');
    rotate.setAttribute('aria-valuemax', '180');
    rotate.setAttribute('aria-valuenow', String(Math.round(box.rotation)));
    rotate.setAttribute('aria-valuetext', I18n.t('rotate.value', {
      n: Math.round(box.rotation),
    }));
  };

  /** Fill a free-form box (or its ghost copy) with its photo or placeholder. */
  const freeContent = (box, container) => {
    if (box.image) {
      const image = document.createElement('img');
      image.className = 'free-box-image';
      image.src = box.image.url;
      image.alt = '';
      image.draggable = false;
      container.append(image);
      return;
    }
    const placeholder = new Image(64, 64);
    placeholder.className = 'box-placeholder';
    placeholder.src = ICONS.addPhoto;
    placeholder.alt = '';
    placeholder.draggable = false;
    placeholder.setAttribute('aria-hidden', 'true');
    container.append(placeholder);
  };

  /**
   * Scale and rotate controls live inside the rotated box so they follow the
   * photo at any angle. They keep their screen size through the canvas scale.
   */
  const attachFreeHandles = (element, box) => {
    const scale = document.createElement('div');
    scale.className = 'free-scale';
    scale.dataset.freeHandle = 'scale';
    scale.setAttribute('role', 'slider');
    scale.tabIndex = 0;
    scale.setAttribute('aria-label', I18n.t('free.scale'));
    scale.title = I18n.t('free.scaleTitle');

    const rotate = document.createElement('div');
    rotate.className = 'free-rotate';
    rotate.dataset.freeHandle = 'rotate';
    rotate.setAttribute('role', 'slider');
    rotate.tabIndex = 0;
    rotate.setAttribute('aria-label', I18n.t('free.rotate'));
    rotate.title = I18n.t('free.rotateTitle');

    paintFreeHandleValues(scale, rotate, box);
    element.append(scale, rotate);
  };

  /** The clipped, always-solid copy of a free-form box. */
  const buildFreeBox = (box, number, selected) => {
    const slot = document.createElement('div');
    slot.className = 'free-slot';
    slot.dataset.freeId = box.id;
    if (selected) slot.style.zIndex = '15';

    const element = document.createElement('div');
    element.className = 'free-box';
    element.dataset.freeId = box.id;
    element.setAttribute('role', 'button');
    element.tabIndex = 0;
    element.setAttribute('aria-pressed', String(selected));

    const hasImage = Boolean(box.image);
    element.classList.toggle('has-image', hasImage);
    const label = hasImage
      ? I18n.t('free.label', { n: number })
      : I18n.t('free.labelEmpty', { n: number });
    element.setAttribute('aria-label', label);
    element.title = label;
    applyFreeStyles(element, box);
    freeContent(box, element);

    slot.append(element);
    return slot;
  };

  /**
   * Unclipped selection layer for the selected box: the translucent overhang
   * preview plus the rotation and scale handles and the selection border.
   */
  const buildFreeControls = (box) => {
    const layer = document.createElement('div');
    layer.className = 'free-controls';
    layer.dataset.freeId = box.id;

    const ghost = document.createElement('div');
    ghost.className = 'free-ghost';
    ghost.dataset.freeId = box.id;
    ghost.classList.toggle('has-image', Boolean(box.image));
    applyFreeStyles(ghost, box);

    const body = document.createElement('div');
    body.className = 'free-ghost-body';
    freeContent(box, body);

    ghost.append(body);
    attachFreeHandles(ghost, box);
    layer.append(ghost);
    return layer;
  };

  const paintFree = (state) => {
    const fragment = document.createDocumentFragment();
    state.freeBoxes.forEach((box, index) => {
      const selected = box.id === state.selectedFreeId;
      fragment.append(buildFreeBox(box, index + 1, selected));
      if (selected) fragment.append(buildFreeControls(box));
    });
    refs.freeLayer.replaceChildren(fragment);
  };

  /**
   * Update selection chrome in place instead of rebuilding the free layer, so
   * a pointer drag keeps its original target and its focus. Only the clipped
   * boxes survive; the selected control layer is cheap to recreate.
   */
  const paintFreeSelection = (state) => {
    refs.freeLayer.querySelectorAll('.free-slot').forEach((slot) => {
      const selected = slot.dataset.freeId === state.selectedFreeId;
      // Raise the selected solid copy above the other boxes, so its ghost
      // overlay blends into an opaque result inside the canvas.
      slot.style.zIndex = selected ? '15' : '';
    });
    refs.freeLayer.querySelectorAll('.free-box').forEach((element) => {
      const selected = element.dataset.freeId === state.selectedFreeId;
      element.classList.toggle('is-selected', selected);
      element.setAttribute('aria-pressed', String(selected));
    });
    refs.freeLayer
      .querySelectorAll('.free-controls')
      .forEach((node) => node.remove());

    if (!state.selectedFreeId) return;
    const found = state.findFreeBox(state.selectedFreeId);
    if (!found) return;
    refs.freeLayer.append(buildFreeControls(found.box));
  };

  /** Repaint one free-form box while it is being moved, scaled, or rotated. */
  const updateFreeBox = (box) => {
    refs.freeLayer
      .querySelectorAll(
        `.free-box[data-free-id="${box.id}"], .free-ghost[data-free-id="${box.id}"]`,
      )
      .forEach((element) => applyFreeStyles(element, box));

    const ghost = refs.freeLayer.querySelector(
      `.free-ghost[data-free-id="${box.id}"]`,
    );
    if (!ghost) return;
    const scale = ghost.querySelector('.free-scale');
    const rotate = ghost.querySelector('.free-rotate');
    if (scale && rotate) paintFreeHandleValues(scale, rotate, box);
  };

  const focusFreeBox = (freeId) => {
    const element = refs.freeLayer.querySelector(
      `.free-box[data-free-id="${freeId}"]`,
    );
    if (element) element.focus({ preventScroll: true });
  };

  const paintActions = (state) => {
    refs.selectionActions.replaceChildren();
    if (state.selectedFreeId) {
      const found = state.findFreeBox(state.selectedFreeId);
      if (!found) return;
      refs.selectionActions.append(
        toolButton('delete-box', I18n.t('action.delete'), 'delete'),
        toolButton('select-image', I18n.t('action.selectImage'), 'image'),
      );
      return;
    }
    if (!state.selectedBoxId) return;

    const found = state.findBox(state.selectedBoxId);
    const box = found ? found.box : null;
    const hasImage = Boolean(box && box.image);
    const lock = box ? box.lock : null;
    const canSquare = box ? state.canLockBox(box.id) : false;
    const canAspect = box ? state.canAspectLock(box.id) : false;
    const group = I18n.t(
      state.orientation === 'column' ? 'group.column' : 'group.row',
    );
    const limitHint =
      hasImage && !canSquare
        ? I18n.t('hint.unlocked', { group })
        : null;
    const ratioHint =
      hasImage && canSquare && !canAspect
        ? I18n.t('hint.ratio', { group })
        : null;

    const square = toolButton(
      'lock-square',
      I18n.t('action.lockSquare'),
      'lockSquare',
    );
    square.disabled = !canSquare;
    square.setAttribute('aria-pressed', String(lock === 'square'));
    square.classList.toggle('is-active', lock === 'square');
    if (limitHint) square.title = limitHint;

    const aspect = toolButton(
      'lock-aspect',
      I18n.t('action.lockAspect'),
      'lockAspect',
    );
    aspect.disabled = !canAspect;
    aspect.setAttribute('aria-pressed', String(lock === 'aspect'));
    aspect.classList.toggle('is-active', lock === 'aspect');
    if (limitHint) aspect.title = limitHint;
    else if (ratioHint) aspect.title = ratioHint;

    refs.selectionActions.append(
      toolButton('delete-box', I18n.t('action.delete'), 'delete'),
      toolButton('select-image', I18n.t('action.selectImage'), 'image'),
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
      I18n.t('rotate.value', { n: Math.round(box.rotation) }),
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
      const label = column
        ? I18n.t(
            side === 'left' ? 'add.box.columnTop' : 'add.box.columnBottom',
            { n: index + 1 },
          )
        : I18n.t(
            side === 'left' ? 'add.box.rowLeft' : 'add.box.rowRight',
            { n: index + 1 },
          );
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

      const name = format.nameKey ? I18n.t(format.nameKey) : '';
      const label = name ? `${format.label} ${name}` : format.label;
      button.setAttribute(
        'aria-label',
        I18n.t('format.aria', {
          label,
          w: format.canvasW,
          h: format.canvasH,
        }),
      );
      button.append(iconElement(format.icon));

      const ratio = document.createElement('span');
      ratio.className = 'format-ratio';
      ratio.textContent = format.label;
      button.append(ratio);

      if (name) {
        const nameElement = document.createElement('span');
        nameElement.className = 'format-name';
        nameElement.textContent = name;
        button.append(nameElement);
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
    button.title = I18n.t(
      column ? 'orientation.toRow' : 'orientation.toColumn',
    );
    if (button.dataset.orientation !== state.orientation) {
      button.dataset.orientation = state.orientation;
      const icon = iconElement('mode');
      // The row icon is the same dashboard tile turned on its side.
      if (!column) icon.classList.add('is-rotated-ccw');
      button.replaceChildren(icon);
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
      I18n.t(column ? 'rail.top' : 'rail.left'),
    );
    refs.railRight.setAttribute(
      'aria-label',
      I18n.t(column ? 'rail.bottom' : 'rail.right'),
    );
    refs.empty.textContent = I18n.t(
      column ? 'empty.columns' : 'empty.rows',
    );
    paintOrientation(state);
  };

  /** Square thumbnails of the photos deleted or replaced most recently. */
  const paintHistory = (entries) => {
    const fragment = document.createDocumentFragment();
    entries.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-thumb';
      button.dataset.historyId = entry.hash;
      const label = I18n.t('history.photo', { n: index + 1 });
      button.setAttribute('aria-label', label);
      button.title = label;

      const image = new Image();
      image.src = entry.data;
      image.alt = '';
      image.draggable = false;
      image.decoding = 'async';
      button.append(image);
      fragment.append(button);
    });
    refs.historyList.replaceChildren(fragment);
  };

  const paintAddGroupButtons = (column) => {
    refs.addRowTop.setAttribute(
      'aria-label',
      I18n.t(column ? 'add.group.left' : 'add.group.top'),
    );
    refs.addRowTop.title = refs.addRowTop.getAttribute('aria-label');
    refs.addRowBottom.setAttribute(
      'aria-label',
      I18n.t(column ? 'add.group.right' : 'add.group.bottom'),
    );
    refs.addRowBottom.title = refs.addRowBottom.getAttribute('aria-label');
  };

  const init = () => {
    refs.selectionActions = document.getElementById('selection-actions');
    refs.canvas = document.getElementById('canvas');
    refs.rows = document.getElementById('rows');
    refs.freeLayer = document.getElementById('free-layer');
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
    refs.historyList = document.getElementById('history-list');

    // Static controls only carry a data-icon name; the long asset paths live
    // in ICONS alone. The orientation button is painted per mode instead.
    document.querySelectorAll('[data-icon]').forEach((button) => {
      const name = button.dataset.icon;
      if (ICONS[name]) {
        const icon = iconElement(name);
        // The line-weight mark reads as a vertical border thickness.
        if (name === 'borderWeight') icon.classList.add('is-rotated-cw');
        button.append(icon);
      }
      button.title = button.getAttribute('aria-label') || '';
    });
  };

  const paint = (state, layout) => {
    currentState = state;
    currentLayout = layout;
    paintMode(state);
    paintAddGroupButtons(state.orientation === 'column');
    refs.empty.hidden =
      state.rows.length > 0 || state.freeBoxes.length > 0;
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
    paintFree(state);
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
    paintFreeSelection(state);
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
    paintHistory,
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
    focusFreeBox,
    focusCanvas,
    updateFreeBox,
  };
})();
