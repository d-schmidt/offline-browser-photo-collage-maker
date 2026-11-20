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
  const colorMenuWrap = document.getElementById('color-menu-wrap');
  const colorMenu = document.getElementById('color-menu');
  const shuffleSpotsButton = document.getElementById('shuffle-spots');
  const gradientStyleMenu = document.getElementById('gradient-style-menu');
  const gradientMenu = document.getElementById('gradient-menu');
  const gradientTopInput = document.getElementById('gradient-top-input');
  const gradientBottomInput = document.getElementById('gradient-bottom-input');
  const colorPresets = document.getElementById('color-presets');
  const gradientPresets = document.getElementById('gradient-presets');
  const fillMenuWrap = document.getElementById('fill-menu-wrap');
  const fillButton = document.getElementById('fill-button');
  const fillMenu = document.getElementById('fill-menu');
  const fillColorRow = document.getElementById('fill-color-row');
  const fillColorChip = document.getElementById('fill-color-chip');
  const fillColorInput = document.getElementById('fill-color-input');
  const fillOpacity = document.getElementById('fill-opacity');
  const fillOpacityValue = document.getElementById('fill-opacity-value');
  const tintMenuWrap = document.getElementById('tint-menu-wrap');
  const tintButton = document.getElementById('tint-button');
  const tintMenu = document.getElementById('tint-menu');
  const tintColorRow = document.getElementById('tint-color-row');
  const tintColorChip = document.getElementById('tint-color-chip');
  const tintClearRow = document.getElementById('tint-clear-row');
  const tintColorInput = document.getElementById('tint-color-input');
  const rowsLayer = document.getElementById('rows');
  const freeLayer = document.getElementById('free-layer');
  const addFreeButton = document.getElementById('add-free-button');
  const addTextButton = document.getElementById('add-text-button');
  const barAddFreeButton = document.getElementById('bar-add-free-button');
  const barAddTextButton = document.getElementById('bar-add-text-button');
  const fontButton = document.getElementById('font-button');
  const fontMenuWrap = document.getElementById('font-menu-wrap');
  const fontMenu = document.getElementById('font-menu');
  const textColorButton = document.getElementById('text-color-button');
  const textColorMenuWrap = document.getElementById('text-color-menu-wrap');
  const textColorMenu = document.getElementById('text-color-menu');
  const textColorRow = document.getElementById('text-color-row');
  const textColorChip = document.getElementById('text-color-chip');
  const textAlignRow = document.getElementById('text-align-row');
  const textAlignButtons = Array.from(
    textAlignRow.querySelectorAll('[data-text-align]'),
  );
  const textStyleRow = document.getElementById('text-style-row');
  const textStyleButtons = Array.from(
    textStyleRow.querySelectorAll('[data-text-style]'),
  );
  const textOutlineRow = document.getElementById('text-outline-row');
  const textOutlineChip = document.getElementById('text-outline-chip');
  const textOutlineWidth = document.getElementById('text-outline-width');
  const textOutlineWidthValue = document.getElementById(
    'text-outline-width-value',
  );
  const textBackgroundRow = document.getElementById('text-background-row');
  const textBackgroundChip = document.getElementById('text-background-chip');
  const textBackgroundOpacityRow = document.getElementById(
    'text-background-opacity-row',
  );
  const textBackgroundOpacity = document.getElementById(
    'text-background-opacity',
  );
  const textBackgroundOpacityValue = document.getElementById(
    'text-background-opacity-value',
  );
  const textColorInput = document.getElementById('text-color-input');
  const textOutlineInput = document.getElementById('text-outline-input');
  const textBackgroundInput = document.getElementById('text-background-input');
  const textDialog = document.getElementById('text-dialog');
  const textDialogInput = document.getElementById('text-dialog-input');
  const textDialogCancel = document.getElementById('text-dialog-cancel');
  const textDialogSave = document.getElementById('text-dialog-save');
  const fileInput = document.getElementById('file-input');
  const projectInput = document.getElementById('project-input');
  const zoomHandle = document.getElementById('zoom-handle');
  const rotateHandle = document.getElementById('rotate-handle');
  const formatScreen = document.getElementById('format-screen');
  const undoButton = document.getElementById('undo-button');
  const workspace = document.getElementById('workspace');
  const historyBar = document.getElementById('history-bar');
  const historyList = document.getElementById('history-list');
  const historyClearButton = document.getElementById('history-clear');

  let pickerBoxId = null;
  let pickerFreeId = null;
  // The text box whose dialog is open; null while the dialog is closed.
  let textDialogId = null;
  let fitFrame = 0;
  let editing = false;
  let layout = Layout.compute(State.rows, State.orientation);
  let rowDrag = null;
  let boxDrag = null;
  let panDrag = null;
  let zoomDrag = null;
  let rotateDrag = null;
  let freeMoveDrag = null;
  let freeScaleDrag = null;
  let freeRotateDrag = null;
  let ignoreCanvasClickUntil = 0;
  let saveMenuOpen = false;
  let borderMenuOpen = false;
  let colorMenuOpen = false;
  let gradientStyleMenuOpen = false;
  let gradientMenuOpen = false;
  let borderFrame = 0;
  let paintToken = 0;
  let spotsBusy = false;
  let spotsQueued = false;
  let fillFrame = 0;
  let tintFrame = 0;
  let textFillFrame = 0;
  let textOutlineFrame = 0;
  let fontSelectionToken = 0;
  // The most recent deletion, kept alive for the one-step undo button.
  let pendingDelete = null;

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

  /**
   * The CSS paint image for the canvas margin: none for a plain fill, or one
   * of the closed-form gradient styles. Random spots are rasterised instead,
   * because their blurred shapes have no CSS equivalent.
   */
  const canvasPaintImage = () => {
    if (State.canvasMode !== 'gradient') return 'none';
    const first = State.gradientTop;
    const second = State.gradientBottom;
    if (State.gradientStyle === 'horizontal') {
      return `linear-gradient(90deg, ${first}, ${second})`;
    }
    if (State.gradientStyle === 'radial') {
      return `radial-gradient(circle at 50% 50%, ${second}, ${first})`;
    }
    return `linear-gradient(180deg, ${first}, ${second})`;
  };

  /** Paint the compiled spots bitmap once the browser has rasterised it. */
  const applySpotsPaint = () => {
    if (State.canvasMode !== 'gradient' || State.gradientStyle !== 'spots') {
      return;
    }
    // A rasterisation is already running: remember that the paint moved on and
    // render the latest colors when it finishes instead of queueing every
    // intermediate picker position. The running job is now stale.
    if (spotsBusy) {
      spotsQueued = true;
      paintToken += 1;
      return;
    }
    const style = document.documentElement.style;
    const token = (paintToken += 1);
    const fallback =
      `linear-gradient(180deg, ${State.gradientTop}, ` +
      `${State.gradientBottom})`;
    spotsBusy = true;
    Paint.spots(
      Layout.canvasW,
      Layout.canvasH,
      State.gradientTop,
      State.gradientBottom,
    )
      .then((entry) => {
        // A newer paint replaced this one while it was encoding.
        if (token !== paintToken) return;
        const image = `url("${entry.url}")`;
        style.setProperty('--canvas-paint-image', image);
        style.setProperty(
          '--canvas-paint',
          `${image} center / 100% 100% no-repeat`,
        );
        Render.repaintFreeFrames();
      })
      .catch(() => {
        if (token !== paintToken) return;
        // The margin must still paint if the bitmap cannot be rasterised.
        style.setProperty('--canvas-paint-image', fallback);
        style.setProperty('--canvas-paint', fallback);
        Render.repaintFreeFrames();
      })
      .finally(() => {
        spotsBusy = false;
        if (spotsQueued) {
          spotsQueued = false;
          applySpotsPaint();
        }
      });
  };

  /**
   * The canvas margin paints either one color or a gradient. Free-form frames
   * use the same paint image, aligned to the canvas, so the frame continues
   * the background instead of showing one sampled color.
   */
  const applyCanvasPaint = () => {
    const style = document.documentElement.style;
    if (State.canvasMode === 'gradient') {
      style.setProperty(
        '--canvas-swatch',
        `linear-gradient(90deg, ${State.gradientTop} 50%, ${State.gradientBottom} 50%)`,
      );
    } else {
      style.setProperty('--canvas-swatch', State.canvasColor);
    }
    // Kept for chrome that needs one concrete color (free-form frame fallback).
    style.setProperty('--canvas-bg', State.canvasColor);
    marginColorInput.value = State.canvasColor;

    if (State.canvasMode === 'gradient' && State.gradientStyle === 'spots') {
      // The previous paint stays up while the new bitmap encodes, so live
      // color changes do not flash between styles.
      applySpotsPaint();
      return;
    }

    // A pending spots render must not overwrite this paint when it lands.
    paintToken += 1;
    const image = canvasPaintImage();
    style.setProperty('--canvas-paint-image', image);
    style.setProperty(
      '--canvas-paint',
      image === 'none' ? State.canvasColor : image,
    );
    Render.repaintFreeFrames();
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
    borderRange.setAttribute(
      'aria-valuetext',
      I18n.t('border.pixels', { n: thickness }),
    );
    borderValue.textContent = I18n.t('border.value', { n: thickness });
  };

  // Every slider step reflows the whole canvas, so coalesce the input events
  // into at most one repaint per frame.
  const queueBorderRefresh = () => {
    if (borderFrame) return;
    borderFrame = requestAnimationFrame(() => {
      borderFrame = 0;
      // A text box keeps its type size while its frame grows or shrinks, so
      // capture the size under the old thickness before applying the new one.
      const textSeeds = State.freeBoxes
        .filter((box) => box.kind === 'text' && box.text)
        .map((box) => [box.id, textSeedSize(box)]);
      applyBorderThickness();
      Layout.setBorderThickness(State.borderThickness);
      textSeeds.forEach(([freeId, size]) => fitTextBox(freeId, size));
      refresh();
    });
  };

  const boxNumber = (boxId) => {
    const index = State.orderedBoxes().findIndex((box) => box.id === boxId);
    return index === -1 ? 0 : index + 1;
  };

  const freeBoxNumber = (freeId) => {
    const index = State.freeBoxes.findIndex((box) => box.id === freeId);
    return index === -1 ? 0 : index + 1;
  };

  /** Text boxes are numbered among themselves, not by their layer position. */
  const textBoxNumber = (freeId) => {
    let number = 0;
    for (const box of State.freeBoxes) {
      if (box.kind !== 'text') continue;
      number += 1;
      if (box.id === freeId) return number;
    }
    return 0;
  };

  const selectAndFocus = (boxId) => {
    if (!State.select(boxId)) return;
    Render.paintSelection(State);
    Render.focusBox(boxId);
    Render.announce(I18n.t('announce.selected', { n: boxNumber(boxId) }));
  };

  const selectFreeAndFocus = (freeId) => {
    if (!State.selectFree(freeId)) return;
    Render.paintSelection(State);
    Render.focusFreeBox(freeId);
    Render.announce(
      I18n.t('announce.selectedFree', { n: freeBoxNumber(freeId) }),
    );
  };

  const deselect = () => {
    if (!State.selectedBoxId && !State.selectedFreeId) return;
    State.clearSelection();
    Render.paintSelection(State);
    Render.focusCanvas();
    Render.announce(I18n.t('announce.deselected'));
  };

  const openPicker = (boxId) => {
    if (!boxId) return;
    pickerBoxId = boxId;
    pickerFreeId = null;
    fileInput.click();
  };

  const openFreePicker = (freeId) => {
    if (!freeId) return;
    pickerFreeId = freeId;
    pickerBoxId = null;
    fileInput.click();
  };

  // --- text boxes ---------------------------------------------------------

  /** Open the modal text editor for a text box, pre-filled with its words. */
  const openTextDialog = (freeId) => {
    const found = State.findFreeBox(freeId);
    if (!found || found.box.kind !== 'text') return;
    textDialogId = freeId;
    textDialogInput.value = found.box.text;
    textDialog.hidden = false;
    textDialogInput.focus({ preventScroll: true });
    textDialogInput.select();
  };

  /**
   * Close the editor without saving. Clicking the overlay, the panel, the
   * Cancel button, or pressing Escape all count as a cancel.
   */
  const closeTextDialog = (restoreFocus = true) => {
    if (textDialog.hidden) return;
    textDialog.hidden = true;
    const freeId = textDialogId;
    textDialogId = null;
    if (restoreFocus && freeId) Render.focusFreeBox(freeId);
  };

  /**
   * The font size a box shows right now, used as the seed when it is refitted:
   * an existing caption keeps its size, a new box starts at the default.
   */
  const textSeedSize = (box) =>
    box.text ? Layout.freeTextSize(box) : Layout.defaultTextSize(box);

  /**
   * Pixel extents that make a text box hug its words at `size`, using the same
   * line height and padding as the editor CSS and the export.
   */
  const measureTextBlock = (text, box, size, border) => {
    const context = document.createElement('canvas').getContext('2d');
    const lines = String(text).split('\n');
    let widest = 0;
    if (context) {
      context.font = Layout.textFont(box, size);
      for (const line of lines) {
        widest = Math.max(widest, context.measureText(line || ' ').width);
      }
    }
    const paddingX = size * Layout.textPaddingX;
    const paddingY = size * Layout.textPaddingY;
    return {
      // A pixel of slack keeps a measured line from wrapping in the DOM.
      width: widest + 2 * paddingX + 2 * border + 1,
      height:
        lines.length * size * Layout.textLineHeight +
        2 * paddingY +
        2 * border,
    };
  };

  /**
   * Resize a text box around its words, keeping its centre and font size. The
   * box aspect follows the measured words, so scaling it later scales the text
   * with it.
   */
  const fitTextBox = (freeId, size = null) => {
    const found = State.findFreeBox(freeId);
    if (!found || found.box.kind !== 'text' || !found.box.text) return false;
    const box = found.box;
    const metrics = measureTextBlock(
      box.text,
      box,
      size || Layout.freeTextSize(box),
      Layout.freeBorder(box),
    );
    return State.setFreeExtents(freeId, metrics.width, metrics.height);
  };

  /** Save the words into the box the dialog was opened for. */
  const saveTextDialog = async () => {
    const freeId = textDialogId;
    if (!freeId) return;
    const value = textDialogInput.value;
    const found = State.findFreeBox(freeId);
    // The size is captured before the new words arrive, so editing keeps it.
    const size = found ? textSeedSize(found.box) : null;
    const font = found
      ? Layout.textFonts.find((entry) => entry.id === found.box.font)
      : null;
    closeTextDialog(false);
    if (!State.setFreeText(freeId, value)) return;
    // A box with words hugs them; an emptied box resets to the square target.
    if (value) {
      // The caption may be the first use of the bundled default font.
      if (font) await FontLoader.ensure(font);
      fitTextBox(freeId, size);
    }
    refresh();
    Render.focusFreeBox(freeId);
    Render.announce(
      I18n.t(
        value ? 'announce.textUpdated' : 'announce.textRemoved',
        { n: textBoxNumber(freeId) },
      ),
    );
  };

  /** Double-click or Enter on a free box edits text, or opens the picker. */
  const openFreeEditor = (freeId) => {
    const found = State.findFreeBox(freeId);
    if (!found) return;
    if (found.box.kind === 'text') openTextDialog(freeId);
    else openFreePicker(freeId);
  };

  const updateUndoButton = () => {
    undoButton.hidden = !pendingDelete;
  };

  /** Drop the pending undo and release the image it was holding alive. */
  const discardPendingDelete = () => {
    if (!pendingDelete) return;
    Images.release(pendingDelete.box.image);
    pendingDelete = null;
    updateUndoButton();
  };

  /**
   * The deleted-photo shelf lives on the left for landscape canvases and along
   * the bottom for portrait and square ones. It is part of the workspace, so
   * showing or hiding it changes the room the canvas has and rescales it.
   */
  const syncHistoryBar = () => {
    const entries = History.entries;
    Render.paintHistory(entries);
    historyBar.hidden = !editing || entries.length === 0;
    if (editing) queueFit();
  };

  /**
   * Put a photo into a box. The photo that was there before goes on the shelf,
   * so a replacement can be recovered just like a deletion.
   */
  const applyImageToBox = (boxId, image) => {
    const found = State.findBox(boxId);
    if (!found) {
      Images.release(image);
      return false;
    }
    const previous = found.box.image;
    if (previous) History.add(previous).then(syncHistoryBar);
    if (!State.setImage(boxId, image)) return false;
    refresh();
    return true;
  };

  /** Same as applyImageToBox, but for a free-form box and its own ratio. */
  const applyImageToFreeBox = (freeId, image) => {
    const found = State.findFreeBox(freeId);
    if (!found) {
      Images.release(image);
      return false;
    }
    const previous = found.box.image;
    if (previous) History.add(previous).then(syncHistoryBar);
    if (!State.setFreeImage(freeId, image)) return false;
    refresh();
    return true;
  };

  /**
   * A filled grid box keeps its cell and only loses its photo: the photo joins
   * the shelf and the box returns to the empty cell it was before, including
   * any color and opacity the user gave it.
   */
  const removeBoxPhoto = (found) => {
    const { box, row } = found;
    const boxId = box.id;
    const number = boxNumber(boxId);

    // A ratio lock cannot survive without a photo, so freeze the current pixel
    // extents first, exactly like releasing the lock by hand does.
    if (box.lock === 'aspect' && row.boxes.length === 1) preserveGroupExtents();
    const column = isColumnMode();
    const placedRow = layout.rows.find((candidate) => candidate.id === row.id);
    const sizes = placedRow
      ? placedRow.boxes.map((candidate) => (column ? candidate.h : candidate.w))
      : [];

    History.add(box.image).then(syncHistoryBar);
    if (!State.clearImage(boxId)) return;
    if (sizes.length === row.boxes.length) State.setRowWeights(row.id, sizes);

    refresh();
    Render.focusBox(boxId);
    Render.announce(I18n.t('announce.photoRemoved', { n: number }));
  };

  const deleteSelected = () => {
    if (State.selectedFreeId) {
      deleteFreeSelected();
      return;
    }
    const boxId = State.selectedBoxId;
    if (!boxId) return;
    const found = State.findBox(boxId);
    if (found && found.box.image) {
      removeBoxPhoto(found);
      return;
    }
    const number = boxNumber(boxId);
    const snapshot = State.removeBox(boxId);
    if (!snapshot) return;

    discardPendingDelete();
    pendingDelete = { kind: 'grid', ...snapshot };
    updateUndoButton();
    if (snapshot.box.image) {
      History.add(snapshot.box.image).then(syncHistoryBar);
    }
    refresh();
    Render.focusCanvas();
    Render.announce(I18n.t('announce.deleted', { n: number }));
  };

  /**
   * A filled free-form box mirrors a filled grid box: the first delete only
   * lifts the photo into the shelf and leaves the empty box in place; a second
   * delete removes the box and offers the one-step undo.
   */
  const removeFreeBoxPhoto = (found) => {
    const freeId = found.box.id;
    const number = freeBoxNumber(freeId);
    History.add(found.box.image).then(syncHistoryBar);
    if (!State.clearFreeImage(freeId)) return;
    refresh();
    Render.focusFreeBox(freeId);
    Render.announce(I18n.t('announce.freePhotoRemoved', { n: number }));
  };

  /** A text box keeps its place and loses only its words, like a photo cell. */
  const removeFreeBoxText = (found) => {
    const freeId = found.box.id;
    const number = textBoxNumber(freeId);
    if (!State.setFreeText(freeId, '')) return;
    refresh();
    Render.focusFreeBox(freeId);
    Render.announce(I18n.t('announce.textRemoved', { n: number }));
  };

  const deleteFreeSelected = () => {
    const freeId = State.selectedFreeId;
    if (!freeId) return;
    const found = State.findFreeBox(freeId);
    if (!found) return;
    if (found.box.image) {
      removeFreeBoxPhoto(found);
      return;
    }
    if (found.box.kind === 'text' && found.box.text) {
      removeFreeBoxText(found);
      return;
    }
    const isText = found.box.kind === 'text';
    const number = isText ? textBoxNumber(freeId) : freeBoxNumber(freeId);
    const snapshot = State.removeFreeBox(freeId);
    if (!snapshot) return;

    discardPendingDelete();
    pendingDelete = { kind: 'free', ...snapshot };
    updateUndoButton();
    if (snapshot.box.image) {
      History.add(snapshot.box.image).then(syncHistoryBar);
    }
    refresh();
    Render.focusCanvas();
    Render.announce(
      I18n.t(isText ? 'announce.textDeleted' : 'announce.freeDeleted', {
        n: number,
      }),
    );
  };

  /** Restore the last removed box in place, without its ratio lock. */
  const undoDelete = () => {
    if (!pendingDelete) return;
    const snapshot = pendingDelete;
    pendingDelete = null;
    updateUndoButton();

    if (snapshot.kind === 'free') {
      const freeBox = State.restoreFreeBox(snapshot);
      if (!freeBox) {
        Images.release(snapshot.box.image);
        return;
      }
      refresh();
      Render.focusFreeBox(freeBox.id);
      Render.announce(
        I18n.t(
          freeBox.kind === 'text' ? 'announce.textUndone' : 'announce.freeUndone',
          { n: freeBox.kind === 'text' ? textBoxNumber(freeBox.id) : freeBoxNumber(freeBox.id) },
        ),
      );
      return;
    }

    const box = State.restoreBox(snapshot);
    if (!box) {
      Images.release(snapshot.box.image);
      return;
    }
    refresh();
    Render.focusBox(box.id);
    Render.announce(I18n.t('announce.undone', { n: boxNumber(box.id) }));
  };

  /**
   * Put a shelved photo into the selected box. The shelf never changes the
   * structure on its own; without a selection it asks for one instead.
   */
  const addHistoryPhoto = (entry) => {
    if (State.selectedFreeId) {
      const freeId = State.selectedFreeId;
      const found = State.findFreeBox(freeId);
      // A text box has no photo slot; the shelf asks for a photo box instead.
      if (found && found.box.kind === 'text') {
        Render.toast(I18n.t('history.selectBox'));
        return;
      }
      if (!applyImageToFreeBox(freeId, History.imageFor(entry))) return;
      Render.focusFreeBox(freeId);
      Render.announce(
        I18n.t('announce.freeImageAdded', { n: freeBoxNumber(freeId) }),
      );
      return;
    }
    const boxId = State.selectedBoxId;
    if (!boxId) {
      Render.toast(I18n.t('history.selectBox'));
      return;
    }
    if (!applyImageToBox(boxId, History.imageFor(entry))) return;
    Render.focusBox(boxId);
    Render.announce(
      I18n.t('announce.historyAdded', { n: boxNumber(boxId) }),
    );
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
      Render.announce(I18n.t('announce.lockReleased'));
      return;
    }

    const group = I18n.t(isColumnMode() ? 'group.column' : 'group.row');
    if (!State.canLockBox(boxId)) {
      Render.announce(I18n.t('announce.needUnlocked', { group }));
      return;
    }

    if (mode === 'aspect' && !State.canAspectLock(boxId)) {
      Render.announce(I18n.t('announce.needRatio', { group }));
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
      I18n.t(mode === 'square' ? 'announce.squareOn' : 'announce.aspectOn'),
    );
  };

  /**
   * Hide or show a grid box. Its image and its space stay in the layout; only
   * the rendering changes, so a hidden box remains selectable and can be shown
   * again from the same action. Empty boxes hide their placeholder too.
   */
  const toggleBoxVisibility = (boxId) => {
    const found = State.findBox(boxId);
    if (!found) return;
    const nextVisible = found.box.visible === false;
    if (!State.setBoxVisible(boxId, nextVisible)) return;
    refresh();
    focusAction('toggle-visibility');
    Render.announce(
      I18n.t(nextVisible ? 'announce.shown' : 'announce.hidden', {
        n: boxNumber(boxId),
      }),
    );
  };

  /**
   * Crop a free-form box to a square, or restore its photo's own ratio. The
   * area (and so the visual weight) stays put either way.
   */
  const toggleFreeSquare = (freeId) => {
    const found = State.findFreeBox(freeId);
    if (!found || !found.box.image) return;
    const next = !found.box.square;
    if (!State.setFreeSquare(freeId, next)) return;
    refresh();
    focusAction('crop-square');
    Render.announce(
      I18n.t(next ? 'announce.freeSquareOn' : 'announce.freeSquareOff', {
        n: freeBoxNumber(freeId),
      }),
    );
  };

  /** Show or hide the margin frame that keeps a free-form box readable. */
  const toggleFreeBorder = (freeId) => {
    const found = State.findFreeBox(freeId);
    if (!found) return;
    const text = found.box.kind === 'text';
    // The frame grows the box without changing the words' size.
    const size = text ? textSeedSize(found.box) : null;
    const next = found.box.border === false;
    if (!State.setFreeBorder(freeId, next)) return;
    if (text) fitTextBox(freeId, size);
    refresh();
    focusAction('free-border');
    Render.announce(
      text
        ? I18n.t(next ? 'announce.textBorderOn' : 'announce.textBorderOff', {
            n: textBoxNumber(freeId),
          })
        : I18n.t(next ? 'announce.freeBorderOn' : 'announce.freeBorderOff', {
            n: freeBoxNumber(freeId),
          }),
    );
  };

  /** Show or hide the canvas paint behind a transparent free-form photo. */
  const toggleFreeBackground = (freeId) => {
    const found = State.findFreeBox(freeId);
    if (!found) return;
    const next = !found.box.background;
    if (!State.setFreeBackground(freeId, next)) return;
    refresh();
    focusAction('free-background');
    // The background color and opacity rows follow the same flag while their
    // menu is open, so keep them in step with the new state.
    if (!textColorMenu.hidden) syncTextColorMenu();
    const text = found.box.kind === 'text';
    Render.announce(
      text
        ? I18n.t(
            next ? 'announce.textBackgroundOn' : 'announce.textBackgroundOff',
            { n: textBoxNumber(freeId) },
          )
        : I18n.t(
            next
              ? 'announce.freeBackgroundOn'
              : 'announce.freeBackgroundOff',
            { n: freeBoxNumber(freeId) },
          ),
    );
  };

  const handlePickedFile = async (file) => {
    const boxId = pickerBoxId;
    const freeId = pickerFreeId;
    pickerBoxId = null;
    pickerFreeId = null;
    if (!file || (!boxId && !freeId)) return;

    Render.announce(I18n.t('announce.opening'));
    try {
      const image = await Images.load(file);
      if (freeId) {
        if (!applyImageToFreeBox(freeId, image)) {
          Render.toast(I18n.t('error.boxGone'), true);
          return;
        }
        Render.focusFreeBox(freeId);
        Render.announce(
          I18n.t('announce.freeImageAdded', { n: freeBoxNumber(freeId) }),
        );
        return;
      }
      if (!applyImageToBox(boxId, image)) {
        Render.toast(I18n.t('error.boxGone'), true);
        return;
      }
      Render.focusBox(boxId);
      Render.announce(I18n.t('announce.imageAdded', { n: boxNumber(boxId) }));
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
    closeColorMenu();
    closeGradientMenu();
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
    closeColorMenu();
    closeGradientMenu();
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

  const colorMenuItems = () =>
    Array.from(colorMenu.querySelectorAll('[role="menuitem"]')).filter(
      (item) => !item.closest('[hidden]'),
    );

  const gradientMenuItems = () =>
    Array.from(gradientMenu.querySelectorAll('[role="menuitem"]')).filter(
      (item) => !item.closest('[hidden]'),
    );

  const gradientStopItems = () =>
    Array.from(colorMenu.querySelectorAll('[data-gradient-stop]'));

  /**
   * One chip per preset in both gradient menus. The chip paints its own two
   * stops diagonally and carries the tooltip; the visible text stays in the
   * surrounding menu, so a chip is a pure swatch.
   */
  const buildPresetChips = () => {
    const targets = [colorPresets, gradientPresets];
    const fragments = targets.map(() => document.createDocumentFragment());

    PAINT_PRESETS.forEach((preset) => {
      const tooltip = I18n.t('preset.tooltip', {
        group: I18n.t(preset.group),
        name: I18n.t(preset.name),
        description: I18n.t(preset.description),
      });
      targets.forEach((target, index) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'color-preset';
        chip.dataset.presetId = preset.id;
        chip.setAttribute('role', 'menuitem');
        chip.setAttribute('aria-label', tooltip);
        chip.title = tooltip;
        chip.style.background = `linear-gradient(135deg, ${preset.first}, ${preset.second})`;
        fragments[index].append(chip);
      });
    });

    targets.forEach((target, index) => target.append(fragments[index]));
  };

  /** Mark the preset that matches the live stops, if any. */
  const syncPresetChips = () => {
    if (State.canvasMode !== 'gradient') return;
    const first = State.gradientTop;
    const second = State.gradientBottom;
    document.querySelectorAll('.color-preset').forEach((chip) => {
      const preset = PAINT_PRESETS.find(
        (candidate) => candidate.id === chip.dataset.presetId,
      );
      const active =
        preset && preset.first === first && preset.second === second;
      if (active) chip.setAttribute('aria-current', 'true');
      else chip.removeAttribute('aria-current');
    });
  };

  /** Apply both stops of a preset, leaving the gradient style untouched. */
  const applyPreset = (presetId) => {
    const preset = PAINT_PRESETS.find(
      (candidate) => candidate.id === presetId,
    );
    if (!preset) return;
    if (!State.setCanvasGradient(preset.first, preset.second)) return;
    applyCanvasPaint();
    syncColorMenu();
    syncGradientChips();
    syncGradientInputs();
    Render.announce(
      I18n.t('announce.preset', { name: I18n.t(preset.name) }),
    );
  };

  /**
   * One stop row while Fill paints the canvas, both while a gradient does.
   * Each row previews the color it edits: the fill color, or the gradient stop.
   * Presets only make sense with two stops, so Fill hides them.
   */
  const syncColorMenu = () => {
    const gradient = State.canvasMode === 'gradient';
    shuffleSpotsButton.hidden = !gradient || State.gradientStyle !== 'spots';
    colorPresets.hidden = !gradient;
    gradientStopItems().forEach((item) => {
      const bottom = item.dataset.gradientStop === 'bottom';
      item.hidden = bottom && !gradient;
      const chip = item.querySelector('[data-gradient-chip]');
      if (!chip) return;
      let color = State.gradientTop;
      if (bottom) color = State.gradientBottom;
      if (!gradient) color = State.canvasColor;
      chip.style.background = color;
    });
    syncPresetChips();
  };

  const syncMarginExpanded = () => {
    const open = colorMenuOpen || gradientStyleMenuOpen || gradientMenuOpen;
    marginColorButton.setAttribute('aria-expanded', String(open));
  };

  const openColorMenu = (focusLast = false) => {
    if (colorMenuOpen) return;
    closeSaveMenu();
    closeBorderMenu();
    closeGradientStyleMenu();
    closeGradientMenu();
    syncColorMenu();
    colorMenuOpen = true;
    colorMenu.hidden = false;
    syncMarginExpanded();
    const items = colorMenuItems();
    const item = focusLast ? items[items.length - 1] : items[0];
    if (item) item.focus({ preventScroll: true });
  };

  const closeColorMenu = (restoreFocus = false) => {
    if (!colorMenuOpen) return;
    colorMenuOpen = false;
    colorMenu.hidden = true;
    syncMarginExpanded();
    if (restoreFocus) marginColorButton.focus({ preventScroll: true });
  };

  const gradientStyleItems = () =>
    Array.from(gradientStyleMenu.querySelectorAll('[data-gradient-style]'));

  /** Mark the active gradient style, so the menu reflects the canvas. */
  const paintGradientStyleMenu = () => {
    gradientStyleItems().forEach((item) => {
      if (item.dataset.gradientStyle === State.gradientStyle) {
        item.setAttribute('aria-current', 'true');
      } else {
        item.removeAttribute('aria-current');
      }
    });
  };

  const openGradientStyleMenu = () => {
    closeColorMenu();
    closeSaveMenu();
    closeBorderMenu();
    closeGradientMenu();
    if (gradientStyleMenuOpen) return;
    paintGradientStyleMenu();
    gradientStyleMenuOpen = true;
    gradientStyleMenu.hidden = false;
    syncMarginExpanded();
    const current =
      gradientStyleMenu.querySelector(
        `[data-gradient-style="${State.gradientStyle}"]`,
      ) || gradientStyleItems()[0];
    if (current) current.focus({ preventScroll: true });
  };

  const closeGradientStyleMenu = (restoreFocus = false) => {
    if (!gradientStyleMenuOpen) return;
    gradientStyleMenuOpen = false;
    gradientStyleMenu.hidden = true;
    syncMarginExpanded();
    if (restoreFocus) marginColorButton.focus({ preventScroll: true });
  };

  /** Apply a gradient style, then offer its two colors. */
  const chooseGradientStyle = (style) => {
    // The gradient keeps its own pair of stops, so leaving Fill does not drag
    // the solid color into both swatches.
    const first = State.gradientTop;
    const second = State.gradientBottom;
    if (!State.setCanvasGradient(first, second, style)) return;
    applyCanvasPaint();
    closeGradientStyleMenu();
    openGradientMenu();
    Render.announce(
      I18n.t('announce.gradientStyle', {
        style: I18n.t(`gradient.style.${style}`),
      }),
    );
  };

  /** Re-roll the seeded spots bitmap without touching the style or colors. */
  const shuffleSpots = () => {
    if (State.canvasMode !== 'gradient' || State.gradientStyle !== 'spots') {
      return;
    }
    Paint.shuffle();
    applyCanvasPaint();
    Render.announce(I18n.t('announce.shuffleSpots'));
  };

  /** Seed the two swatches with the live gradient (or the current fill). */
  const syncGradientInputs = () => {
    const gradient = State.canvasMode === 'gradient';
    gradientTopInput.value = gradient ? State.gradientTop : State.canvasColor;
    gradientBottomInput.value = gradient
      ? State.gradientBottom
      : State.canvasColor;
  };

  /**
   * Open the system color picker for the swatch inputs. Called from a click, so
   * the browser still has the gesture it requires; an engine without
   * `showPicker` falls back to a plain click on the input.
   */
  const openSwatchPicker = (input) => {
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      // A refused picker falls through to the click path.
    }
    input.click();
  };

  /** Preview each stop in the panel's chip, like the base menu rows do. */
  const syncGradientChips = () => {
    gradientMenu
      .querySelectorAll('[data-gradient-swatch-chip]')
      .forEach((chip) => {
        chip.style.background =
          chip.dataset.gradientSwatchChip === 'bottom'
            ? State.gradientBottom
            : State.gradientTop;
      });
  };

  /** Show the two stop rows, optionally opening one picker right away. */
  const openGradientMenu = (pick = null) => {
    closeColorMenu();
    closeGradientStyleMenu();
    closeSaveMenu();
    closeBorderMenu();
    if (!gradientMenuOpen) {
      syncGradientInputs();
      gradientMenuOpen = true;
      gradientMenu.hidden = false;
      syncMarginExpanded();
    }
    syncGradientChips();
    syncPresetChips();
    const stop = pick === 'bottom' ? 'bottom' : 'top';
    const row = gradientMenu.querySelector(`[data-gradient-pick="${stop}"]`);
    if (row) row.focus({ preventScroll: true });
    if (pick) {
      openSwatchPicker(stop === 'bottom' ? gradientBottomInput : gradientTopInput);
    }
  };

  const closeGradientMenu = (restoreFocus = false) => {
    if (!gradientMenuOpen) return;
    gradientMenuOpen = false;
    gradientMenu.hidden = true;
    syncMarginExpanded();
    if (restoreFocus) marginColorButton.focus({ preventScroll: true });
  };

  const openMarginPicker = () => {
    marginColorInput.value = State.canvasColor;
    try {
      if (typeof marginColorInput.showPicker === 'function') {
        marginColorInput.showPicker();
      } else {
        marginColorInput.click();
      }
    } catch {
      marginColorInput.click();
    }
  };

  /** The selected box while it is still empty (grid or free-form), else null. */
  const fillTarget = () => {
    const found = State.selectedFreeId
      ? State.findFreeBox(State.selectedFreeId)
      : State.findBox(State.selectedBoxId);
    if (!found || found.box.image) return null;
    return found.box;
  };

  /** A cell's effective paint: its own values or the shared start values. */
  const currentFill = (box) => box.fill || State.placeholderFill;

  const syncFillMenu = () => {
    const box = fillTarget();
    if (!box) return;
    const fill = currentFill(box);
    const percent = Math.round(fill.opacity * 100);
    fillColorChip.style.background = fill.color;
    fillColorInput.value = fill.color;
    fillOpacity.value = String(percent);
    fillOpacityValue.textContent = I18n.t('fill.value', { n: percent });
    fillOpacity.setAttribute(
      'aria-valuetext',
      I18n.t('fill.percent', { n: percent }),
    );
  };

  const openFillMenu = () => {
    if (!fillTarget()) return;
    closeSaveMenu();
    closeBorderMenu();
    closeColorMenu();
    closeGradientStyleMenu();
    closeGradientMenu();
    syncFillMenu();
    fillMenu.hidden = false;
    fillButton.setAttribute('aria-expanded', 'true');
    fillColorRow.focus({ preventScroll: true });
  };

  const closeFillMenu = (restoreFocus = false) => {
    if (fillMenu.hidden) return;
    fillMenu.hidden = true;
    fillButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) fillButton.focus({ preventScroll: true });
  };

  /** Store one changed value and repaint the cell once per frame. */
  const applyFill = (patch) => {
    const box = fillTarget();
    if (!box) return;
    const fill = { ...currentFill(box), ...patch };
    const saved = State.selectedFreeId
      ? State.setFreeFill(box.id, fill.color, fill.opacity)
      : State.setBoxFill(box.id, fill.color, fill.opacity);
    if (!saved) return;
    fillColorChip.style.background = fill.color;
    if (fillFrame) return;
    fillFrame = requestAnimationFrame(() => {
      fillFrame = 0;
      refresh();
      syncFillMenu();
    });
  };

  const announceFill = () => {
    const box = fillTarget();
    if (!box) return;
    const fill = currentFill(box);
    Render.announce(
      I18n.t('announce.fill', {
        color: fill.color,
        n: Math.round(fill.opacity * 100),
      }),
    );
  };

  // --- photo colorize -----------------------------------------------------

  /** The selected box while it holds a photo (grid or free-form), else null. */
  const tintTarget = () => {
    const found = State.selectedFreeId
      ? State.findFreeBox(State.selectedFreeId)
      : State.findBox(State.selectedBoxId);
    if (!found || !found.box.image || found.box.kind === 'text') return null;
    return found.box;
  };

  const syncTintMenu = () => {
    const box = tintTarget();
    if (!box) return;
    tintColorChip.classList.toggle('is-none', !box.tint);
    tintColorChip.style.background = box.tint || '';
    tintClearRow.hidden = !box.tint;
    // The picker opens on the current tint; black leaves a photo unchanged, so
    // it is the neutral starting value.
    tintColorInput.value = box.tint || '#000000';
  };

  const openTintMenu = () => {
    if (!tintTarget()) return;
    closeSaveMenu();
    closeBorderMenu();
    closeColorMenu();
    closeGradientStyleMenu();
    closeGradientMenu();
    closeFillMenu();
    syncTintMenu();
    tintMenu.hidden = false;
    tintButton.setAttribute('aria-expanded', 'true');
    tintColorRow.focus({ preventScroll: true });
  };

  const closeTintMenu = (restoreFocus = false) => {
    if (tintMenu.hidden) return;
    tintMenu.hidden = true;
    tintButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) tintButton.focus({ preventScroll: true });
  };

  /** Store the tint and repaint the canvas once per frame. */
  const applyTint = (color) => {
    const box = tintTarget();
    if (!box) return;
    const saved = State.selectedFreeId
      ? State.setFreeTint(box.id, color)
      : State.setBoxTint(box.id, color);
    if (!saved) return;
    tintColorChip.classList.toggle('is-none', !color);
    tintColorChip.style.background = color || '';
    tintClearRow.hidden = !color;
    if (tintFrame) return;
    tintFrame = requestAnimationFrame(() => {
      tintFrame = 0;
      refresh();
      syncTintMenu();
    });
  };

  const announceTint = () => {
    const box = tintTarget();
    if (!box) return;
    Render.announce(
      I18n.t(box.tint ? 'announce.tint' : 'announce.tintOff', {
        color: box.tint,
      }),
    );
  };

  // --- text styling menus -------------------------------------------------

  const fontMenuItems = () =>
    Array.from(fontMenu.querySelectorAll('[data-font]'));

  /** One menu item per bundled font, each showing its own SVG preview. */
  const buildFontMenu = () => {
    const fragment = document.createDocumentFragment();

    for (const font of Layout.textFonts) {
      const label = I18n.t(font.labelKey);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'color-menu-item font-menu-item';
      item.dataset.font = font.id;
      item.setAttribute('role', 'menuitem');
      item.setAttribute('aria-label', label);
      item.title = label;

      const preview = document.createElement('img');
      preview.className = 'font-preview';
      preview.src = font.preview;
      preview.alt = '';
      preview.draggable = false;
      preview.setAttribute('aria-hidden', 'true');
      item.append(preview);
      fragment.append(item);
    }

    fontMenu.replaceChildren(fragment);
  };

  const syncFontMenu = () => {
    const found = State.findFreeBox(State.selectedFreeId);
    const font = found && found.box.kind === 'text' ? found.box.font : 'sans';
    fontMenuItems().forEach((item) => {
      if (item.dataset.font === font) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  };

  const openFontMenu = () => {
    const found = State.findFreeBox(State.selectedFreeId);
    if (!found || found.box.kind !== 'text') return;
    closeSaveMenu();
    closeBorderMenu();
    closeColorMenu();
    closeGradientStyleMenu();
    closeGradientMenu();
    closeFillMenu();
    closeTextColorMenu();
    syncFontMenu();
    fontMenu.hidden = false;
    fontButton.setAttribute('aria-expanded', 'true');
    const current =
      fontMenu.querySelector('[aria-current="true"]') || fontMenuItems()[0];
    if (current) current.focus({ preventScroll: true });
  };

  const closeFontMenu = (restoreFocus = false) => {
    if (fontMenu.hidden) return;
    fontMenu.hidden = true;
    fontButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) fontButton.focus({ preventScroll: true });
  };

  /** Load the chosen WOFF2, then switch the text box to that family. */
  const applyTextFont = async (fontId) => {
    const freeId = State.selectedFreeId;
    const found = State.findFreeBox(freeId);
    const entry = Layout.textFonts.find((font) => font.id === fontId);
    if (!freeId || !found || !entry) return;
    const size = textSeedSize(found.box);
    const token = (fontSelectionToken += 1);
    fontMenu.setAttribute('aria-busy', 'true');
    const loaded = await FontLoader.ensure(entry);
    if (token !== fontSelectionToken) return;
    fontMenu.removeAttribute('aria-busy');
    if (!loaded) {
      Render.toast(I18n.t('font.loadFailed'), true);
      return;
    }
    if (!State.setFreeFont(freeId, fontId)) return;
    // The words keep their size; the box refits around the loaded face.
    if (found.box.text) fitTextBox(freeId, size);
    refresh();
    closeFontMenu();
    fontButton.focus({ preventScroll: true });
    Render.announce(
      I18n.t('announce.font', { font: I18n.t(entry.labelKey) }),
    );
  };

  /** The selected text box while it is a text box, else null. */
  const textColorTarget = () => {
    const found = State.findFreeBox(State.selectedFreeId);
    return found && found.box.kind === 'text' ? found.box : null;
  };

  /** The same box, but only while its backdrop is shown. */
  const textBackgroundTarget = () => {
    const box = textColorTarget();
    return box && box.background !== false ? box : null;
  };

  /** A text box's backdrop: its own fill or the shared placeholder gray. */
  const currentTextFill = (box) => box.fill || State.placeholderFill;

  const syncTextColorMenu = () => {
    const box = textColorTarget();
    if (!box) return;
    const align = box.align || 'center';
    textAlignButtons.forEach((button) => {
      const active = button.dataset.textAlign === align;
      button.setAttribute('aria-pressed', String(active));
    });
    textStyleButtons.forEach((button) => {
      const active = Boolean(box[button.dataset.textStyle]);
      button.setAttribute('aria-pressed', String(active));
    });
    textColorChip.style.background = box.color;
    textOutlineChip.style.background = box.outline;
    textColorInput.value = box.color;
    textOutlineInput.value = box.outline;
    const outline = Math.round(Layout.textOutlineWidth(box));
    textOutlineWidth.value = String(outline);
    textOutlineWidthValue.textContent = I18n.t('border.value', { n: outline });
    textOutlineWidth.setAttribute(
      'aria-valuetext',
      I18n.t('border.value', { n: outline }),
    );

    // The background controls only make sense while the backdrop is shown; a
    // stored fill survives a toggle off so it comes back unchanged.
    const showBackground = box.background !== false;
    textBackgroundRow.hidden = !showBackground;
    textBackgroundOpacityRow.hidden = !showBackground;
    if (!showBackground) return;
    const fill = currentTextFill(box);
    const percent = Math.round(fill.opacity * 100);
    textBackgroundChip.style.background = fill.color;
    textBackgroundInput.value = fill.color;
    textBackgroundOpacity.value = String(percent);
    textBackgroundOpacityValue.textContent = I18n.t('fill.value', { n: percent });
    textBackgroundOpacity.setAttribute(
      'aria-valuetext',
      I18n.t('fill.percent', { n: percent }),
    );
  };

  const openTextColorMenu = (focusLast = false) => {
    if (!textColorTarget()) return;
    closeSaveMenu();
    closeBorderMenu();
    closeColorMenu();
    closeGradientStyleMenu();
    closeGradientMenu();
    closeFillMenu();
    closeFontMenu();
    syncTextColorMenu();
    textColorMenu.hidden = false;
    textColorButton.setAttribute('aria-expanded', 'true');
    const row = focusLast ? textOutlineRow : textColorRow;
    row.focus({ preventScroll: true });
  };

  const closeTextColorMenu = (restoreFocus = false) => {
    if (textColorMenu.hidden) return;
    textColorMenu.hidden = true;
    textColorButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) textColorButton.focus({ preventScroll: true });
  };

  /** Store a text box's horizontal alignment and keep the menu in sync. */
  const applyTextAlign = (align) => {
    const freeId = State.selectedFreeId;
    if (!freeId || !State.setFreeTextAlign(freeId, align)) return;
    refresh();
    syncTextColorMenu();
    const valueKey = {
      left: 'textColor.alignLeftValue',
      center: 'textColor.alignCenterValue',
      right: 'textColor.alignRightValue',
    }[align];
    Render.announce(
      I18n.t('announce.textAlign', { align: I18n.t(valueKey) }),
    );
  };

  /** Toggle bold, italic, or underline and refit the words at their size. */
  const applyTextStyle = (style, active) => {
    const freeId = State.selectedFreeId;
    const found = State.findFreeBox(freeId);
    if (!found || !State.setFreeTextStyle(freeId, style, active)) return;
    const size = textSeedSize(found.box);
    if (found.box.text) fitTextBox(freeId, size);
    refresh();
    syncTextColorMenu();
    Render.announce(
      I18n.t(active ? 'announce.textStyleOn' : 'announce.textStyleOff', {
        style: I18n.t(`textColor.${style}`),
      }),
    );
  };

  /** Change the outline width live, repainting at most once per frame. */
  const applyTextOutlineWidth = (width) => {
    const box = textColorTarget();
    if (!box || !State.setFreeTextOutlineWidth(box.id, width)) return;
    syncTextColorMenu();
    if (textOutlineFrame) return;
    textOutlineFrame = requestAnimationFrame(() => {
      textOutlineFrame = 0;
      refresh();
      syncTextColorMenu();
    });
  };

  /** Store one changed text color, then keep the chips and the box in sync. */
  const applyTextColor = (which, color) => {
    const freeId = State.selectedFreeId;
    if (!freeId) return;
    const applied =
      which === 'outline'
        ? State.setFreeTextOutline(freeId, color)
        : State.setFreeTextColor(freeId, color);
    if (!applied) return;
    refresh();
    syncTextColorMenu();
  };

  /**
   * Change the selected text box's backdrop color or opacity. The slider fires
   * continuously, so the canvas reflows at most once per frame.
   */
  const applyTextBackground = (patch) => {
    const box = textBackgroundTarget();
    if (!box) return;
    const fill = { ...currentTextFill(box), ...patch };
    if (!State.setFreeFill(box.id, fill.color, fill.opacity)) return;
    syncTextColorMenu();
    if (textFillFrame) return;
    textFillFrame = requestAnimationFrame(() => {
      textFillFrame = 0;
      refresh();
      syncTextColorMenu();
    });
  };

  const announceTextBackground = () => {
    const box = textBackgroundTarget();
    if (!box) return;
    const fill = currentTextFill(box);
    Render.announce(
      I18n.t('announce.textBackground', {
        color: fill.color,
        n: Math.round(fill.opacity * 100),
      }),
    );
  };

  const announceTextOutlineWidth = () => {
    const box = textColorTarget();
    if (!box) return;
    Render.announce(
      I18n.t('announce.textOutlineWidth', {
        n: Math.round(Layout.textOutlineWidth(box)),
      }),
    );
  };

  const saveCollage = async (format) => {
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
    Render.announce(
      I18n.t('announce.saving', {
        format: format === 'jpeg' ? 'JPEG' : 'PNG',
      }),
    );

    try {
      const filename = await Export.save(State, format);
      Render.toast(I18n.t('save.saved', { filename }));
    } catch (error) {
      Render.toast(error.message || I18n.t('save.failed'), true);
    } finally {
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
    }
  };

  /** The start-screen format matching the live canvas size, for project files. */
  const currentFormat = () =>
    FORMATS.find(
      (format) =>
        format.canvasW === Layout.canvasW && format.canvasH === Layout.canvasH,
    ) || {
      id: '',
      label: `${Layout.canvasW} × ${Layout.canvasH}`,
      canvasW: Layout.canvasW,
      canvasH: Layout.canvasH,
    };

  /** Download the complete collage, photos included, as a JSON project. */
  const exportProject = async () => {
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
    Render.announce(I18n.t('save.exporting'));

    try {
      const data = await Project.snapshot(State, {
        format: currentFormat(),
        spotsSeed: Paint.seed,
      });
      const filename = Project.download(data);
      Render.toast(I18n.t('save.exported', { filename }));
    } catch (error) {
      Render.toast(error.message || I18n.t('save.exportFailed'), true);
    } finally {
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
    }
  };

  /**
   * Restore a project file. The file and all of its photos are decoded first,
   * so an unreadable project leaves the current collage untouched; the format
   * is applied before the state so free-form boxes clamp to the right canvas.
   */
  const importProjectFile = async (file) => {
    if (!file) return;
    Render.announce(I18n.t('save.importing'));
    let project = null;
    let loaded = false;

    try {
      project = await Project.parse(file);
      // A restored caption may use a font this session has never shown yet.
      await Promise.all(
        project.fonts.map((fontId) => {
          const font = Layout.textFonts.find((entry) => entry.id === fontId);
          return font ? FontLoader.ensure(font) : null;
        }),
      );

      if (!editing) editing = true;
      applyFormatLayout(project.format);
      if (stage.hidden) showEditor();

      discardPendingDelete();
      if (!State.loadProject(project)) {
        throw new Error(I18n.t('save.importInvalid'));
      }
      loaded = true;

      Paint.setSeed(project.canvas.spotsSeed);
      applyCanvasPaint();
      applyBorderThickness();
      refresh();
      fitCanvas();
      Render.focusCanvas();
      Render.toast(I18n.t('save.imported'));
    } catch (error) {
      // Until the state accepts them, the decoded photos belong to this call.
      if (!loaded && project && project.images) {
        project.images.forEach((image) => Images.release(image));
      }
      Render.toast(error.message || I18n.t('save.importFailed'), true);
    } finally {
      projectInput.value = '';
    }
  };

  const addRow = (position) => {
    // Adding a group changes the structure, so the one-step undo no longer
    // describes the current tree.
    discardPendingDelete();
    State.addRow(position);
    refresh();
    if (isColumnMode()) {
      Render.announce(
        I18n.t(
          position === 'start'
            ? 'announce.columnAddedLeft'
            : 'announce.columnAddedRight',
        ),
      );
    } else {
      Render.announce(
        I18n.t(
          position === 'start'
            ? 'announce.rowAddedTop'
            : 'announce.rowAddedBottom',
        ),
      );
    }
  };

  /** Add an empty square free-form box at the canvas centre and select it. */
  const addFreeBox = () => {
    discardPendingDelete();
    const box = State.addFreeBox();
    State.selectFree(box.id);
    refresh();
    Render.focusFreeBox(box.id);
    Render.announce(I18n.t('announce.freeAdded'));
  };

  /** Add a text box at the canvas centre and open its editor right away. */
  const addTextBox = () => {
    discardPendingDelete();
    const box = State.addTextBox();
    State.selectFree(box.id);
    refresh();
    Render.focusFreeBox(box.id);
    Render.announce(I18n.t('announce.textAdded'));
    openTextDialog(box.id);
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
   * Apply a format's logical canvas size and the workspace class that places
   * the deleted-photo shelf. Shared by the start screen and project imports.
   */
  const applyFormatLayout = (format) => {
    Layout.setCanvasSize(format.canvasW, format.canvasH);
    document.documentElement.style.setProperty(
      '--canvas-w',
      `${format.canvasW}px`,
    );
    document.documentElement.style.setProperty(
      '--canvas-h',
      `${format.canvasH}px`,
    );

    // A portrait canvas puts the deleted-photo shelf on the left; landscape
    // and square canvases keep it along the bottom. Small screens always use
    // the bottom, which CSS handles.
    const landscape = format.canvasW > format.canvasH;
    const portrait = format.canvasH > format.canvasW;
    workspace.classList.toggle('is-landscape', landscape);
    workspace.classList.toggle('is-portrait', portrait);
  };

  /** Reveal the editor after a format choice or a project import. */
  const showEditor = () => {
    formatScreen.hidden = true;
    stage.hidden = false;
    actionBar.hidden = false;
    syncHistoryBar();
  };

  /**
   * Start the editor with the chosen format. The canvas keeps its logical
   * pixel size; only the CSS variables and the scale change, so the same
   * weight-based layout reflows into the new shape.
   */
  const chooseFormat = (format) => {
    if (editing) return;
    editing = true;

    applyFormatLayout(format);
    // The spots bitmap is cropped to the canvas, so it follows the format.
    applyCanvasPaint();

    // Portrait and square formats start with rows; landscape formats start
    // with the transposed columns. The starting canvas is empty, so no
    // structure turn is needed.
    State.setOrientation(
      format.canvasW > format.canvasH ? 'column' : 'row',
      false,
    );

    showEditor();
    refresh();
    fitCanvas();
    Render.focusCanvas();
    const name = format.nameKey ? I18n.t(format.nameKey) : '';
    Render.announce(
      I18n.t(name ? 'format.selectedNamed' : 'format.selected', {
        label: format.label,
        name,
        w: format.canvasW,
        h: format.canvasH,
      }),
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
    if (!found || !found.box.image || found.box.visible === false) return null;
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
      Render.announce(
        I18n.t('announce.zoom', { n: Math.round(zoom * 100) }),
      );
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
    Render.announce(
      I18n.t('announce.zoom', { n: Math.round(next * 100) }),
    );
  };

  const resetZoom = () => {
    const target = selectedTarget();
    if (!target) return;
    if (!State.setBoxZoom(target.box.id, 1)) return;
    Render.updatePhoto();
    Render.announce(I18n.t('announce.zoomReset'));
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

    Render.setRotateSnap(false);
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

    // Quarter turns snap magnetically; outside the window the raw angle wins.
    const raw = rotateDrag.startRotation + delta;
    Render.setRotateSnap(State.isRotationSnapped(raw));
    const rotation = State.snapRotation(raw);
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
    Render.setRotateSnap(false);
    try {
      rotateHandle.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }
    if (moved && event.type === 'pointerup') {
      Render.announce(
        I18n.t('announce.rotation', { n: Math.round(rotation) }),
      );
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
      I18n.t('announce.rotation', { n: Math.round(target.box.rotation) }),
    );
  };

  const resetRotation = () => {
    const target = selectedTarget();
    if (!target) return;
    if (!State.setBoxRotation(target.box.id, 0)) return;
    clampZoomToRange(target.box.id);
    Render.updatePhoto();
    Render.announce(I18n.t('announce.rotationReset'));
  };

  // --- free-form interactions ---------------------------------------------

  const freeCenterClient = (box) => {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? rect.width / Layout.canvasW : 1;
    return {
      x: rect.left + box.x * scale,
      y: rect.top + box.y * scale,
    };
  };

  const stopFreeGesture = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const startFreeMove = (event, element) => {
    if (freeMoveDrag || freeScaleDrag || freeRotateDrag) return;
    const found = State.findFreeBox(element.dataset.freeId);
    if (!found) return;
    // The free layer is a sibling of the canvas, so the canvas boundary and
    // pan gestures never see this pointerdown; leave propagation alone so
    // global dismiss handlers still run.

    // Selecting on pointerdown makes an unselected box draggable in one
    // gesture. paintSelection updates chrome in place, so the element stays.
    if (State.selectedFreeId !== found.box.id) {
      State.selectFree(found.box.id);
      Render.paintSelection(State);
    }
    Render.focusFreeBox(found.box.id);

    freeMoveDrag = {
      pointerId: event.pointerId,
      freeId: found.box.id,
      capture: element,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: found.box.x,
      startY: found.box.y,
      moved: false,
    };
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort for synthetic pointers.
    }
    window.addEventListener('pointermove', moveFreeMove);
    window.addEventListener('pointerup', finishFreeMove);
    window.addEventListener('pointercancel', finishFreeMove);
  };

  const moveFreeMove = (event) => {
    if (!freeMoveDrag || event.pointerId !== freeMoveDrag.pointerId) return;

    const dx = event.clientX - freeMoveDrag.startClientX;
    const dy = event.clientY - freeMoveDrag.startClientY;
    if (!freeMoveDrag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      freeMoveDrag.moved = true;
    }

    const scale = canvasScale() || 1;
    if (
      !State.setFreePosition(
        freeMoveDrag.freeId,
        freeMoveDrag.startX + dx / scale,
        freeMoveDrag.startY + dy / scale,
      )
    ) {
      return;
    }
    const found = State.findFreeBox(freeMoveDrag.freeId);
    if (found) Render.updateFreeBox(found.box);
  };

  const finishFreeMove = (event) => {
    if (!freeMoveDrag || event.pointerId !== freeMoveDrag.pointerId) return;
    const moved = freeMoveDrag.moved;
    const capture = freeMoveDrag.capture;
    freeMoveDrag = null;
    try {
      capture.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }
    window.removeEventListener('pointermove', moveFreeMove);
    window.removeEventListener('pointerup', finishFreeMove);
    window.removeEventListener('pointercancel', finishFreeMove);
    if (moved) ignoreCanvasClickUntil = performance.now() + 300;
  };

  const startFreeScale = (event, element) => {
    if (freeMoveDrag || freeScaleDrag || freeRotateDrag) return;
    const found = State.findFreeBox(element.dataset.freeId);
    if (!found) return;
    stopFreeGesture(event);
    if (event.target instanceof HTMLElement) {
      event.target.focus({ preventScroll: true });
    }

    const center = freeCenterClient(found.box);
    freeScaleDrag = {
      pointerId: event.pointerId,
      freeId: found.box.id,
      capture: element,
      centerX: center.x,
      centerY: center.y,
      startDistance: Math.max(
        1,
        Math.hypot(event.clientX - center.x, event.clientY - center.y),
      ),
      startWidth: found.box.width,
      moved: false,
    };
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort for synthetic pointers.
    }
    window.addEventListener('pointermove', moveFreeScale);
    window.addEventListener('pointerup', finishFreeScale);
    window.addEventListener('pointercancel', finishFreeScale);
  };

  const moveFreeScale = (event) => {
    if (!freeScaleDrag || event.pointerId !== freeScaleDrag.pointerId) return;

    // Dragging the corner away from the centre scales the box by the distance
    // ratio, matching the photo zoom gesture.
    const distance = Math.hypot(
      event.clientX - freeScaleDrag.centerX,
      event.clientY - freeScaleDrag.centerY,
    );
    const width =
      freeScaleDrag.startWidth * (distance / freeScaleDrag.startDistance);
    if (!freeScaleDrag.moved) {
      if (Math.abs(width - freeScaleDrag.startWidth) < 0.5) return;
      freeScaleDrag.moved = true;
    }

    if (!State.setFreeScale(freeScaleDrag.freeId, width)) return;
    const found = State.findFreeBox(freeScaleDrag.freeId);
    if (found) Render.updateFreeBox(found.box);
  };

  const finishFreeScale = (event) => {
    if (!freeScaleDrag || event.pointerId !== freeScaleDrag.pointerId) return;
    const moved = freeScaleDrag.moved;
    const freeId = freeScaleDrag.freeId;
    const capture = freeScaleDrag.capture;
    freeScaleDrag = null;
    try {
      capture.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }
    window.removeEventListener('pointermove', moveFreeScale);
    window.removeEventListener('pointerup', finishFreeScale);
    window.removeEventListener('pointercancel', finishFreeScale);

    if (moved && event.type === 'pointerup') {
      const found = State.findFreeBox(freeId);
      if (found) {
        Render.announce(
          I18n.t('announce.freeScale', {
            n: Math.round(found.box.width),
          }),
        );
      }
    }
  };

  const startFreeRotate = (event, element) => {
    if (freeMoveDrag || freeScaleDrag || freeRotateDrag) return;
    const found = State.findFreeBox(element.dataset.freeId);
    if (!found) return;
    Render.setRotateSnap(false);
    stopFreeGesture(event);
    if (event.target instanceof HTMLElement) {
      event.target.focus({ preventScroll: true });
    }

    const center = freeCenterClient(found.box);
    freeRotateDrag = {
      pointerId: event.pointerId,
      freeId: found.box.id,
      capture: element,
      center,
      startAngle: pointerAngle(event, center),
      startRotation: found.box.rotation,
      moved: false,
    };
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort for synthetic pointers.
    }
    window.addEventListener('pointermove', moveFreeRotate);
    window.addEventListener('pointerup', finishFreeRotate);
    window.addEventListener('pointercancel', finishFreeRotate);
  };

  const moveFreeRotate = (event) => {
    if (!freeRotateDrag || event.pointerId !== freeRotateDrag.pointerId) return;

    let delta =
      pointerAngle(event, freeRotateDrag.center) - freeRotateDrag.startAngle;
    if (delta > 180) delta -= 360;
    else if (delta <= -180) delta += 360;

    if (!freeRotateDrag.moved) {
      if (Math.abs(delta) < 0.5) return;
      freeRotateDrag.moved = true;
    }

    const raw = freeRotateDrag.startRotation + delta;
    Render.setRotateSnap(State.isRotationSnapped(raw));
    if (
      !State.setFreeRotation(freeRotateDrag.freeId, State.snapRotation(raw))
    ) {
      return;
    }
    const found = State.findFreeBox(freeRotateDrag.freeId);
    if (found) Render.updateFreeBox(found.box);
  };

  const finishFreeRotate = (event) => {
    if (!freeRotateDrag || event.pointerId !== freeRotateDrag.pointerId) return;
    const moved = freeRotateDrag.moved;
    const freeId = freeRotateDrag.freeId;
    const capture = freeRotateDrag.capture;
    freeRotateDrag = null;
    Render.setRotateSnap(false);
    try {
      capture.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released.
    }
    window.removeEventListener('pointermove', moveFreeRotate);
    window.removeEventListener('pointerup', finishFreeRotate);
    window.removeEventListener('pointercancel', finishFreeRotate);

    if (moved && event.type === 'pointerup') {
      const found = State.findFreeBox(freeId);
      if (found) {
        Render.announce(
          I18n.t('announce.freeRotation', {
            n: Math.round(found.box.rotation),
          }),
        );
      }
    }
  };

  const nudgeFreeScale = (factor) => {
    const found = State.findFreeBox(State.selectedFreeId);
    if (!found) return;
    if (!State.setFreeScale(found.box.id, found.box.width * factor)) return;
    Render.updateFreeBox(found.box);
    Render.announce(
      I18n.t('announce.freeScale', { n: Math.round(found.box.width) }),
    );
  };

  const nudgeFreeRotation = (amount) => {
    const found = State.findFreeBox(State.selectedFreeId);
    if (!found) return;
    if (!State.setFreeRotation(found.box.id, found.box.rotation + amount)) {
      return;
    }
    Render.updateFreeBox(found.box);
    Render.announce(
      I18n.t('announce.freeRotation', {
        n: Math.round(found.box.rotation),
      }),
    );
  };

  const resetFreeRotation = () => {
    const found = State.findFreeBox(State.selectedFreeId);
    if (!found) return;
    if (!State.setFreeRotation(found.box.id, 0)) return;
    Render.updateFreeBox(found.box);
    Render.announce(I18n.t('announce.freeRotationReset'));
  };

  const nudgeFreePosition = (dx, dy) => {
    const found = State.findFreeBox(State.selectedFreeId);
    if (!found) return;
    if (
      !State.setFreePosition(
        found.box.id,
        found.box.x + dx,
        found.box.y + dy,
      )
    ) {
      return;
    }
    Render.updateFreeBox(found.box);
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
    const item = event.target.closest(
      'button[data-format], button[data-project]',
    );
    if (!item) return;
    if (item.dataset.project === 'export') {
      closeSaveMenu(true);
      void exportProject();
      return;
    }
    if (item.dataset.project === 'import') {
      closeSaveMenu(true);
      projectInput.click();
      return;
    }
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
    if (
      (colorMenuOpen || gradientStyleMenuOpen || gradientMenuOpen) &&
      !colorMenuWrap.contains(event.target)
    ) {
      closeColorMenu();
      closeGradientStyleMenu();
      closeGradientMenu();
    }
    if (!fillMenu.hidden && !fillMenuWrap.contains(event.target)) {
      closeFillMenu();
    }
    if (!tintMenu.hidden && !tintMenuWrap.contains(event.target)) {
      closeTintMenu();
    }
    if (!fontMenu.hidden && !fontMenuWrap.contains(event.target)) {
      closeFontMenu();
    }
    if (!textColorMenu.hidden && !textColorMenuWrap.contains(event.target)) {
      closeTextColorMenu();
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
    Render.announce(
      I18n.t('announce.borderThickness', { n: State.borderThickness }),
    );
  });

  marginColorButton.addEventListener('click', () => {
    if (colorMenuOpen) closeColorMenu(true);
    else if (gradientStyleMenuOpen) closeGradientStyleMenu(true);
    else if (gradientMenuOpen) closeGradientMenu(true);
    else openColorMenu();
  });

  colorMenu.addEventListener('click', (event) => {
    const preset = event.target.closest('[data-preset-id]');
    if (preset) {
      applyPreset(preset.dataset.presetId);
      return;
    }
    if (event.target.closest('[data-shuffle]')) {
      shuffleSpots();
      return;
    }
    const stop = event.target.closest('[data-gradient-stop]');
    if (stop) {
      if (State.canvasMode === 'gradient') {
        openGradientMenu(stop.dataset.gradientStop);
      } else {
        // The single row in Fill mode edits the solid canvas color.
        closeColorMenu();
        openMarginPicker();
      }
      return;
    }
    const item = event.target.closest('[data-paint]');
    if (!item) return;
    if (item.dataset.paint === 'gradient') {
      openGradientStyleMenu();
      return;
    }
    closeColorMenu();
    openMarginPicker();
  });

  gradientStyleMenu.addEventListener('click', (event) => {
    const item = event.target.closest('[data-gradient-style]');
    if (!item) return;
    chooseGradientStyle(item.dataset.gradientStyle);
  });

  // The panel rows are buttons, so they carry the whole click target; the
  // color inputs behind them stay visually hidden but keep the picker.
  gradientMenu.addEventListener('click', (event) => {
    const preset = event.target.closest('[data-preset-id]');
    if (preset) {
      applyPreset(preset.dataset.presetId);
      return;
    }
    const row = event.target.closest('[data-gradient-pick]');
    if (!row) return;
    openSwatchPicker(
      row.dataset.gradientPick === 'bottom'
        ? gradientBottomInput
        : gradientTopInput,
    );
  });

  marginColorInput.addEventListener('input', () => {
    if (State.setCanvasColor(marginColorInput.value)) applyCanvasPaint();
  });

  marginColorInput.addEventListener('change', () => {
    Render.announce(
      I18n.t('announce.marginColor', { color: State.canvasColor }),
    );
  });

  const applyGradient = () => {
    const top = gradientTopInput.value;
    const bottom = gradientBottomInput.value;
    if (!State.setCanvasGradient(top, bottom)) return;
    syncGradientChips();
    applyCanvasPaint();
  };

  gradientTopInput.addEventListener('input', applyGradient);
  gradientBottomInput.addEventListener('input', applyGradient);

  // Both stops are announced on commit, not on every live swatch update.
  const announceGradient = () => {
    Render.announce(
      I18n.t('announce.gradient', {
        top: State.gradientTop,
        bottom: State.gradientBottom,
      }),
    );
  };

  gradientTopInput.addEventListener('change', announceGradient);
  gradientBottomInput.addEventListener('change', announceGradient);

  fillButton.addEventListener('click', () => {
    if (fillMenu.hidden) openFillMenu();
    else closeFillMenu(true);
  });

  // The row edits the cell color; the input previews live, like the margin
  // stop rows do.
  fillColorRow.addEventListener('click', () => {
    if (!fillTarget()) return;
    syncFillMenu();
    openSwatchPicker(fillColorInput);
  });

  fillColorInput.addEventListener('input', () => {
    applyFill({ color: fillColorInput.value });
  });

  fillOpacity.addEventListener('input', () => {
    const percent = Number(fillOpacity.value);
    fillOpacityValue.textContent = I18n.t('fill.value', { n: percent });
    fillOpacity.setAttribute(
      'aria-valuetext',
      I18n.t('fill.percent', { n: percent }),
    );
    applyFill({ opacity: percent / 100 });
  });

  fillColorInput.addEventListener('change', announceFill);
  fillOpacity.addEventListener('change', announceFill);

  fillMenuWrap.addEventListener('keydown', (event) => {
    if (fillMenu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeFillMenu(true);
    } else if (event.key === 'Tab') {
      closeFillMenu();
    }
  });

  tintButton.addEventListener('click', () => {
    if (tintMenu.hidden) openTintMenu();
    else closeTintMenu(true);
  });

  // The row reopens the picker for the current photo; the input previews live.
  tintColorRow.addEventListener('click', () => {
    if (!tintTarget()) return;
    syncTintMenu();
    openSwatchPicker(tintColorInput);
  });

  tintColorInput.addEventListener('input', () => {
    applyTint(tintColorInput.value);
  });

  tintColorInput.addEventListener('change', announceTint);

  tintClearRow.addEventListener('click', () => {
    applyTint(null);
    closeTintMenu(true);
    Render.announce(I18n.t('announce.tintOff'));
  });

  tintMenuWrap.addEventListener('keydown', (event) => {
    if (tintMenu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTintMenu(true);
    } else if (event.key === 'Tab') {
      closeTintMenu();
    }
  });

  fontButton.addEventListener('click', () => {
    if (fontMenu.hidden) openFontMenu();
    else closeFontMenu(true);
  });

  fontButton.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openFontMenu();
    }
  });

  fontMenu.addEventListener('click', (event) => {
    const item = event.target.closest('[data-font]');
    if (item) void applyTextFont(item.dataset.font);
  });

  fontMenu.addEventListener('keydown', (event) => {
    const items = fontMenuItems();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeFontMenu(true);
      return;
    } else if (event.key === 'Tab') {
      closeFontMenu();
      return;
    } else {
      return;
    }
    event.preventDefault();
    items[next].focus({ preventScroll: true });
  });

  // Tabbing out of the font menu closes it, matching the border popover.
  fontMenuWrap.addEventListener('focusout', (event) => {
    if (!fontMenuWrap.contains(event.relatedTarget)) closeFontMenu();
  });

  textColorButton.addEventListener('click', () => {
    if (textColorMenu.hidden) openTextColorMenu();
    else closeTextColorMenu(true);
  });

  textColorButton.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openTextColorMenu(event.key === 'ArrowUp');
    }
  });

  // The icon-only alignment row changes the selected text box in place.
  textAlignRow.addEventListener('click', (event) => {
    const button = event.target.closest('[data-text-align]');
    if (!button) return;
    applyTextAlign(button.dataset.textAlign);
  });

  // Bold, italic, and underline are independent toggles.
  textStyleRow.addEventListener('click', (event) => {
    const button = event.target.closest('[data-text-style]');
    const found = State.findFreeBox(State.selectedFreeId);
    if (!button || !found) return;
    const style = button.dataset.textStyle;
    applyTextStyle(style, !found.box[style]);
  });

  // Each row opens its own picker; the picker previews live on the canvas.
  textColorRow.addEventListener('click', () => {
    if (!textColorTarget()) return;
    syncTextColorMenu();
    openSwatchPicker(textColorInput);
  });

  textOutlineRow.addEventListener('click', () => {
    if (!textColorTarget()) return;
    syncTextColorMenu();
    openSwatchPicker(textOutlineInput);
  });

  textColorInput.addEventListener('input', () => {
    applyTextColor('text', textColorInput.value);
  });

  textOutlineInput.addEventListener('input', () => {
    applyTextColor('outline', textOutlineInput.value);
  });

  textOutlineWidth.addEventListener('input', () => {
    applyTextOutlineWidth(Number(textOutlineWidth.value));
  });

  textOutlineWidth.addEventListener('change', announceTextOutlineWidth);

  textColorInput.addEventListener('change', () => {
    Render.announce(
      I18n.t('announce.textColor', { color: textColorInput.value }),
    );
  });

  textOutlineInput.addEventListener('change', () => {
    Render.announce(
      I18n.t('announce.outlineColor', { color: textOutlineInput.value }),
    );
  });

  // Background controls sit at the bottom of the same menu and only show while
  // the text box's backdrop is switched on.
  textBackgroundRow.addEventListener('click', () => {
    if (!textBackgroundTarget()) return;
    syncTextColorMenu();
    openSwatchPicker(textBackgroundInput);
  });

  textBackgroundInput.addEventListener('input', () => {
    applyTextBackground({ color: textBackgroundInput.value });
  });

  textBackgroundInput.addEventListener('change', announceTextBackground);

  textBackgroundOpacity.addEventListener('input', () => {
    const percent = Number(textBackgroundOpacity.value);
    textBackgroundOpacityValue.textContent = I18n.t('fill.value', { n: percent });
    textBackgroundOpacity.setAttribute(
      'aria-valuetext',
      I18n.t('fill.percent', { n: percent }),
    );
    applyTextBackground({ opacity: percent / 100 });
  });

  textBackgroundOpacity.addEventListener('change', announceTextBackground);

  textColorMenuWrap.addEventListener('keydown', (event) => {
    if (textColorMenu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTextColorMenu(true);
    } else if (event.key === 'Tab') {
      closeTextColorMenu();
    }
  });

  colorMenu.addEventListener('keydown', (event) => {
    const items = colorMenuItems();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeColorMenu(true);
      return;
    } else if (event.key === 'Tab') {
      closeColorMenu();
      return;
    } else {
      return;
    }
    event.preventDefault();
    items[next].focus({ preventScroll: true });
  });

  gradientMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeGradientMenu(true);
      return;
    }
    if (event.key === 'Tab') {
      closeGradientMenu();
      return;
    }

    const items = gradientMenuItems();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;

    event.preventDefault();
    items[next].focus({ preventScroll: true });
  });

  gradientStyleMenu.addEventListener('keydown', (event) => {
    const items = gradientStyleItems();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeGradientStyleMenu(true);
      return;
    } else if (event.key === 'Tab') {
      closeGradientStyleMenu();
      return;
    } else {
      return;
    }
    event.preventDefault();
    items[next].focus({ preventScroll: true });
  });

  marginColorButton.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openColorMenu(event.key === 'ArrowUp');
    }
  });

  addRowTop.addEventListener('click', () => addRow('start'));
  addRowBottom.addEventListener('click', () => addRow('end'));
  addFreeButton.addEventListener('click', addFreeBox);
  addTextButton.addEventListener('click', addTextBox);
  barAddFreeButton.addEventListener('click', addFreeBox);
  barAddTextButton.addEventListener('click', addTextBox);

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
    discardPendingDelete();
    if (!State.addBox(rowId)) return;
    refresh();
    // Keep keyboard focus on the group's add button after the rails re-render.
    const rebuilt = rail && rail.querySelector(`[data-row-id="${rowId}"]`);
    if (rebuilt) rebuilt.focus({ preventScroll: true });
    Render.announce(
      I18n.t('announce.boxAdded', {
        group: I18n.t(isColumnMode() ? 'group.column' : 'group.row'),
        n: rowIndex + 1,
      }),
    );
  };

  railLeft.addEventListener('click', handlesAddBox);
  railRight.addEventListener('click', handlesAddBox);

  undoButton.addEventListener('click', undoDelete);

  freeLayer.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const handle = target.closest('.free-scale, .free-rotate');
    if (handle) {
      const element = handle.closest('.free-box, .free-ghost');
      if (!element) return;
      if (handle.classList.contains('free-scale')) {
        startFreeScale(event, element);
      } else {
        startFreeRotate(event, element);
      }
      return;
    }

    const element = target.closest('.free-box, .free-ghost');
    if (element) startFreeMove(event, element);
  });

  freeLayer.addEventListener('click', (event) => {
    const element = event.target.closest('.free-box, .free-ghost');
    if (!element) return;
    if (State.selectedFreeId !== element.dataset.freeId) {
      State.selectFree(element.dataset.freeId);
      Render.paintSelection(State);
    }
  });

  freeLayer.addEventListener('dblclick', (event) => {
    const element = event.target.closest('.free-box, .free-ghost');
    if (!element) return;
    if (event.target.closest('.free-scale, .free-rotate')) return;
    event.preventDefault();
    const freeId = element.dataset.freeId;
    if (State.selectedFreeId !== freeId) {
      State.selectFree(freeId);
      Render.paintSelection(State);
    }
    openFreeEditor(freeId);
  });

  freeLayer.addEventListener('keydown', (event) => {
    const handle = event.target.closest('.free-scale, .free-rotate');
    if (handle) {
      const isScale = handle.classList.contains('free-scale');
      if (isScale) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
          nudgeFreeScale(1.1);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
          nudgeFreeScale(1 / 1.1);
        } else {
          return;
        }
      } else {
        const step = event.shiftKey ? 15 : 1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          nudgeFreeRotation(step);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          nudgeFreeRotation(-step);
        } else if (event.key === 'Home') {
          resetFreeRotation();
        } else {
          return;
        }
      }
      event.preventDefault();
      return;
    }

    const element = event.target.closest('.free-box, .free-ghost');
    if (!element) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const freeId = element.dataset.freeId;
      selectFreeAndFocus(freeId);
      openFreeEditor(freeId);
    }
  });

  historyList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-history-id]');
    if (!button) return;
    const entry = History.find(button.dataset.historyId);
    if (entry) addHistoryPhoto(entry);
  });

  /** Empty the deleted-photo shelf and remove its stored copies. */
  historyClearButton.addEventListener('click', async () => {
    await History.clear();
    syncHistoryBar();
    // The bar disappears with the last entry, so keep keyboard focus in the
    // editor instead of losing it with the hidden button.
    Render.focusCanvas();
    Render.announce(I18n.t('announce.historyCleared'));
  });

  canvas.addEventListener('click', (event) => {
    if (performance.now() < ignoreCanvasClickUntil) return;
    if (event.target.closest('.zoom-handle')) return;

    const box = event.target.closest('.box');
    if (box) {
      const boxId = box.dataset.boxId;
      if (State.selectedBoxId !== boxId && State.select(boxId)) {
        Render.paintSelection(State);
        Render.announce(
          I18n.t('announce.selected', { n: boxNumber(boxId) }),
        );
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
    // The turn reorders the groups, so a pending undo no longer has a place.
    discardPendingDelete();
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
      I18n.t(
        next === 'column'
          ? count === 1
            ? 'layout.columnOne'
            : 'layout.columns'
          : count === 1
            ? 'layout.rowOne'
            : 'layout.rows',
        { count },
      ),
    );
  });

  actionBar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    if (State.selectedFreeId) {
      if (button.dataset.action === 'delete-box') deleteSelected();
      else if (button.dataset.action === 'edit-text') {
        openTextDialog(State.selectedFreeId);
      } else if (button.dataset.action === 'select-image') {
        openFreePicker(State.selectedFreeId);
      } else if (button.dataset.action === 'crop-square') {
        toggleFreeSquare(State.selectedFreeId);
      } else if (button.dataset.action === 'free-border') {
        toggleFreeBorder(State.selectedFreeId);
      } else if (button.dataset.action === 'free-background') {
        toggleFreeBackground(State.selectedFreeId);
      }
      return;
    }

    const boxId = State.selectedBoxId;
    if (!boxId) return;

    if (button.dataset.action === 'delete-box') deleteSelected();
    else if (button.dataset.action === 'select-image') openPicker(boxId);
    else if (button.dataset.action === 'lock-square') toggleBoxLock(boxId, 'square');
    else if (button.dataset.action === 'lock-aspect') toggleBoxLock(boxId, 'aspect');
    else if (button.dataset.action === 'toggle-visibility') {
      toggleBoxVisibility(boxId);
    }
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
      event.target.closest('.free-box') ||
      event.target.closest('.free-ghost') ||
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

  projectInput.addEventListener('change', () => {
    void importProjectFile(projectInput.files && projectInput.files[0]);
  });

  // --- text dialog --------------------------------------------------------

  // Everything except the textarea and its two buttons cancels: the overlay,
  // the panel background, the Cancel button, and Escape all discard the edits.
  textDialog.addEventListener('click', (event) => {
    if (event.target.closest('textarea, button')) return;
    closeTextDialog();
  });

  textDialogCancel.addEventListener('click', () => closeTextDialog());
  textDialogSave.addEventListener('click', saveTextDialog);

  textDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTextDialog();
      return;
    }
    // Ctrl/Cmd+Enter saves without reaching for the mouse.
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      saveTextDialog();
      return;
    }
    // Keep Tab inside the modal: textarea → Cancel → Save → textarea.
    if (event.key === 'Tab') {
      const focusables = [textDialogInput, textDialogCancel, textDialogSave];
      const index = focusables.indexOf(document.activeElement);
      if (!event.shiftKey && index === focusables.length - 1) {
        event.preventDefault();
        textDialogInput.focus();
      } else if (event.shiftKey && index <= 0) {
        event.preventDefault();
        textDialogSave.focus();
      }
    }
  });

  // Keep the page behind the modal from moving while the dialog is open.
  document.addEventListener('keydown', (event) => {
    if (!editing || !textDialog.hidden) return;
    if (event.defaultPrevented || isTextEntry(event.target)) return;

    if (event.key === 'Escape') {
      if (State.selectedBoxId || State.selectedFreeId) {
        event.preventDefault();
        deselect();
      }
      return;
    }

    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      (State.selectedBoxId || State.selectedFreeId)
    ) {
      event.preventDefault();
      deleteSelected();
      return;
    }

    if (event.key.startsWith('Arrow')) {
      if (State.selectedFreeId) {
        event.preventDefault();
        const step = event.shiftKey ? 1 : 10;
        const dx =
          event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy =
          event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        nudgeFreePosition(dx, dy);
        return;
      }
      if (State.boxCount > 0) {
        event.preventDefault();
        moveSelection(event.key);
      }
    }
  });

  new ResizeObserver(queueFit).observe(editorArea);
  window.addEventListener('resize', queueFit);

  I18n.apply();
  buildPresetChips();
  buildFontMenu();
  Render.init();
  History.load();
  syncHistoryBar();
  applyCanvasPaint();
  applyBorderThickness();
  Render.paintFormats(FORMATS, chooseFormat);
  refresh();

  const firstFormat = document.querySelector('#format-options .format-button');
  if (firstFormat) firstFormat.focus({ preventScroll: true });
})();
