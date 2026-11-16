'use strict';

(() => {
  const editorArea = document.getElementById('editor-area');
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('canvas');
  const railLeft = document.getElementById('row-rail-left');
  const railRight = document.getElementById('row-rail-right');
  const addRowTop = document.getElementById('add-row-top');
  const addRowBottom = document.getElementById('add-row-bottom');
  const actionBar = document.getElementById('action-bar');
  const saveButton = document.getElementById('save-button');
  const saveMenuWrap = document.getElementById('save-menu-wrap');
  const saveMenu = document.getElementById('save-menu');
  const orientationButton = document.getElementById('orientation-button');
  const borderButton = document.getElementById('border-button');
  const borderMenuWrap = document.getElementById('border-menu-wrap');
  const borderMenu = document.getElementById('border-menu');
  const borderRange = document.getElementById('border-range');
  const borderValue = document.getElementById('border-value');
  const marginColorButton = document.getElementById('margin-color-button');
  const marginColorInput = document.getElementById('margin-color-input');
  const rowsLayer = document.getElementById('rows');
  const fileInput = document.getElementById('file-input');
  const zoomHandle = document.getElementById('zoom-handle');
  const rotateHandle = document.getElementById('rotate-handle');
  const formatScreen = document.getElementById('format-screen');

  let pickerBoxId = null;
  let fitFrame = 0;
  let editing = false;
  let layout = Layout.compute(State.rows, State.orientation);
  let rowDrag = null;
  let boxDrag = null;
  let panDrag = null;
  let zoomDrag = null;
  let rotateDrag = null;
  let ignoreCanvasClickUntil = 0;
  let saveMenuOpen = false;
  let borderMenuOpen = false;
  let borderFrame = 0;

  // Boundary grab bands are measured in screen pixels so they stay finger
  // sized however far the 1080 px canvas is scaled down. Touch gets a wider
  // band than a mouse, which can aim precisely.
  const GROUP_HANDLE_HIT = 8;
  const BOX_HANDLE_HIT = 8;
  const GROUP_HANDLE_HIT_TOUCH = 22;
  const BOX_HANDLE_HIT_TOUCH = 22;
  const DRAG_THRESHOLD = 3;

  const isColumnMode = () => State.orientation === 'column';

  const refresh = () => {
    // Padding and gaps come from state, so sync the layout before computing.
    Layout.setBorderThickness(State.borderThickness);
    layout = Layout.compute(State.rows, State.orientation);
    Render.paint(State, layout);
  };

  /**
   * Freeze the groups' current pixel extents into weights. Called before a
   * group loses its full-width (or full-height) fit rule, so the layout keeps
   * its extents instead of snapping back to the old weights.
   */
  const preserveGroupExtents = () => {
    if (layout.rows.length === 0) return;
    const column = isColumnMode();
    State.setRowHeights(layout.rows.map((row) => (column ? row.w : row.h)));
  };

  /**
   * Freeze the visible pixel proportions before the orientation turn. Rows
   * become columns, so the current heights become widths and the current box
   * widths become heights.
   */
  const freezeLayoutProportions = () => {
    if (layout.rows.length === 0) return;
    const column = isColumnMode();
    State.setRowHeights(layout.rows.map((row) => (column ? row.w : row.h)));
    for (const row of layout.rows) {
      State.setRowWeights(
        row.id,
        row.boxes.map((box) => (column ? box.h : box.w)),
      );
    }
  };

  const applyCanvasColor = () => {
    document.documentElement.style.setProperty('--canvas-bg', State.canvasColor);
    marginColorInput.value = State.canvasColor;
  };

  /**
   * The canvas padding and every box gap share one thickness, so the range
   * slider and its readout mirror the state value. The CSS tokens are updated
   * for documentation only; the geometry itself comes from Layout.
   */
  const applyBorderThickness = () => {
    const thickness = State.borderThickness;
    document.documentElement.style.setProperty('--canvas-pad', `${thickness}px`);
    document.documentElement.style.setProperty('--gap', `${thickness}px`);
    borderRange.value = String(thickness);
    borderRange.setAttribute('aria-valuetext', `${thickness} pixels`);
    borderValue.textContent = `${thickness} px`;
  };

  // Every slider step reflows the whole canvas, so coalesce the input events
  // into at most one repaint per frame.
  const queueBorderRefresh = () => {
    if (borderFrame) return;
    borderFrame = requestAnimationFrame(() => {
      borderFrame = 0;
      applyBorderThickness();
      refresh();
    });
  };

  const boxNumber = (boxId) => {
    const index = State.orderedBoxes().findIndex((box) => box.id === boxId);
    return index === -1 ? 0 : index + 1;
  };

  const selectAndFocus = (boxId) => {
    if (!State.select(boxId)) return;
    Render.paintSelection(State);
    Render.focusBox(boxId);
    Render.announce(`Photo box ${boxNumber(boxId)} selected.`);
  };

  const deselect = () => {
    if (!State.selectedBoxId) return;
    State.clearSelection();
    Render.paintSelection(State);
    Render.focusCanvas();
    Render.announce('Selection cleared.');
  };

  const openPicker = (boxId) => {
    if (!boxId) return;
    pickerBoxId = boxId;
    fileInput.click();
  };

  const deleteSelected = () => {
    const boxId = State.selectedBoxId;
    if (!boxId) return;
    const number = boxNumber(boxId);
    if (!State.removeBox(boxId)) return;
    refresh();
    Render.focusCanvas();
    Render.announce(`Photo box ${number} deleted.`);
  };

  const focusAction = (action) => {
    const button = document.querySelector(
      `#selection-actions button[data-action="${action}"]`,
    );
    if (button) button.focus({ preventScroll: true });
  };

  const toggleBoxLock = (boxId, mode) => {
    const found = State.findBox(boxId);
    if (!found || !found.box.image) return;
    const { box, row } = found;
    const action = mode === 'square' ? 'lock-square' : 'lock-aspect';

    if (box.lock === mode) {
      // A lone aspect-locked group is sized by its cross axis; freeze that
      // extent before the rule goes away so unlocking does not make it jump.
      if (box.lock === 'aspect' && row.boxes.length === 1) {
        preserveGroupExtents();
      }
      // Preserve the current cross-axis sizes when the box becomes resizable.
      const column = isColumnMode();
      const placedRow = layout.rows.find((candidate) => candidate.id === row.id);
      const sizes = placedRow
        ? placedRow.boxes.map((candidate) =>
            column ? candidate.h : candidate.w,
          )
        : [];
      State.setBoxLock(boxId, null);
      if (sizes.length === row.boxes.length) {
        State.setRowWeights(row.id, sizes);
      }
      refresh();
      focusAction(action);
      Render.announce('Box lock released.');
      return;
    }

    const group = isColumnMode() ? 'column' : 'row';
    if (!State.canLockBox(boxId)) {
      Render.announce(`At least one box in a ${group} must stay unlocked.`);
      return;
    }

    if (mode === 'aspect' && !State.canAspectLock(boxId)) {
      Render.announce(
        `Aspect locks in a ${group} must use the same image ratio.`,
      );
      return;
    }

    let ratio = 1;
    if (mode === 'aspect') {
      if (!box.image.width || !box.image.height) return;
      ratio = box.image.width / box.image.height;
    }

    if (!State.setBoxLock(boxId, mode, ratio)) return;
    refresh();
    focusAction(action);
    Render.announce(
      mode === 'square' ? 'Square lock on.' : 'Aspect ratio lock on.',
    );
  };

  const handlePickedFile = async (file) => {
    const boxId = pickerBoxId;
    pickerBoxId = null;
    if (!file || !boxId) return;

    Render.announce('Opening image…');
    try {
      const image = await Images.load(file);
      if (!State.setImage(boxId, image)) {
        Render.toast('That box no longer exists.', true);
        return;
      }
      refresh();
      Render.focusBox(boxId);
      Render.announce(`Image added to photo box ${boxNumber(boxId)}.`);
    } catch (error) {
      // The box keeps whatever it showed before; only the toast changes.
      Render.toast(error.message, true);
    } finally {
      fileInput.value = '';
    }
  };

  const saveMenuItems = () =>
    Array.from(saveMenu.querySelectorAll('[role="menuitem"]'));

  const openSaveMenu = (focusLast = false) => {
    if (saveMenuOpen || saveButton.disabled) return;
    closeBorderMenu();
    saveMenuOpen = true;
    saveMenu.hidden = false;
    saveButton.setAttribute('aria-expanded', 'true');
    const items = saveMenuItems();
    const item = focusLast ? items[items.length - 1] : items[0];
    if (item) item.focus({ preventScroll: true });
  };

  const closeSaveMenu = (restoreFocus = false) => {
    if (!saveMenuOpen) return;
    saveMenuOpen = false;
    saveMenu.hidden = true;
    saveButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) saveButton.focus({ preventScroll: true });
  };

  const openBorderMenu = () => {
    if (borderMenuOpen) return;
    closeSaveMenu();
    borderMenuOpen = true;
    borderMenu.hidden = false;
    borderButton.setAttribute('aria-expanded', 'true');
    borderRange.focus({ preventScroll: true });
  };

  const closeBorderMenu = (restoreFocus = false) => {
    if (!borderMenuOpen) return;
    borderMenuOpen = false;
    borderMenu.hidden = true;
    borderButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) borderButton.focus({ preventScroll: true });
  };

  const saveCollage = async (format) => {
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
    Render.announce(
      `Saving collage as ${format === 'jpeg' ? 'JPEG' : 'PNG'}…`,
    );

    try {
      const filename = await Export.save(State, format);
      Render.toast(`Saved ${filename}.`);
    } catch (error) {
      Render.toast(error.message || 'The collage could not be saved.', true);
    } finally {
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
    }
  };

  const addRow = (position) => {
    State.addRow(position);
    refresh();
    if (isColumnMode()) {
      Render.announce(
        position === 'start'
          ? 'Column added at the left.'
          : 'Column added at the right.',
      );
    } else {
      Render.announce(
        position === 'start'
          ? 'Row added at the top.'
          : 'Row added at the bottom.',
      );
    }
  };

  const moveSelection = (key) => {
    const boxes = State.orderedBoxes();
    if (boxes.length === 0) return;

    const currentIndex = boxes.findIndex((box) => box.id === State.selectedBoxId);
    if (currentIndex === -1) {
      selectAndFocus(boxes[0].id);
      return;
    }

    const current = State.findBox(boxes[currentIndex].id);
    if (!current) return;

    // The arrows follow the screen: in row mode left/right walk along a row,
    // in column mode up/down walk along a column. The other pair moves to the
    // neighboring group at the same box position.
    const column = isColumnMode();
    const alongGroup = column
      ? key === 'ArrowUp' || key === 'ArrowDown'
      : key === 'ArrowLeft' || key === 'ArrowRight';
    let target = null;

    if (alongGroup) {
      const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
      target = boxes[currentIndex + step] || null;
    } else {
      const step = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1;
      const groupIndex = State.rows.indexOf(current.row);
      const nextGroup = State.rows[groupIndex + step];
      if (nextGroup) {
        target =
          nextGroup.boxes[Math.min(current.index, nextGroup.boxes.length - 1)];
      }
    }

    if (target) selectAndFocus(target.id);
  };

  const isTextEntry = (target) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

  const fitCanvas = () => {
    fitFrame = 0;
    const column = isColumnMode();
    const areaStyle = getComputedStyle(editorArea);
    const stageStyle = getComputedStyle(stage);
    const lineStyle = getComputedStyle(stage.querySelector('.canvas-line'));

    const availableW =
      editorArea.clientWidth -
      parseFloat(areaStyle.paddingLeft) -
      parseFloat(areaStyle.paddingRight);
    const availableH =
      editorArea.clientHeight -
      parseFloat(areaStyle.paddingTop) -
      parseFloat(areaStyle.paddingBottom);
    // The stage and the canvas line are the same two flex rows/columns in both
    // modes, but their main axes swap, so the relevant gaps swap as well.
    const stageGap =
      parseFloat(column ? stageStyle.columnGap : stageStyle.rowGap) || 0;
    const lineGap =
      parseFloat(column ? lineStyle.rowGap : lineStyle.columnGap) || 0;

    const chromeW = column
      ? addRowTop.offsetWidth + addRowBottom.offsetWidth + stageGap * 2
      : railLeft.offsetWidth + railRight.offsetWidth + lineGap * 2;
    const chromeH = column
      ? railLeft.offsetHeight + railRight.offsetHeight + lineGap * 2
      : addRowTop.offsetHeight + addRowBottom.offsetHeight + stageGap * 2;

    const scale = Math.max(
      0.05,
      Math.min(
        1,
        (availableW - chromeW) / Layout.canvasW,
        (availableH - chromeH) / Layout.canvasH,
      ),
    );

    stage.style.setProperty('--scale', String(scale));
  };

  const queueFit = () => {
    if (fitFrame) return;
    fitFrame = requestAnimationFrame(fitCanvas);
  };

  /**
   * Start the editor with the chosen format. The canvas keeps its logical
   * pixel size; only the CSS variables and the scale change, so the same
   * weight-based layout reflows into the new shape.
   */
  const chooseFormat = (format) => {
    if (editing) return;
    editing = true;

    Layout.setCanvasSize(format.canvasW, format.canvasH);
    document.documentElement.style.setProperty('--canvas-w', `${format.canvasW}px`);
    document.documentElement.style.setProperty('--canvas-h', `${format.canvasH}px`);

    // Portrait and square formats start with rows; landscape formats start
    // with the transposed columns. The starting canvas is empty, so no
    // structure turn is needed.
    State.setOrientation(
      format.canvasW > format.canvasH ? 'column' : 'row',
      false,
    );

    formatScreen.hidden = true;
    stage.hidden = false;
    actionBar.hidden = false;

    refresh();
    fitCanvas();
    Render.focusCanvas();
    Render.announce(
      `${format.label}${format.name ? ` ${format.name}` : ''} format selected, ${format.canvasW} by ${format.canvasH} pixels.`,
    );
  };

  const canvasScale = () => {
    const width = canvas.getBoundingClientRect().width;
    return width > 0 ? width / Layout.canvasW : 1;
  };

  /** Grab distance in logical canvas pixels for a boundary band. */
  const boundaryTolerance = (event, scale, mouseHit, touchHit) => {
    const screenHit = event.pointerType === 'touch' ? touchHit : mouseHit;
    return screenHit / (scale || 1);
  };

  /**
   * Capture only once a gesture actually starts dragging. Capturing on
   * pointerdown would retarget the click to the canvas, so a tap on a photo
   * near a boundary could no longer select it or open the picker.
   */
  const capturePointer = (pointerId) => {
    try {
      canvas.setPointerCapture(pointerId);
    } catch {
      // Pointer capture is best-effort; synthetic tests and old browsers may
      // not have an active pointer to capture.
    }
  };

  /** The selected box's live state plus the geometry it was last laid out at. */
  const selectedTarget = () => {
    if (!State.selectedBoxId) return null;
    const found = State.findBox(State.selectedBoxId);
    if (!found || !found.box.image) return null;
    const layoutRow = layout.rows.find((row) => row.id === found.row.id);
    const layoutBox =
      layoutRow && layoutRow.boxes.find((box) => box.id === found.box.id);
    return layoutRow && layoutBox
      ? { layoutRow, layoutBox, box: found.box }
      : null;
  };

  /** How far the photo can move inside its box, in logical pixels. */
  const panSlack = (box, layoutBox) => {
    const rect = Layout.imageRect(
      box.image,
      layoutBox.w,
      layoutBox.h,
      box.zoom,
      0,
      0,
      box.rotation,
    );
    if (!rect) return { x: 0, y: 0 };
    return { x: rect.slackX, y: rect.slackY };
  };

  /** The zoom boundaries for the selected photo at its current rotation. */
  const zoomRangeFor = (target) =>
    Layout.zoomRange(
      target.box.image,
      target.layoutBox.w,
      target.layoutBox.h,
      target.box.rotation,
    );

  /**
   * Rotation changes the cover scale and the fit limit, so keep the stored zoom
   * inside the new range. The layout clamps for display too, but syncing the
   * state keeps the slider value and announcements honest.
   */
  const clampZoomToRange = (boxId) => {
    const found = State.findBox(boxId);
    const target = selectedTarget();
    if (!found || !target || target.box.id !== boxId) return;
    if (found.box.lock === 'aspect') return;
    const range = zoomRangeFor(target);
    if (found.box.zoom < range.min) State.setBoxZoom(boxId, range.min);
    else if (found.box.zoom > range.max) State.setBoxZoom(boxId, range.max);
  };

  const startPanDrag = (event) => {
    if (
      panDrag ||
      zoomDrag ||
      rotateDrag ||
      rowDrag ||
      boxDrag ||
      event.button !== 0
    ) {
      return;
    }
    const element = event.target instanceof Element ? event.target : null;
    if (!element) return;

    // The selected photo can be grabbed directly, or anywhere on the canvas
    // background — which is where the ghost of the full photo is visible.
    const boxElement = element.closest('.box');
    if (boxElement) {
      if (boxElement.dataset.boxId !== State.selectedBoxId) return;
    } else if (!State.selectedBoxId || !element.closest('.canvas')) {
      return;
    }

    const found = State.findBox(State.selectedBoxId);
    if (!found || !found.box.image) return;

    const target = selectedTarget();
    if (!target) return;
    const slack = panSlack(found.box, target.layoutBox);
    if (slack.x <= 0 && slack.y <= 0) return;

    panDrag = {
      pointerId: event.pointerId,
      boxId: found.box.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: found.box.offsetX,
      startOffsetY: found.box.offsetY,
      slack,
      moved: false,
    };
  };

  const movePanDrag = (event) => {
    if (!panDrag || event.pointerId !== panDrag.pointerId) return;

    const dx = event.clientX - panDrag.startClientX;
    const dy = event.clientY - panDrag.startClientY;
    if (!panDrag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      panDrag.moved = true;
      capturePointer(event.pointerId);
    }

    const scale = canvasScale();
    const offsetX = panDrag.slack.x
      ? panDrag.startOffsetX + dx / scale / panDrag.slack.x
      : panDrag.startOffsetX;
    const offsetY = panDrag.slack.y
      ? panDrag.startOffsetY + dy / scale / panDrag.slack.y
      : panDrag.startOffsetY;

    if (!State.setBoxPan(panDrag.boxId, offsetX, offsetY)) return;
    Render.updatePhoto();
  };

  const finishPanDrag = (event) => {
    if (!panDrag || event.pointerId !== panDrag.pointerId) return;

    const moved = panDrag.moved;
    panDrag = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }
    if (moved) ignoreCanvasClickUntil = performance.now() + 300;
  };

  const centerClient = (target) => {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? rect.width / Layout.canvasW : 1;
    return {
      x:
        rect.left +
        (target.layoutRow.x + target.layoutBox.x + target.layoutBox.w / 2) *
          scale,
      y:
        rect.top +
        (target.layoutRow.y + target.layoutBox.y + target.layoutBox.h / 2) *
          scale,
    };
  };

  const startZoomDrag = (event) => {
    if (
      zoomDrag ||
      rotateDrag ||
      rowDrag ||
      boxDrag ||
      panDrag ||
      event.button !== 0
    ) {
      return;
    }
    const target = selectedTarget();
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    zoomHandle.focus({ preventScroll: true });
    try {
      zoomHandle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; synthetic tests and old browsers may
      // not have an active pointer to capture.
    }

    const center = centerClient(target);
    const range = zoomRangeFor(target);
    zoomDrag = {
      pointerId: event.pointerId,
      boxId: target.box.id,
      centerX: center.x,
      centerY: center.y,
      startDistance: Math.max(
        1,
        Math.hypot(event.clientX - center.x, event.clientY - center.y),
      ),
      startZoom: Math.min(range.max, Math.max(range.min, target.box.zoom)),
      minZoom: range.min,
      maxZoom: range.max,
      moved: false,
    };
  };

  const moveZoomDrag = (event) => {
    if (!zoomDrag || event.pointerId !== zoomDrag.pointerId) return;
    event.stopPropagation();

    // Dragging the corner away from the box centre scales the photo by the
    // distance ratio, so the gesture feels the same at every zoom level.
    const distance = Math.hypot(
      event.clientX - zoomDrag.centerX,
      event.clientY - zoomDrag.centerY,
    );
    const zoom = Math.min(
      zoomDrag.maxZoom,
      Math.max(
        zoomDrag.minZoom,
        zoomDrag.startZoom * (distance / zoomDrag.startDistance),
      ),
    );
    if (!zoomDrag.moved) {
      if (Math.abs(zoom - zoomDrag.startZoom) < 0.02) return;
      zoomDrag.moved = true;
    }

    if (!State.setBoxZoom(zoomDrag.boxId, zoom)) return;
    Render.updatePhoto();
  };

  const finishZoomDrag = (event) => {
    if (!zoomDrag || event.pointerId !== zoomDrag.pointerId) return;

    const moved = zoomDrag.moved;
    const found = State.findBox(zoomDrag.boxId);
    const zoom = found ? found.box.zoom : 1;
    zoomDrag = null;
    try {
      zoomHandle.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }
    if (moved && event.type === 'pointerup') {
      Render.announce(`Photo zoom ${Math.round(zoom * 100)} percent.`);
    }
  };

  const nudgeZoom = (amount) => {
    const target = selectedTarget();
    if (!target) return;
    const range = zoomRangeFor(target);
    const current = Math.min(range.max, Math.max(range.min, target.box.zoom));
    const next = Math.min(range.max, Math.max(range.min, current + amount));
    if (next === current) return;
    if (!State.setBoxZoom(target.box.id, next)) return;
    Render.updatePhoto();
    Render.announce(`Photo zoom ${Math.round(next * 100)} percent.`);
  };

  const resetZoom = () => {
    const target = selectedTarget();
    if (!target) return;
    if (!State.setBoxZoom(target.box.id, 1)) return;
    Render.updatePhoto();
    Render.announce('Photo zoom reset.');
  };

  const pointerAngle = (event, center) =>
    (Math.atan2(event.clientY - center.y, event.clientX - center.x) * 180) /
    Math.PI;

  const startRotateDrag = (event) => {
    if (
      rotateDrag ||
      zoomDrag ||
      panDrag ||
      rowDrag ||
      boxDrag ||
      event.button !== 0
    ) {
      return;
    }
    const target = selectedTarget();
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    rotateHandle.focus({ preventScroll: true });
    try {
      rotateHandle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; synthetic tests and old browsers may
      // not have an active pointer to capture.
    }

    const center = centerClient(target);
    rotateDrag = {
      pointerId: event.pointerId,
      boxId: target.box.id,
      center,
      startAngle: pointerAngle(event, center),
      startRotation: target.box.rotation,
      moved: false,
    };
  };

  const moveRotateDrag = (event) => {
    if (!rotateDrag || event.pointerId !== rotateDrag.pointerId) return;
    event.stopPropagation();

    let delta = pointerAngle(event, rotateDrag.center) - rotateDrag.startAngle;
    if (delta > 180) delta -= 360;
    else if (delta <= -180) delta += 360;

    if (!rotateDrag.moved) {
      if (Math.abs(delta) < 0.5) return;
      rotateDrag.moved = true;
    }

    const rotation = rotateDrag.startRotation + delta;
    if (!State.setBoxRotation(rotateDrag.boxId, rotation)) return;
    clampZoomToRange(rotateDrag.boxId);
    Render.updatePhoto();
  };

  const finishRotateDrag = (event) => {
    if (!rotateDrag || event.pointerId !== rotateDrag.pointerId) return;

    const moved = rotateDrag.moved;
    const found = State.findBox(rotateDrag.boxId);
    const rotation = found ? found.box.rotation : 0;
    rotateDrag = null;
    try {
      rotateHandle.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }
    if (moved && event.type === 'pointerup') {
      Render.announce(`Photo rotation ${Math.round(rotation)} degrees.`);
    }
  };

  const nudgeRotation = (amount) => {
    const target = selectedTarget();
    if (!target) return;
    if (!State.setBoxRotation(target.box.id, target.box.rotation + amount)) {
      return;
    }
    clampZoomToRange(target.box.id);
    Render.updatePhoto();
    Render.announce(
      `Photo rotation ${Math.round(target.box.rotation)} degrees.`,
    );
  };

  const resetRotation = () => {
    const target = selectedTarget();
    if (!target) return;
    if (!State.setBoxRotation(target.box.id, 0)) return;
    clampZoomToRange(target.box.id);
    Render.updatePhoto();
    Render.announce('Photo rotation reset.');
  };

  const groupExtentLocked = (layoutRow) =>
    layoutRow.boxes.length === 1 && layoutRow.boxes[0].locked;

  /**
   * Boundary between two groups: horizontal between rows, vertical between
   * columns. Both the hit test and the drag work along the group flow axis.
   */
  const groupBoundaryAt = (event) => {
    // The photo handles own their corners; never start a resize underneath one.
    if (event.target instanceof Element && event.target.closest('.zoom-handle')) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? rect.width / Layout.canvasW : 1;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const column = isColumnMode();
    const reach = boundaryTolerance(
      event,
      scale,
      GROUP_HANDLE_HIT,
      GROUP_HANDLE_HIT_TOUCH,
    );

    let nearest = null;
    for (let index = 0; index < layout.rows.length - 1; index += 1) {
      const first = layout.rows[index];
      const second = layout.rows[index + 1];
      if (groupExtentLocked(first) || groupExtentLocked(second)) continue;

      const boundary = column ? first.x + first.w : first.y + first.h;
      const extentA = column ? first.w : first.h;
      const extentB = column ? second.w : second.h;
      // Keep the touch band from swallowing a whole short group.
      const tolerance = Math.min(reach, Math.min(extentA, extentB) / 2);
      const distance = Math.abs((column ? x : y) - boundary);
      if (distance <= tolerance && (!nearest || distance < nearest.distance)) {
        nearest = {
          a: first,
          b: second,
          boundary,
          distance,
          axis: column ? 'x' : 'y',
          startA: extentA,
          startB: extentB,
        };
      }
    }
    return nearest;
  };

  /**
   * Boundary between two boxes in the same group: vertical in a row, horizontal
   * in a column. The hit band and the drag both run across the group.
   */
  const boxBoundaryAt = (event) => {
    // The photo handles own their corners; never start a resize underneath one.
    if (event.target instanceof Element && event.target.closest('.zoom-handle')) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? rect.width / Layout.canvasW : 1;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const column = isColumnMode();
    const reach = boundaryTolerance(
      event,
      scale,
      BOX_HANDLE_HIT,
      BOX_HANDLE_HIT_TOUCH,
    );

    let nearest = null;
    for (const row of layout.rows) {
      if (row.boxes.length < 2) continue;
      const first = row.boxes[0];

      if (!column) {
        const boxTop = row.y + first.y;
        const boxBottom = boxTop + first.h;
        if (y < boxTop || y > boxBottom) continue;

        for (let index = 0; index < row.boxes.length - 1; index += 1) {
          const left = row.boxes[index];
          const right = row.boxes[index + 1];
          if (left.locked || right.locked) continue;
          const boundary = row.x + left.x + left.w + layout.gap;
          // Keep the touch band from swallowing a whole narrow box.
          const tolerance = Math.min(reach, Math.min(left.w, right.w) / 2);
          const distance = Math.abs(x - boundary);
          if (distance <= tolerance && (!nearest || distance < nearest.distance)) {
            nearest = {
              group: row,
              a: left,
              b: right,
              axis: 'x',
              boundary,
              start: boxTop,
              extent: first.h,
              startA: left.w,
              startB: right.w,
              distance,
            };
          }
        }
      } else {
        const boxLeft = row.x + first.x;
        const boxRight = boxLeft + first.w;
        if (x < boxLeft || x > boxRight) continue;

        for (let index = 0; index < row.boxes.length - 1; index += 1) {
          const upper = row.boxes[index];
          const lower = row.boxes[index + 1];
          if (upper.locked || lower.locked) continue;
          const boundary = row.y + upper.y + upper.h + layout.gap;
          // Keep the touch band from swallowing a whole short box.
          const tolerance = Math.min(reach, Math.min(upper.h, lower.h) / 2);
          const distance = Math.abs(y - boundary);
          if (distance <= tolerance && (!nearest || distance < nearest.distance)) {
            nearest = {
              group: row,
              a: upper,
              b: lower,
              axis: 'y',
              boundary,
              start: boxLeft,
              extent: first.w,
              startA: upper.h,
              startB: lower.h,
              distance,
            };
          }
        }
      }
    }
    return nearest;
  };

  const updateHover = (event) => {
    const groupHit = groupBoundaryAt(event);
    if (groupHit) {
      Render.hideBoxBoundary();
      Render.setBoxResizeCursor(false);
      Render.showGroupBoundary(groupHit.boundary, groupHit.axis === 'y');
      Render.setGroupResizeCursor(true);
      return;
    }

    const boxHit = boxBoundaryAt(event);
    if (boxHit) {
      Render.hideGroupBoundary();
      Render.setGroupResizeCursor(false);
      Render.showBoxBoundary(boxHit);
      Render.setBoxResizeCursor(true);
      return;
    }

    Render.hideGroupBoundary();
    Render.hideBoxBoundary();
    Render.setGroupResizeCursor(false);
    Render.setBoxResizeCursor(false);
  };

  const startRowDrag = (event) => {
    if (rowDrag || boxDrag || event.button !== 0) return;
    const hit = groupBoundaryAt(event);
    if (!hit) return;

    rowDrag = {
      pointerId: event.pointerId,
      aId: hit.a.id,
      bId: hit.b.id,
      axis: hit.axis,
      startClient: hit.axis === 'x' ? event.clientX : event.clientY,
      startA: hit.startA,
      startB: hit.startB,
      moved: false,
    };

    Render.hideBoxBoundary();
    Render.setBoxResizeCursor(false);
    Render.showGroupBoundary(hit.boundary, hit.axis === 'y');
    Render.setGroupResizeCursor(true);
  };

  const startBoxDrag = (event) => {
    if (rowDrag || boxDrag || event.button !== 0) return;
    const hit = boxBoundaryAt(event);
    if (!hit) return;

    boxDrag = {
      pointerId: event.pointerId,
      groupId: hit.group.id,
      aId: hit.a.id,
      bId: hit.b.id,
      axis: hit.axis,
      startClient: hit.axis === 'x' ? event.clientX : event.clientY,
      startA: hit.startA,
      startB: hit.startB,
      moved: false,
    };

    Render.hideGroupBoundary();
    Render.setGroupResizeCursor(false);
    Render.showBoxBoundary(hit);
    Render.setBoxResizeCursor(true);
  };

  const moveRowDrag = (event) => {
    if (!rowDrag || event.pointerId !== rowDrag.pointerId) return;

    const delta =
      ((rowDrag.axis === 'x' ? event.clientX : event.clientY) -
        rowDrag.startClient) /
      canvasScale();
    if (!rowDrag.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      rowDrag.moved = true;
      capturePointer(event.pointerId);
    }

    const pair = rowDrag.startA + rowDrag.startB;
    // Keep both groups at or above the minimum; if the pair is already too
    // short for two minimums, leave it split evenly.
    const minimum = Math.min(METRICS.minRowH, pair / 2);
    const aSize = Math.max(
      minimum,
      Math.min(pair - minimum, rowDrag.startA + delta),
    );

    if (!State.setRowSplit(rowDrag.aId, rowDrag.bId, aSize / pair)) return;

    layout = Layout.compute(State.rows, State.orientation);
    Render.updateGeometry(layout);

    const first = layout.rows.find((row) => row.id === rowDrag.aId);
    if (first) {
      Render.showGroupBoundary(
        rowDrag.axis === 'x' ? first.x + first.w : first.y + first.h,
        rowDrag.axis === 'y',
      );
    }
  };

  const moveBoxDrag = (event) => {
    if (!boxDrag || event.pointerId !== boxDrag.pointerId) return;

    const delta =
      ((boxDrag.axis === 'x' ? event.clientX : event.clientY) -
        boxDrag.startClient) /
      canvasScale();
    if (!boxDrag.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      boxDrag.moved = true;
      capturePointer(event.pointerId);
    }

    const pair = boxDrag.startA + boxDrag.startB;
    const minimum = Math.min(METRICS.minBoxW, pair / 2);
    const aSize = Math.max(
      minimum,
      Math.min(pair - minimum, boxDrag.startA + delta),
    );

    if (!State.setBoxSplit(boxDrag.aId, boxDrag.bId, aSize / pair)) return;

    layout = Layout.compute(State.rows, State.orientation);
    Render.updateGeometry(layout);

    const group = layout.rows.find((candidate) => candidate.id === boxDrag.groupId);
    const box = group && group.boxes.find((candidate) => candidate.id === boxDrag.aId);
    if (group && box) {
      Render.showBoxBoundary({
        axis: boxDrag.axis,
        boundary:
          boxDrag.axis === 'x'
            ? group.x + box.x + box.w + layout.gap
            : group.y + box.y + box.h + layout.gap,
        start: boxDrag.axis === 'x' ? group.y + box.y : group.x + box.x,
        extent: boxDrag.axis === 'x' ? box.h : box.w,
      });
    }
  };

  const finishRowDrag = (event) => {
    if (!rowDrag || event.pointerId !== rowDrag.pointerId) return;

    const moved = rowDrag.moved;
    rowDrag = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }

    Render.hideGroupBoundary();
    Render.setGroupResizeCursor(false);
    if (event.type === 'pointerup') updateHover(event);
    if (moved) ignoreCanvasClickUntil = performance.now() + 300;
  };

  const finishBoxDrag = (event) => {
    if (!boxDrag || event.pointerId !== boxDrag.pointerId) return;

    const moved = boxDrag.moved;
    boxDrag = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }

    Render.hideBoxBoundary();
    Render.setBoxResizeCursor(false);
    if (event.type === 'pointerup') updateHover(event);
    if (moved) ignoreCanvasClickUntil = performance.now() + 300;
  };

  // --- wiring -------------------------------------------------------------

  saveButton.addEventListener('click', () => {
    if (saveMenuOpen) closeSaveMenu(true);
    else openSaveMenu();
  });

  saveButton.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openSaveMenu(event.key === 'ArrowUp');
    } else if (event.key === 'Escape' && saveMenuOpen) {
      event.preventDefault();
      closeSaveMenu();
    }
  });

  saveMenu.addEventListener('click', (event) => {
    const item = event.target.closest('button[data-format]');
    if (!item) return;
    const format = item.dataset.format === 'jpeg' ? 'jpeg' : 'png';
    closeSaveMenu(true);
    saveCollage(format);
  });

  saveMenu.addEventListener('keydown', (event) => {
    const items = saveMenuItems();
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      closeSaveMenu(true);
      return;
    } else if (event.key === 'Tab') {
      closeSaveMenu();
      return;
    } else {
      return;
    }

    event.preventDefault();
    items[next].focus({ preventScroll: true });
  });

  document.addEventListener('pointerdown', (event) => {
    if (saveMenuOpen && !saveMenuWrap.contains(event.target)) closeSaveMenu();
    if (borderMenuOpen && !borderMenuWrap.contains(event.target)) {
      closeBorderMenu();
    }
  });

  borderButton.addEventListener('click', () => {
    if (borderMenuOpen) closeBorderMenu(true);
    else openBorderMenu();
  });

  borderMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeBorderMenu(true);
    }
  });

  // Tabbing out of the popover closes it, so the slider never stays open
  // while focus is on a control elsewhere in the action bar.
  borderMenuWrap.addEventListener('focusout', (event) => {
    if (!borderMenuWrap.contains(event.relatedTarget)) closeBorderMenu();
  });

  borderRange.addEventListener('input', () => {
    if (!State.setBorderThickness(Number(borderRange.value))) return;
    queueBorderRefresh();
  });

  borderRange.addEventListener('change', () => {
    Render.announce(`Border thickness ${State.borderThickness} pixels.`);
  });

  marginColorButton.addEventListener('click', () => {
    try {
      if (typeof marginColorInput.showPicker === 'function') {
        marginColorInput.showPicker();
      } else {
        marginColorInput.click();
      }
    } catch {
      marginColorInput.click();
    }
  });

  marginColorInput.addEventListener('input', () => {
    if (State.setCanvasColor(marginColorInput.value)) applyCanvasColor();
  });

  marginColorInput.addEventListener('change', () => {
    Render.announce(`Margin color set to ${State.canvasColor}.`);
  });

  addRowTop.addEventListener('click', () => addRow('start'));
  addRowBottom.addEventListener('click', () => addRow('end'));

  const handlesAddBox = (event) => {
    const button = event.target.closest('button[data-action="add-box"]');
    if (!button) return;
    const rail = button.closest('.row-rail');
    const rowId = button.dataset.rowId;
    const rowIndex = State.rows.findIndex((row) => row.id === rowId);
    const row = State.rows.find((candidate) => candidate.id === rowId);
    if (row && row.boxes.length === 1 && row.boxes[0].lock === 'aspect') {
      preserveGroupExtents();
    }
    if (!State.addBox(rowId)) return;
    refresh();
    // Keep keyboard focus on the group's add button after the rails re-render.
    const rebuilt = rail && rail.querySelector(`[data-row-id="${rowId}"]`);
    if (rebuilt) rebuilt.focus({ preventScroll: true });
    Render.announce(
      `Image box added to ${isColumnMode() ? 'column' : 'row'} ${rowIndex + 1}.`,
    );
  };

  railLeft.addEventListener('click', handlesAddBox);
  railRight.addEventListener('click', handlesAddBox);

  canvas.addEventListener('click', (event) => {
    if (performance.now() < ignoreCanvasClickUntil) return;
    if (event.target.closest('.zoom-handle')) return;

    const box = event.target.closest('.box');
    if (box) {
      const boxId = box.dataset.boxId;
      if (State.selectedBoxId !== boxId && State.select(boxId)) {
        Render.paintSelection(State);
        Render.announce(`Photo box ${boxNumber(boxId)} selected.`);
      }
      return;
    }
    deselect();
  });

  canvas.addEventListener('pointerdown', startRowDrag);
  canvas.addEventListener('pointerdown', startBoxDrag);
  canvas.addEventListener('pointerdown', startPanDrag);

  canvas.addEventListener('pointermove', (event) => {
    if (panDrag) movePanDrag(event);
    else if (rowDrag) moveRowDrag(event);
    else if (boxDrag) moveBoxDrag(event);
    else updateHover(event);
  });

  canvas.addEventListener('pointerup', finishRowDrag);
  canvas.addEventListener('pointerup', finishBoxDrag);
  canvas.addEventListener('pointerup', finishPanDrag);
  canvas.addEventListener('pointercancel', finishRowDrag);
  canvas.addEventListener('pointercancel', finishBoxDrag);
  canvas.addEventListener('pointercancel', finishPanDrag);

  zoomHandle.addEventListener('pointerdown', startZoomDrag);
  zoomHandle.addEventListener('pointermove', moveZoomDrag);
  zoomHandle.addEventListener('pointerup', finishZoomDrag);
  zoomHandle.addEventListener('pointercancel', finishZoomDrag);

  zoomHandle.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') nudgeZoom(0.1);
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') nudgeZoom(-0.1);
    else if (event.key === 'Home') resetZoom();
    else return;
    event.preventDefault();
  });

  rotateHandle.addEventListener('pointerdown', startRotateDrag);
  rotateHandle.addEventListener('pointermove', moveRotateDrag);
  rotateHandle.addEventListener('pointerup', finishRotateDrag);
  rotateHandle.addEventListener('pointercancel', finishRotateDrag);

  rotateHandle.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 15 : 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      nudgeRotation(step);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      nudgeRotation(-step);
    } else if (event.key === 'Home') {
      resetRotation();
    } else {
      return;
    }
    event.preventDefault();
  });

  canvas.addEventListener('pointerleave', () => {
    if (rowDrag || boxDrag || panDrag) return;
    Render.hideGroupBoundary();
    Render.hideBoxBoundary();
    Render.setGroupResizeCursor(false);
    Render.setBoxResizeCursor(false);
  });

  orientationButton.addEventListener('click', () => {
    const next = isColumnMode() ? 'row' : 'column';
    freezeLayoutProportions();
    State.setOrientation(next, true);
    // The turn is a structural change; keep the zoom/rotate chrome from
    // following the box into the new layout.
    State.clearSelection();
    refresh();
    // The rails move to the other sides of the canvas, so the available space
    // and therefore the canvas scale can change.
    fitCanvas();
    const count = State.rows.length;
    Render.announce(
      next === 'column'
        ? `Column layout. ${count} column${count === 1 ? '' : 's'}.`
        : `Row layout. ${count} row${count === 1 ? '' : 's'}.`,
    );
  });

  actionBar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const boxId = State.selectedBoxId;
    if (!boxId) return;

    if (button.dataset.action === 'delete-box') deleteSelected();
    else if (button.dataset.action === 'select-image') openPicker(boxId);
    else if (button.dataset.action === 'lock-square') toggleBoxLock(boxId, 'square');
    else if (button.dataset.action === 'lock-aspect') toggleBoxLock(boxId, 'aspect');
  });

  rowsLayer.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const box = event.target.closest('.box');
    if (!box) return;
    event.preventDefault();
    selectAndFocus(box.dataset.boxId);
    openPicker(box.dataset.boxId);
  });

  rowsLayer.addEventListener('dblclick', (event) => {
    const box = event.target.closest('.box');
    if (!box) return;
    event.preventDefault();
    selectAndFocus(box.dataset.boxId);
    openPicker(box.dataset.boxId);
  });

  editorArea.addEventListener('click', (event) => {
    if (performance.now() < ignoreCanvasClickUntil) return;
    if (
      event.target.closest('.canvas') ||
      event.target.closest('.rotate-handle') ||
      event.target.closest('button')
    ) {
      return;
    }
    deselect();
  });

  fileInput.addEventListener('change', () => {
    handlePickedFile(fileInput.files && fileInput.files[0]);
  });

  document.addEventListener('keydown', (event) => {
    if (!editing || event.defaultPrevented || isTextEntry(event.target)) return;

    if (event.key === 'Escape') {
      if (State.selectedBoxId) {
        event.preventDefault();
        deselect();
      }
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && State.selectedBoxId) {
      event.preventDefault();
      deleteSelected();
      return;
    }

    if (event.key.startsWith('Arrow') && State.boxCount > 0) {
      event.preventDefault();
      moveSelection(event.key);
    }
  });

  new ResizeObserver(queueFit).observe(editorArea);
  window.addEventListener('resize', queueFit);

  Render.init();
  applyCanvasColor();
  applyBorderThickness();
  Render.paintFormats(FORMATS, chooseFormat);
  refresh();

  const firstFormat = document.querySelector('#format-options .format-button');
  if (firstFormat) firstFormat.focus({ preventScroll: true });
})();
