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
  const marginColorButton = document.getElementById('margin-color-button');
  const marginColorInput = document.getElementById('margin-color-input');
  const rowsLayer = document.getElementById('rows');
  const fileInput = document.getElementById('file-input');

  let pickerBoxId = null;
  let fitFrame = 0;
  let layout = Layout.compute(State.rows);
  let rowDrag = null;
  let boxDrag = null;
  let ignoreCanvasClickUntil = 0;

  const ROW_HANDLE_HIT = 6;
  const BOX_HANDLE_HIT = 6;
  const DRAG_THRESHOLD = 3;

  const refresh = () => {
    layout = Layout.compute(State.rows);
    Render.paint(State, layout);
  };

  const applyCanvasColor = () => {
    document.documentElement.style.setProperty('--canvas-bg', State.canvasColor);
    marginColorInput.value = State.canvasColor;
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
      // Preserve the current widths when the box becomes resizable again.
      const placedRow = layout.rows.find((candidate) => candidate.id === row.id);
      const widths = placedRow
        ? placedRow.boxes.map((candidate) => candidate.w)
        : [];
      State.setBoxLock(boxId, null);
      if (widths.length === row.boxes.length) {
        State.setRowWeights(row.id, widths);
      }
      refresh();
      focusAction(action);
      Render.announce('Box lock released.');
      return;
    }

    if (!State.canLockBox(boxId)) {
      Render.announce('At least one box in a row must stay unlocked.');
      return;
    }

    if (mode === 'aspect' && !State.canAspectLock(boxId)) {
      Render.announce('Aspect locks in a row must use the same image ratio.');
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

  const saveCollage = async () => {
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
    Render.announce('Saving collage as PNG…');

    try {
      const filename = await Export.save(State);
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
    Render.announce(position === 'start' ? 'Row added at the top.' : 'Row added at the bottom.');
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
    const direction = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;
    let target = null;

    if (direction === 0) {
      target = boxes[currentIndex + (key === 'ArrowRight' ? 1 : -1)] || null;
    } else if (current) {
      const rowIndex = State.rows.indexOf(current.row);
      const nextRow = State.rows[rowIndex + direction];
      if (nextRow) {
        target = nextRow.boxes[Math.min(current.index, nextRow.boxes.length - 1)];
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
    const stageGap = parseFloat(stageStyle.rowGap) || 0;
    const lineGap = parseFloat(lineStyle.columnGap) || 0;

    const chromeW = railLeft.offsetWidth + railRight.offsetWidth + lineGap * 2;
    const chromeH = addRowTop.offsetHeight + addRowBottom.offsetHeight + stageGap * 2;

    const scale = Math.max(
      0.05,
      Math.min(
        1,
        (availableW - chromeW) / METRICS.canvasW,
        (availableH - chromeH) / METRICS.canvasH,
      ),
    );

    stage.style.setProperty('--scale', String(scale));
  };

  const queueFit = () => {
    if (fitFrame) return;
    fitFrame = requestAnimationFrame(fitCanvas);
  };

  const canvasScale = () => {
    const width = canvas.getBoundingClientRect().width;
    return width > 0 ? width / METRICS.canvasW : 1;
  };

  const rowHeightLocked = (layoutRow) =>
    layoutRow.boxes.length === 1 && layoutRow.boxes[0].locked;

  const rowBoundaryAt = (event) => {
    if (event.target instanceof Element && event.target.closest('.box')) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? rect.width / METRICS.canvasW : 1;
    const y = (event.clientY - rect.top) / scale;

    for (let index = 0; index < layout.rows.length - 1; index += 1) {
      const upper = layout.rows[index];
      const lower = layout.rows[index + 1];
      if (rowHeightLocked(upper) || rowHeightLocked(lower)) continue;

      const boundary = upper.y + upper.h;
      if (Math.abs(y - boundary) <= ROW_HANDLE_HIT) {
        return { upper, lower, boundary };
      }
    }
    return null;
  };

  const boxBoundaryAt = (event) => {
    if (event.target instanceof Element && event.target.closest('.box')) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? rect.width / METRICS.canvasW : 1;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    for (const row of layout.rows) {
      if (row.boxes.length < 2) continue;
      const first = row.boxes[0];
      const boxTop = row.y + first.y;
      const boxBottom = boxTop + first.h;
      if (y < boxTop || y > boxBottom) continue;

      for (let index = 0; index < row.boxes.length - 1; index += 1) {
        const left = row.boxes[index];
        const right = row.boxes[index + 1];
        if (left.locked || right.locked) continue;
        const boundary = left.x + left.w + METRICS.gap;
        if (Math.abs(x - boundary) <= BOX_HANDLE_HIT) {
          return { row, left, right, boundary, top: boxTop, height: first.h };
        }
      }
    }
    return null;
  };

  const updateHover = (event) => {
    const rowHit = rowBoundaryAt(event);
    if (rowHit) {
      Render.hideBoxBoundary();
      Render.setBoxResizeCursor(false);
      Render.showRowBoundary(rowHit.boundary);
      Render.setRowResizeCursor(true);
      return;
    }

    const boxHit = boxBoundaryAt(event);
    if (boxHit) {
      Render.hideRowBoundary();
      Render.setRowResizeCursor(false);
      Render.showBoxBoundary(boxHit.boundary, boxHit.top, boxHit.height);
      Render.setBoxResizeCursor(true);
      return;
    }

    Render.hideRowBoundary();
    Render.hideBoxBoundary();
    Render.setRowResizeCursor(false);
    Render.setBoxResizeCursor(false);
  };

  const startRowDrag = (event) => {
    if (rowDrag || boxDrag || event.button !== 0) return;
    const hit = rowBoundaryAt(event);
    if (!hit) return;

    event.preventDefault();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; synthetic tests and old browsers may
      // not have an active pointer to capture.
    }

    rowDrag = {
      pointerId: event.pointerId,
      upperId: hit.upper.id,
      lowerId: hit.lower.id,
      startClientY: event.clientY,
      startUpperH: hit.upper.h,
      startLowerH: hit.lower.h,
      moved: false,
    };

    Render.hideBoxBoundary();
    Render.setBoxResizeCursor(false);
    Render.showRowBoundary(hit.boundary);
    Render.setRowResizeCursor(true);
  };

  const startBoxDrag = (event) => {
    if (rowDrag || boxDrag || event.button !== 0) return;
    const hit = boxBoundaryAt(event);
    if (!hit) return;

    event.preventDefault();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; synthetic tests and older browsers may
      // not have an active pointer to capture.
    }

    boxDrag = {
      pointerId: event.pointerId,
      rowId: hit.row.id,
      leftId: hit.left.id,
      rightId: hit.right.id,
      startClientX: event.clientX,
      startLeftW: hit.left.w,
      startRightW: hit.right.w,
      moved: false,
    };

    Render.hideRowBoundary();
    Render.setRowResizeCursor(false);
    Render.showBoxBoundary(hit.boundary, hit.top, hit.height);
    Render.setBoxResizeCursor(true);
  };

  const moveRowDrag = (event) => {
    if (!rowDrag || event.pointerId !== rowDrag.pointerId) return;

    const dy = event.clientY - rowDrag.startClientY;
    if (!rowDrag.moved) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      rowDrag.moved = true;
    }

    const pairH = rowDrag.startUpperH + rowDrag.startLowerH;
    // Keep both rows at or above the minimum; if the pair is already too
    // short for two minimums, leave it split evenly.
    const minH = Math.min(METRICS.minRowH, pairH / 2);
    const upperH = Math.max(
      minH,
      Math.min(pairH - minH, rowDrag.startUpperH + dy / canvasScale()),
    );

    if (!State.setRowSplit(rowDrag.upperId, rowDrag.lowerId, upperH / pairH)) return;

    layout = Layout.compute(State.rows);
    Render.updateGeometry(layout);

    const upper = layout.rows.find((row) => row.id === rowDrag.upperId);
    if (upper) Render.showRowBoundary(upper.y + upper.h);
  };

  const moveBoxDrag = (event) => {
    if (!boxDrag || event.pointerId !== boxDrag.pointerId) return;

    const dx = event.clientX - boxDrag.startClientX;
    if (!boxDrag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      boxDrag.moved = true;
    }

    const pairW = boxDrag.startLeftW + boxDrag.startRightW;
    const minW = Math.min(METRICS.minBoxW, pairW / 2);
    const leftW = Math.max(
      minW,
      Math.min(pairW - minW, boxDrag.startLeftW + dx / canvasScale()),
    );

    if (!State.setBoxSplit(boxDrag.leftId, boxDrag.rightId, leftW / pairW)) return;

    layout = Layout.compute(State.rows);
    Render.updateGeometry(layout);

    const row = layout.rows.find((candidate) => candidate.id === boxDrag.rowId);
    const left = row && row.boxes.find((box) => box.id === boxDrag.leftId);
    if (row && left) {
      Render.showBoxBoundary(left.x + left.w + METRICS.gap, row.y + left.y, left.h);
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

    Render.hideRowBoundary();
    Render.setRowResizeCursor(false);
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
    if (!State.addBox(rowId)) return;
    refresh();
    // Keep keyboard focus on the row's add button after the rails re-render.
    const rebuilt = rail && rail.querySelector(`[data-row-id="${rowId}"]`);
    if (rebuilt) rebuilt.focus({ preventScroll: true });
    Render.announce(`Image box added to row ${rowIndex + 1}.`);
  };

  railLeft.addEventListener('click', handlesAddBox);
  railRight.addEventListener('click', handlesAddBox);

  canvas.addEventListener('click', (event) => {
    if (performance.now() < ignoreCanvasClickUntil) return;

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

  canvas.addEventListener('pointermove', (event) => {
    if (rowDrag) moveRowDrag(event);
    else if (boxDrag) moveBoxDrag(event);
    else updateHover(event);
  });

  canvas.addEventListener('pointerup', finishRowDrag);
  canvas.addEventListener('pointerup', finishBoxDrag);
  canvas.addEventListener('pointercancel', finishRowDrag);
  canvas.addEventListener('pointercancel', finishBoxDrag);

  canvas.addEventListener('pointerleave', () => {
    if (rowDrag || boxDrag) return;
    Render.hideRowBoundary();
    Render.hideBoxBoundary();
    Render.setRowResizeCursor(false);
    Render.setBoxResizeCursor(false);
  });

  actionBar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    if (button.dataset.action === 'save') {
      saveCollage();
      return;
    }

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
    if (event.target.closest('.canvas') || event.target.closest('button')) return;
    deselect();
  });

  fileInput.addEventListener('change', () => {
    handlePickedFile(fileInput.files && fileInput.files[0]);
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || isTextEntry(event.target)) return;

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
  refresh();
  fitCanvas();
})();
