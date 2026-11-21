'use strict';

const ICONS = Object.freeze({
  add: 'assets/add_circle_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  addBox: 'assets/add_box_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  addPhoto: 'assets/add_photo_alternate_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  alignCenter:
    'assets/align_horizontal_center_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  alignLeft:
    'assets/align_horizontal_left_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  alignRight:
    'assets/align_horizontal_right_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  borderStyle: 'assets/border_style_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  background: 'assets/background_replace_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  delete: 'assets/delete_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  download: 'assets/download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  uploadFile: 'assets/upload_file_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  editNote: 'assets/edit_note_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  brandFamily:
    'assets/brand_family_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  colorFill: 'assets/format_color_fill_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  colors: 'assets/colors_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  gradient: 'assets/gradient_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  shuffle: 'assets/shuffle_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  vignette: 'assets/vignette_2_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  blur: 'assets/blur_on_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  image: 'assets/image_search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  invertColors:
    'assets/invert_colors_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  lockAspect: 'assets/image_aspect_ratio_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  lockSquare: 'assets/crop_square_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  mode: 'assets/space_dashboard_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  moreVert: 'assets/more_vert_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  borderWeight: 'assets/line_weight_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  rotateLeft: 'assets/rotate_left_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  rotateSnap:
    'assets/rotate_90_degrees_ccw_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  zoomOutMap: 'assets/zoom_out_map_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  undo: 'assets/undo_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  visibility: 'assets/visibility_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  visibilityOff: 'assets/visibility_off_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  format9x16: 'assets/crop_9_16_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  format16x9: 'assets/crop_16_9_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  formatBold:
    'assets/format_bold_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  formatItalic:
    'assets/format_italic_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  formatUnderlined:
    'assets/format_underlined_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
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
  // Only an in-flight rotation drag shows the snap mark; idle handles keep the
  // regular rotate mark even when the stored angle sits on a quarter turn.
  let rotateSnapActive = false;

  const iconElement = (name) => {
    const image = new Image(24, 24);
    image.src = ICONS[name];
    image.alt = '';
    image.className = 'icon';
    image.draggable = false;
    return image;
  };

  /**
   * While a rotation drag is inside the magnetic snap window the handle wears
   * the quarter-turn mark; otherwise it keeps the regular rotate mark.
   */
  const paintRotateMark = (handle) => {
    const mark = handle.querySelector('.handle-icon');
    if (!mark) return;
    const src = rotateSnapActive ? ICONS.rotateSnap : ICONS.rotateLeft;
    if (mark.getAttribute('src') !== src) mark.setAttribute('src', src);
  };

  /** Toggle the drag-only snap mark on every rotation handle on screen. */
  const setRotateSnap = (active) => {
    const next = Boolean(active);
    if (rotateSnapActive === next) return;
    rotateSnapActive = next;
    if (refs.rotateHandle) paintRotateMark(refs.rotateHandle);
    if (refs.freeLayer) {
      refs.freeLayer
        .querySelectorAll('.free-rotate')
        .forEach((handle) => paintRotateMark(handle));
    }
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

  /** A 1 px rule between the structural actions and the ratio actions. */
  const actionSeparator = () => {
    const divider = document.createElement('span');
    divider.className = 'action-divider';
    divider.setAttribute('aria-hidden', 'true');
    return divider;
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  // One mutable duotone filter per photo box, so dragging the color picker
  // updates its functions instead of adding a filter for every preview shade.
  const tintFilters = new Map();
  let tintDefs = null;

  /** Move one duotone filter's red/green/blue ramp to the given color. */
  const paintTintFilter = (entry, color) => {
    entry.color = color;
    entry.funcs.forEach((func, index) => {
      const channel =
        parseInt(color.slice(1 + index * 2, 3 + index * 2), 16) / 255;
      // Dark pixels land on the tint, bright pixels reach white.
      func.setAttribute('intercept', String(channel));
      func.setAttribute('slope', String(1 - channel));
    });
  };

  /**
   * Inline SVG duotone filter for a photo, cached per box. The photo is reduced
   * to its luminance with the coefficients the export's canvas compositing
   * uses, then mapped from the tint (dark pixels) to white (bright pixels), so
   * a black-and-white QR code reads white and the chosen color. Plain CSS
   * filter functions cannot express that mapping.
   */
  const tintFilter = (boxId, color) => {
    if (!color) return '';
    const key = color.toLowerCase();
    const cached = tintFilters.get(boxId);
    if (cached) {
      if (cached.color !== key) paintTintFilter(cached, key);
      return cached.value;
    }

    if (!tintDefs) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'tint-filters');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      tintDefs = document.createElementNS(SVG_NS, 'defs');
      svg.append(tintDefs);
      document.body.append(svg);
    }

    const id = `photo-tint-${boxId}`;
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', id);
    // sRGB keeps the editor's result in step with the canvas export.
    filter.setAttribute('color-interpolation-filters', 'sRGB');

    const luminance = document.createElementNS(SVG_NS, 'feColorMatrix');
    luminance.setAttribute('type', 'matrix');
    luminance.setAttribute(
      'values',
      '0.3 0.59 0.11 0 0 ' +
        '0.3 0.59 0.11 0 0 ' +
        '0.3 0.59 0.11 0 0 ' +
        '0 0 0 1 0',
    );
    const transfer = document.createElementNS(SVG_NS, 'feComponentTransfer');
    const funcs = ['feFuncR', 'feFuncG', 'feFuncB'].map((name) => {
      const func = document.createElementNS(SVG_NS, name);
      func.setAttribute('type', 'linear');
      transfer.append(func);
      return func;
    });
    filter.append(luminance, transfer);
    tintDefs.append(filter);

    const entry = { color: '', funcs, value: `url("#${id}")` };
    paintTintFilter(entry, key);
    tintFilters.set(boxId, entry);
    return entry.value;
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

  /** The CSS color of a recolored empty cell. */
  const emptyFillColor = (fill) => {
    const channel = (offset) =>
      parseInt(fill.color.slice(offset, offset + 2), 16);
    return `rgba(${channel(1)}, ${channel(3)}, ${channel(5)}, ${fill.opacity})`;
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
    const visible = layoutBox.visible !== false;
    const locked = Boolean(layoutBox.locked);
    button.classList.toggle('has-image', hasImage);
    button.classList.toggle('is-hidden', !visible);
    button.classList.toggle('has-lock', locked);
    button.classList.toggle('has-fill', Boolean(layoutBox.fill) && visible);
    button.classList.toggle('is-selected', layoutBox.id === selectedId);
    // A recolored empty cell paints its own color over the default gray. A
    // hidden cell stays a transparent cut-out, so it keeps no inline paint.
    if (!hasImage && visible && layoutBox.fill) {
      button.style.backgroundColor = emptyFillColor(layoutBox.fill);
    }
    button.setAttribute('aria-pressed', String(layoutBox.id === selectedId));
    const label = !visible
      ? I18n.t('box.labelHidden', { n: number })
      : hasImage
        ? I18n.t('box.label', { n: number })
        : I18n.t('box.labelEmpty', { n: number });
    button.setAttribute('aria-label', label);
    button.title = label;

    if (hasImage && visible) {
      const image = document.createElement('img');
      image.className = 'box-image';
      image.src = layoutBox.image.url;
      image.alt = I18n.t('box.alt', { n: number });
      image.draggable = false;
      const tint = tintFilter(layoutBox.id, layoutBox.tint);
      if (tint) image.style.filter = tint;
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
    } else if (!hasImage && visible && !layoutBox.fill) {
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
    const border = Layout.freeBorder(box);
    const height = box.width / (box.aspect || 1);
    element.style.left = `${box.x}px`;
    element.style.top = `${box.y}px`;
    element.style.width = `${box.width}px`;
    element.style.height = `${height}px`;
    element.style.transform = `translate(-50%, -50%) rotate(${box.rotation}deg)`;
    element.style.setProperty('--free-border', `${border}px`);
    element.classList.toggle('has-border', border > 0);
    // The ring samples a solid fallback for the overhang, while its paint child
    // counter-rotates so the canvas image stays aligned when the box turns.
    element.style.setProperty('--free-frame', State.canvasColorAt(box.x, box.y));
    const boxLeft = box.x - box.width / 2;
    const boxTop = box.y - height / 2;
    const alignPaint = (paint, offset) => {
      paint.style.left = `${-boxLeft - offset}px`;
      paint.style.top = `${-boxTop - offset}px`;
      paint.style.transformOrigin = `${box.x}px ${box.y}px`;
      paint.style.transform = `rotate(${-box.rotation}deg)`;
    };
    // The frame starts at the box edge, the fill inside the optional border.
    element
      .querySelectorAll('.free-frame-paint')
      .forEach((paint) => alignPaint(paint, 0));
    element
      .querySelectorAll('.free-bg-paint')
      .forEach((paint) => alignPaint(paint, border));
    if (box.kind === 'text') {
      element.style.setProperty(
        '--free-text-size',
        `${Layout.freeTextSize(box)}px`,
      );
      element.style.setProperty(
        '--free-text-stroke',
        `${Layout.textOutlineWidth(box)}px`,
      );
    }
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
    paintRotateMark(rotate);
  };

  /** Canvas-paint fill behind a transparent free-form photo. */
  const buildFreeBackground = () => {
    const fill = document.createElement('div');
    fill.className = 'free-bg';
    const paint = document.createElement('div');
    paint.className = 'free-bg-paint';
    fill.append(paint);
    return fill;
  };

  /** Outlined text lines inside a free-form text box. */
  const buildFreeText = (box) => {
    const text = document.createElement('div');
    text.className = 'free-text';
    text.dataset.align = box.align || 'center';
    text.textContent = box.text;
    text.style.color = box.color;
    text.style.fontFamily = Layout.textFontStack(box.font);
    text.style.fontWeight = box.bold === false ? '400' : '700';
    text.style.fontStyle = box.italic ? 'italic' : 'normal';
    text.style.textDecorationLine = box.underline ? 'underline' : 'none';
    text.style.webkitTextStrokeColor = box.outline;
    return text;
  };

  /** Fill a free-form box (or its ghost copy) with its content or placeholder. */
  const freeContent = (box, container, ghost = false) => {
    const isText = box.kind === 'text';
    if (isText) {
      // A text box's background flag shows or hides the gray backdrop; a photo
      // box uses the same flag for the canvas paint behind transparency. The
      // ghost only previews the text, so it never re-tints the backdrop.
      if (ghost || box.background === false) container.style.background = 'none';
    } else if (box.background) {
      container.append(buildFreeBackground());
    }
    if (box.image) {
      const image = document.createElement('img');
      image.className = 'free-box-image';
      image.src = box.image.url;
      image.alt = '';
      image.draggable = false;
      const tint = tintFilter(box.id, box.tint);
      if (tint) image.style.filter = tint;
      container.append(image);
      return;
    }
    if (isText && box.text) {
      container.append(buildFreeText(box));
      return;
    }
    // A recolored empty cell hides the add-photo hint just like a grid cell.
    if (box.fill) return;
    const placeholder = new Image(64, 64);
    placeholder.className = 'box-placeholder';
    placeholder.src = isText ? ICONS.editNote : ICONS.addPhoto;
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

    // The free-form handles wear the same marks as the photo handles.
    const scaleMark = iconElement('zoomOutMap');
    scaleMark.classList.add('handle-icon');
    scale.append(scaleMark);
    const rotateMark = iconElement('rotateLeft');
    rotateMark.classList.add('handle-icon');
    rotate.append(rotateMark);

    paintFreeHandleValues(scale, rotate, box);
    element.append(scale, rotate);
  };

  /** Ring layer that shows the canvas paint through a free-form border. */
  const buildFreeFrame = () => {
    const frame = document.createElement('div');
    frame.className = 'free-frame';
    const paint = document.createElement('div');
    paint.className = 'free-frame-paint';
    frame.append(paint);
    return frame;
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
    const isText = box.kind === 'text';
    element.classList.toggle('has-image', hasImage);
    element.classList.toggle('has-text', isText && Boolean(box.text));
    element.classList.toggle('is-text-box', isText);
    // A recolored empty free-form box paints its own color and opacity. Text
    // boxes use the same fill for their backdrop, and only while it is shown.
    if (
      !hasImage &&
      box.fill &&
      (!isText || box.background !== false)
    ) {
      element.style.backgroundColor = emptyFillColor(box.fill);
    }
    const label = isText
      ? I18n.t(box.text ? 'textBox.label' : 'textBox.labelEmpty', { n: number })
      : hasImage
        ? I18n.t('free.label', { n: number })
        : I18n.t('free.labelEmpty', { n: number });
    element.setAttribute('aria-label', label);
    element.title = label;
    freeContent(box, element);
    if (Layout.freeBorder(box) > 0) element.append(buildFreeFrame());
    applyFreeStyles(element, box);

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

    const body = document.createElement('div');
    body.className = 'free-ghost-body';
    freeContent(box, body, true);
    if (Layout.freeBorder(box) > 0) body.append(buildFreeFrame());

    ghost.append(body);
    applyFreeStyles(ghost, box);
    attachFreeHandles(ghost, box);
    layer.append(ghost);
    return layer;
  };

  const paintFree = (state) => {
    const fragment = document.createDocumentFragment();
    let photoNumber = 0;
    let textNumber = 0;
    state.freeBoxes.forEach((box) => {
      const selected = box.id === state.selectedFreeId;
      const number =
        box.kind === 'text' ? (textNumber += 1) : (photoNumber += 1);
      fragment.append(buildFreeBox(box, number, selected));
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

  /**
   * The text styling menus only exist while a text box is selected. Moving to
   * another box closes them so their values never describe the previous box.
   */
  const showTextControls = (available, boxId = null) => {
    refs.fontWrap.hidden = !available;
    refs.textColorWrap.hidden = !available;
    const sameBox = available && boxId === refs.textBoxId;
    refs.textBoxId = available ? boxId : null;
    if (sameBox) return;
    refs.fontMenu.hidden = true;
    refs.fontButton.setAttribute('aria-expanded', 'false');
    refs.textColorMenu.hidden = true;
    refs.textColorButton.setAttribute('aria-expanded', 'false');
  };

  /**
   * Rebuild the tool row while keeping the persistent menu wrappers in place:
   * the text styling wrappers follow the dynamic actions and the fill menu
   * stays last, so repainting never closes an open popover.
   */
  const setActionTools = (leading, trailing = []) => {
    Array.from(refs.selectionActions.children).forEach((child) => {
      if (
        child !== refs.fillWrap &&
        child !== refs.fontWrap &&
        child !== refs.textColorWrap &&
        child !== refs.tintWrap
      ) {
        child.remove();
      }
    });
    for (const node of leading) {
      refs.selectionActions.insertBefore(node, refs.fontWrap);
    }
    for (const node of trailing) {
      refs.selectionActions.insertBefore(node, refs.fillWrap);
    }
  };

  const paintActions = (state) => {
    // The free-form add actions only fill the empty left side of the bar; a
    // selected box replaces them with its contextual tools.
    const hasSelection = Boolean(state.selectedBoxId || state.selectedFreeId);
    refs.createActions.hidden = hasSelection;
    // Availability is resolved before the branches so a repaint (for example
    // while the opacity slider moves) keeps an open menu open.
    const selectedFill = state.selectedFreeId
      ? state.findFreeBox(state.selectedFreeId)
      : state.selectedBoxId
        ? state.findBox(state.selectedBoxId)
        : null;
    const selectedFree =
      selectedFill && state.selectedFreeId ? selectedFill : null;
    const isTextSelected = Boolean(
      selectedFree && selectedFree.box.kind === 'text',
    );
    // Text boxes keep the background flag and its own toggle instead of the
    // empty-cell color menu, so only photos and grid cells get that menu.
    const fillBox =
      selectedFill &&
      !selectedFill.box.image &&
      selectedFill.box.kind !== 'text'
        ? selectedFill.box
        : null;
    showFillControls(Boolean(fillBox), fillBox ? fillBox.id : null);
    // A text box has no photo to colorize, and an empty cell has nothing to
    // recolor yet, so the menu only follows a photo box.
    const tintBox =
      selectedFill && selectedFill.box.image && selectedFill.box.kind !== 'text'
        ? selectedFill.box
        : null;
    showTintControls(
      Boolean(tintBox),
      tintBox ? tintBox.id : null,
      tintBox ? tintBox.tint : null,
    );
    showTextControls(
      isTextSelected,
      isTextSelected ? selectedFree.box.id : null,
    );
    if (!hasSelection) {
      setActionTools([]);
      return;
    }
    if (state.selectedFreeId) {
      const found = state.findFreeBox(state.selectedFreeId);
      if (!found) return;
      const hasImage = Boolean(found.box.image);

      if (found.box.kind === 'text') {
        const hasText = Boolean(found.box.text);
        const borderOn = found.box.border !== false;
        const backgroundOn = found.box.background !== false;

        const border = toolButton(
          'free-border',
          I18n.t('action.textBorder'),
          'borderStyle',
        );
        border.setAttribute('aria-pressed', String(borderOn));
        border.classList.toggle('is-active', borderOn);

        const background = toolButton(
          'free-background',
          I18n.t('action.textBackground'),
          'background',
        );
        background.setAttribute('aria-pressed', String(backgroundOn));
        background.classList.toggle('is-active', backgroundOn);

        setActionTools(
          [
            toolButton(
              'delete-box',
              I18n.t(hasText ? 'action.removeText' : 'action.delete'),
              'delete',
            ),
            toolButton('edit-text', I18n.t('action.editText'), 'editNote'),
            actionSeparator(),
          ],
          [border, background],
        );
        return;
      }

      const borderOn = found.box.border !== false;
      const border = toolButton(
        'free-border',
        I18n.t('action.border'),
        'borderStyle',
      );
      border.setAttribute('aria-pressed', String(borderOn));
      border.classList.toggle('is-active', borderOn);

      // There is no ratio to crop until a photo arrives, so the square-crop
      // button joins the row with the image instead of sitting there disabled.
      const framing = [];
      if (hasImage) {
        const square = toolButton(
          'crop-square',
          I18n.t('action.cropSquare'),
          'lockSquare',
        );
        square.setAttribute('aria-pressed', String(Boolean(found.box.square)));
        square.classList.toggle('is-active', Boolean(found.box.square));
        if (found.box.square) square.title = I18n.t('action.matchPhoto');
        framing.push(square);
      }
      framing.push(border);

      // Only a photo with transparent pixels can show a fill behind it; an
      // opaque photo would hide the background completely.
      if (hasImage && found.box.image.hasAlpha) {
        const backgroundOn = Boolean(found.box.background);
        const background = toolButton(
          'free-background',
          I18n.t('action.background'),
          'background',
        );
        background.setAttribute('aria-pressed', String(backgroundOn));
        background.classList.toggle('is-active', backgroundOn);
        framing.push(background);
      }

      setActionTools(
        [
          toolButton(
            'delete-box',
            I18n.t(hasImage ? 'action.removePhoto' : 'action.delete'),
            'delete',
          ),
          toolButton('select-image', I18n.t('action.selectImage'), 'image'),
          actionSeparator(),
        ],
        framing,
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

    const visible = box ? box.visible !== false : true;
    const visibility = toolButton(
      'toggle-visibility',
      I18n.t('action.visibility'),
      visible ? 'visibility' : 'visibilityOff',
    );
    visibility.setAttribute('aria-pressed', String(visible));
    visibility.title = I18n.t(
      hasImage
        ? visible
          ? 'action.hideImage'
          : 'action.showImage'
        : visible
          ? 'action.hideBox'
          : 'action.showBox',
    );

    // A box without a photo has no ratio to lock, so the two lock buttons stay
    // hidden rather than disabled and appear as soon as a photo is loaded.
    const framing = hasImage ? [square, aspect, visibility] : [visibility];
    // The same button removes the whole box only while it is empty; with a
    // photo it lifts the photo and leaves the empty cell behind.
    const deleteLabel = I18n.t(
      hasImage ? 'action.removePhoto' : 'action.delete',
    );

    setActionTools(
      [
        toolButton('delete-box', deleteLabel, 'delete'),
        toolButton('select-image', I18n.t('action.selectImage'), 'image'),
        actionSeparator(),
      ],
      framing,
    );
  };

  const focusFreeBox = (freeId) => {
    const element = refs.freeLayer.querySelector(
      `.free-box[data-free-id="${freeId}"]`,
    );
    if (element) element.focus({ preventScroll: true });
  };

  /** Re-sample the free-form frame colors after the margin paint changes. */
  const repaintFreeFrames = () => {
    if (!currentState) return;
    currentState.freeBoxes.forEach((box) => {
      refs.freeLayer
        .querySelectorAll(
          `.free-box[data-free-id="${box.id}"], .free-ghost[data-free-id="${box.id}"]`,
        )
        .forEach((element) => applyFreeStyles(element, box));
    });
  };

  /**
   * The empty-cell color menu only exists for an empty grid box or photo box.
   * Hiding it, or moving the selection to another box, also closes the popover
   * so its values never belong to the previous cell.
   */
  const showFillControls = (available, boxId = null) => {
    refs.fillWrap.hidden = !available;
    const sameBox = available && boxId === refs.fillBoxId;
    refs.fillBoxId = available ? boxId : null;
    if (sameBox) return;
    refs.fillMenu.hidden = true;
    refs.fillButton.setAttribute('aria-expanded', 'false');
  };

  /**
   * The colorize menu only exists for a photo box. Moving to another box or to
   * an empty cell closes it, and the button reads as active while a tint is
   * applied, so the color is never left describing a previous photo.
   */
  const showTintControls = (available, boxId = null, tint = null) => {
    refs.tintWrap.hidden = !available;
    refs.tintButton.classList.toggle('is-active', available && Boolean(tint));
    const sameBox = available && boxId === refs.tintBoxId;
    refs.tintBoxId = available ? boxId : null;
    if (sameBox) return;
    refs.tintMenu.hidden = true;
    refs.tintButton.setAttribute('aria-expanded', 'false');
  };

  const selectedPhotoTarget = () => {
    if (!currentLayout || !currentState || !currentState.selectedBoxId) return null;
    const found = currentState.findBox(currentState.selectedBoxId);
    if (!found || !found.box.image || found.box.visible === false) return null;
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
      // The zoom dot hangs off the box's bottom-left corner; the rotate dot
      // mirrors it at the bottom-right one.
      refs.zoomHandle.style.left = `${left}px`;
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
    paintRotateMark(refs.rotateHandle);

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
    refs.zoomOverlay.style.filter = tintFilter(box.id, box.tint);
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
    refs.createActions = document.getElementById('create-actions');
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
    refs.fillWrap = document.getElementById('fill-menu-wrap');
    refs.fillMenu = document.getElementById('fill-menu');
    refs.fillButton = document.getElementById('fill-button');
    refs.tintWrap = document.getElementById('tint-menu-wrap');
    refs.tintMenu = document.getElementById('tint-menu');
    refs.tintButton = document.getElementById('tint-button');
    refs.fontWrap = document.getElementById('font-menu-wrap');
    refs.fontMenu = document.getElementById('font-menu');
    refs.fontButton = document.getElementById('font-button');
    refs.textColorWrap = document.getElementById('text-color-menu-wrap');
    refs.textColorMenu = document.getElementById('text-color-menu');
    refs.textColorButton = document.getElementById('text-color-button');

    // Both photo handles wear their marks on the accent disc.
    const rotateMark = iconElement('rotateLeft');
    rotateMark.classList.add('handle-icon');
    refs.rotateHandle.append(rotateMark);

    const zoomMark = iconElement('zoomOutMap');
    zoomMark.classList.add('handle-icon');
    refs.zoomHandle.append(zoomMark);

    // Static controls only carry a data-icon name; the long asset paths live
    // in ICONS alone. The orientation button is painted per mode instead.
    document.querySelectorAll('[data-icon]').forEach((button) => {
      const name = button.dataset.icon;
      if (ICONS[name]) {
        const icon = iconElement(name);
        // The line-weight mark reads as a vertical border thickness.
        if (name === 'borderWeight') icon.classList.add('is-rotated-cw');
        // The left-to-right gradient style is the icon turned on its side.
        if (button.dataset.rotate === 'ccw') {
          icon.classList.add('is-rotated-ccw');
        }
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
    repaintFreeFrames,
    focusCanvas,
    updateFreeBox,
    setRotateSnap,
  };
})();
