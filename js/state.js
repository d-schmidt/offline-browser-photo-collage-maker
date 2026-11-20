'use strict';

/**
 * Single source of truth for the collage. Rows and boxes only carry relative
 * weights; pixel sizes are derived by Layout on every render.
 *
 * A row is a horizontal group in row mode and a vertical group in column mode.
 * The state keeps the same shape in both modes: groups ordered along the flow
 * axis, boxes ordered across it. Layout transposes the math for columns.
 */
const State = (() => {
  const rows = [];
  // Free-form photos live above the weighted grid. They keep their own canvas
  // coordinates, rotation, and a locked aspect ratio instead of weights.
  const freeBoxes = [];
  let selectedBoxId = null;
  let selectedFreeId = null;
  let canvasColor = '#ffffff';
  // The canvas margin is either one color or a two-stop gradient.
  let canvasMode = 'fill';
  let gradientTop = '#f5f2eb';
  let gradientBottom = '#dfd6c7';
  let gradientStyle = 'vertical';
  const GRADIENT_STYLES = new Set([
    'vertical',
    'horizontal',
    'radial',
    'spots',
  ]);
  let borderThickness = METRICS.pad;
  let orientation = 'row';
  let sequence = 0;
  let lockSequence = 0;

  const uid = (kind) => `${kind}-${(sequence += 1)}`;

  const createBox = (weight) => ({
    id: uid('box'),
    weight,
    image: null,
    visible: true,
    lock: null,
    ratio: null,
    lockSeq: 0,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  });

  const createRow = (weight) => ({
    id: uid('row'),
    weight,
    boxes: [createBox(1)],
  });

  const meanWeight = (items) =>
    items.length
      ? items.reduce((sum, item) => sum + item.weight, 0) / items.length
      : 1;

  // Keep weights near 1 so long editing sessions cannot drift into huge or
  // tiny numbers. Ratios inside the group are preserved.
  const normalizeWeights = (items) => {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    if (total <= 0 || items.length === 0) return;
    const factor = items.length / total;
    for (const item of items) item.weight *= factor;
  };

  const findBox = (boxId) => {
    if (!boxId) return null;
    for (const row of rows) {
      const index = row.boxes.findIndex((box) => box.id === boxId);
      if (index !== -1) return { row, box: row.boxes[index], index };
    }
    return null;
  };

  const findRow = (rowId) => rows.find((row) => row.id === rowId) || null;

  // --- free-form layer ----------------------------------------------------

  // 40 px is the smallest photo side a free-form box may keep, matching the
  // grid box minimum. The frame is added on top of it.
  const FREE_MIN_WIDTH = 40;
  const FREE_SIZE_SHARE = 0.32;

  const freeMaxWidth = () =>
    Math.max(Layout.canvasW, Layout.canvasH) * 3;

  // The visible frame per side around a free-form photo: two margins, matching
  // the gap between two grid photos.
  const freeFrame = (box) =>
    box.border !== false && box.image && borderThickness > 0
      ? 2 * borderThickness
      : 0;

  /**
   * Width limit for a free-form box. The 40 px photo minimum applies to both
   * inner sides, and the frame keeps its full width around it, so the box
   * cannot shrink until the frame or the photo would be squeezed.
   */
  const clampFreeWidth = (box, width) => {
    const inner = FREE_MIN_WIDTH + 2 * freeFrame(box);
    const minimum = inner * Math.max(1, box.aspect || 1);
    return Math.min(freeMaxWidth(), Math.max(minimum, width));
  };

  const createFreeBox = () => {
    const size = Math.round(
      Math.min(Layout.canvasW, Layout.canvasH) * FREE_SIZE_SHARE,
    );
    const box = {
      id: uid('free'),
      // Stored as the centre so rotation and scaling stay around the middle.
      x: Layout.canvasW / 2,
      y: Layout.canvasH / 2,
      width: Math.max(FREE_MIN_WIDTH, size),
      // Width ÷ height. Empty boxes are square; a photo brings its own ratio.
      aspect: 1,
      rotation: 0,
      // Set by the square crop action: keep 1:1 instead of the photo ratio.
      square: false,
      // Free-form photos keep the usual margin frame unless it is switched off.
      border: true,
      image: null,
    };
    box.width = clampFreeWidth(box, box.width);
    return box;
  };

  const freeHeight = (box) => box.width / (box.aspect || 1);

  const imageAspect = (image) =>
    image && image.width > 0 && image.height > 0
      ? image.width / image.height
      : 1;

  /**
   * Change a free-form box ratio while its area, and so its weight, stays put.
   */
  const resizeFreeToAspect = (box, aspect) => {
    const area = box.width * freeHeight(box);
    box.aspect = aspect;
    box.width = clampFreeWidth(box, Math.sqrt(area * aspect));
  };

  const findFreeBox = (freeId) => {
    if (!freeId) return null;
    const index = freeBoxes.findIndex((box) => box.id === freeId);
    return index === -1 ? null : { box: freeBoxes[index], index };
  };

  /** Add an empty square free-form box at the canvas centre. */
  const addFreeBox = () => {
    const box = createFreeBox();
    freeBoxes.push(box);
    return box;
  };

  const removeFreeBox = (freeId) => {
    const found = findFreeBox(freeId);
    if (!found) return null;
    freeBoxes.splice(found.index, 1);
    if (selectedFreeId === freeId) selectedFreeId = null;
    return { box: found.box, index: found.index };
  };

  const restoreFreeBox = (snapshot) => {
    if (!snapshot || !snapshot.box) return null;
    const index = Math.min(Math.max(0, snapshot.index || 0), freeBoxes.length);
    snapshot.box.width = clampFreeWidth(snapshot.box, snapshot.box.width);
    freeBoxes.splice(index, 0, snapshot.box);
    selectedBoxId = null;
    selectedFreeId = snapshot.box.id;
    return snapshot.box;
  };

  const setFreeImage = (freeId, image) => {
    const found = findFreeBox(freeId);
    if (!found) {
      Images.release(image);
      return false;
    }
    Images.release(found.box.image);
    found.box.image = image;
    // Keep the box area while its ratio follows the photo, so swapping a
    // landscape for a portrait photo does not make the box jump in size. An
    // active square crop outranks the new photo's own ratio.
    resizeFreeToAspect(found.box, found.box.square ? 1 : imageAspect(image));
    return true;
  };

  /**
   * Crop a free-form box to a square, or return it to its photo's own ratio.
   * Only a box with a photo can be cropped; an empty box is already square.
   */
  const setFreeSquare = (freeId, square) => {
    const found = findFreeBox(freeId);
    if (!found || !found.box.image) return false;
    found.box.square = Boolean(square);
    resizeFreeToAspect(
      found.box,
      found.box.square ? 1 : imageAspect(found.box.image),
    );
    return true;
  };

  const setFreePosition = (freeId, x, y) => {
    const found = findFreeBox(freeId);
    if (!found || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    // Keep the centre on the canvas so a dragged box can always be grabbed
    // again; its edges may still hang over the border.
    found.box.x = Math.min(Layout.canvasW, Math.max(0, x));
    found.box.y = Math.min(Layout.canvasH, Math.max(0, y));
    return true;
  };

  const setFreeScale = (freeId, width) => {
    const found = findFreeBox(freeId);
    if (!found || !Number.isFinite(width)) return false;
    found.box.width = clampFreeWidth(found.box, width);
    return true;
  };

  /** Show or hide the margin frame around a free-form photo. */
  const setFreeBorder = (freeId, border) => {
    const found = findFreeBox(freeId);
    if (!found) return false;
    found.box.border = Boolean(border);
    // Turning the frame on can make the current width too small for both the
    // frame and a 40 px photo, so the box grows to the new minimum.
    if (found.box.border) {
      found.box.width = clampFreeWidth(found.box, found.box.width);
    }
    return true;
  };

  /** Reset the photo framing without touching the image or its rotation. */
  const resetZoomPan = (box) => {
    box.zoom = 1;
    box.offsetX = 0;
    box.offsetY = 0;
  };

  const limitLocks = (row) => {
    // A row with several boxes keeps one unlocked box to absorb the remainder.
    if (row.boxes.length <= 1) return;
    if (!row.boxes.every((box) => box.lock)) return;
    const last = row.boxes[row.boxes.length - 1];
    last.lock = null;
    last.ratio = null;
    last.lockSeq = 0;
  };

  /** Insert a new row at the top or bottom; a row starts with one empty box. */
  const addRow = (position = 'end') => {
    const row = createRow(Math.max(0.0001, meanWeight(rows)));
    if (position === 'start') rows.unshift(row);
    else rows.push(row);
    normalizeWeights(rows);
    return row;
  };

  const addBox = (rowId) => {
    const row = findRow(rowId);
    if (!row) return null;
    const box = createBox(Math.max(0.0001, meanWeight(row.boxes)));
    row.boxes.push(box);
    normalizeWeights(row.boxes);
    limitLocks(row);
    return box;
  };

  /**
   * Remove a box; an emptied row is removed as well. The removed image stays
   * alive for the caller's one-step undo, which owns releasing it.
   */
  const removeBox = (boxId) => {
    const found = findBox(boxId);
    if (!found) return null;
    const { row, box, index } = found;
    const rowTotal = rows.reduce((sum, candidate) => sum + candidate.weight, 0);
    const boxTotal = row.boxes.reduce(
      (sum, candidate) => sum + candidate.weight,
      0,
    );
    // Remember the box's share of its row and the row's share of the stack;
    // the raw weights are renormalized by the removal and would not restore
    // the same proportions.
    const snapshot = {
      box,
      rowId: row.id,
      rowIndex: rows.indexOf(row),
      rowShare: rowTotal > 0 ? row.weight / rowTotal : 1,
      boxIndex: index,
      boxShare: boxTotal > 0 ? box.weight / boxTotal : 1,
    };

    row.boxes.splice(index, 1);

    if (row.boxes.length === 0) {
      rows.splice(rows.indexOf(row), 1);
      normalizeWeights(rows);
    } else {
      normalizeWeights(row.boxes);
      limitLocks(row);
    }

    if (selectedBoxId === boxId) selectedBoxId = null;
    return snapshot;
  };

  /**
   * Put the last removed box back where it came from, without its ratio lock.
   * The undo is only offered while the structure is unchanged, so the saved
   * row and box indexes still describe the current tree.
   */
  const restoreBox = (snapshot) => {
    if (!snapshot || !snapshot.box) return null;
    const box = snapshot.box;
    box.lock = null;
    box.ratio = null;
    box.lockSeq = 0;
    // Rebuild the saved weight from the saved share of the current siblings,
    // so the restored box keeps its former proportion without overwriting
    // sizes the user changed after the deletion.
    const weightFromShare = (share, siblings) => {
      const safe =
        Number.isFinite(share) && share > 0 ? Math.min(0.999, share) : 1;
      return siblings > 0 ? (siblings * safe) / (1 - safe) : 1;
    };

    let row = findRow(snapshot.rowId);
    if (!row) {
      const siblingWeight = rows.reduce(
        (sum, candidate) => sum + candidate.weight,
        0,
      );
      row = {
        id: snapshot.rowId,
        weight: weightFromShare(snapshot.rowShare, siblingWeight),
        boxes: [],
      };
      const rowIndex = Math.min(
        Math.max(0, snapshot.rowIndex),
        rows.length,
      );
      rows.splice(rowIndex, 0, row);
    }

    const siblingWeight = row.boxes.reduce(
      (sum, candidate) => sum + candidate.weight,
      0,
    );
    box.weight = weightFromShare(snapshot.boxShare, siblingWeight);
    const boxIndex = Math.min(
      Math.max(0, snapshot.boxIndex),
      row.boxes.length,
    );
    row.boxes.splice(boxIndex, 0, box);
    normalizeWeights(row.boxes);
    normalizeWeights(rows);
    limitLocks(row);
    selectedFreeId = null;
    selectedBoxId = box.id;
    return box;
  };

  const setImage = (boxId, image) => {
    const found = findBox(boxId);
    if (!found) {
      Images.release(image);
      return false;
    }
    Images.release(found.box.image);
    found.box.image = image;
    // Zoom and pan belong to the photo that was on screen, so a replacement
    // starts from the plain cover crop again. Loading a photo into a hidden
    // box reveals it, because the new photo was explicitly picked for it.
    resetZoomPan(found.box);
    found.box.rotation = 0;
    found.box.visible = true;
    if (found.box.lock === 'aspect' && image.width > 0 && image.height > 0) {
      found.box.ratio = image.width / image.height;
      enforceAspectLocks(found.row);
    }
    return true;
  };

  /** Show or hide a grid box without dropping its image or its space. */
  const setBoxVisible = (boxId, visible) => {
    const found = findBox(boxId);
    if (!found) return false;
    const next = Boolean(visible);
    if (found.box.visible === next) return false;
    found.box.visible = next;
    return true;
  };

  /** A multi-box row always keeps at least one box free to absorb the rest. */
  const canLockBox = (boxId) => {
    const found = findBox(boxId);
    if (!found || !found.box.image) return false;
    if (found.box.lock) return true;
    if (found.row.boxes.length === 1) return true;

    const locked = found.row.boxes.filter((box) => box.lock).length;
    return locked < found.row.boxes.length - 1;
  };

  const sameImageRatio = (a, b) =>
    Boolean(
      a &&
        b &&
        a.width > 0 &&
        a.height > 0 &&
        b.width > 0 &&
        b.height > 0 &&
        a.width * b.height === b.width * a.height,
    );

  const aspectReference = (row, excludeBoxId = null) => {
    let reference = null;
    for (const box of row.boxes) {
      if (box.id === excludeBoxId || box.lock !== 'aspect' || !box.image) continue;
      if (!reference || box.lockSeq < reference.lockSeq) reference = box;
    }
    return reference;
  };

  /** Aspect locks may repeat in a group only when the image ratios match. */
  const canAspectLock = (boxId) => {
    const found = findBox(boxId);
    if (!found || !found.box.image || !canLockBox(boxId)) return false;
    if (found.box.lock === 'aspect') return true;

    const reference = aspectReference(found.row, found.box.id);
    return !reference || sameImageRatio(found.box.image, reference.image);
  };

  const enforceAspectLocks = (row) => {
    const aspectBoxes = row.boxes
      .filter((box) => box.lock === 'aspect' && box.image)
      .sort((a, b) => a.lockSeq - b.lockSeq);
    if (aspectBoxes.length <= 1) return;

    const reference = aspectBoxes[0];
    for (let index = 1; index < aspectBoxes.length; index += 1) {
      if (!sameImageRatio(aspectBoxes[index].image, reference.image)) {
        aspectBoxes[index].lock = null;
        aspectBoxes[index].ratio = null;
        aspectBoxes[index].lockSeq = 0;
      }
    }
  };

  /** Set or release one of the exclusive width locks on a box. */
  const setBoxLock = (boxId, mode, ratio = null) => {
    const found = findBox(boxId);
    if (!found) return false;

    if (mode === null) {
      found.box.lock = null;
      found.box.ratio = null;
      found.box.lockSeq = 0;
      return true;
    }

    if (mode !== 'square' && mode !== 'aspect') return false;
    if (!Number.isFinite(ratio) || ratio <= 0) return false;

    if (mode === 'aspect') {
      if (!canAspectLock(boxId)) return false;
      if (found.box.lock !== 'aspect') found.box.lockSeq = (lockSequence += 1);
      found.box.lock = 'aspect';
      found.box.ratio = ratio;
      // The lock is only meaningful over the untouched cover crop, so start
      // from it and hide the zoom handle until the lock is released.
      resetZoomPan(found.box);
      enforceAspectLocks(found.row);
      return true;
    }

    if (!canLockBox(boxId)) return false;
    found.box.lock = 'square';
    found.box.ratio = ratio;
    found.box.lockSeq = 0;
    return true;
  };

  /**
   * Zoom is relative to the current cover crop. The layout applies the
   * rotation-aware lower bound and six-times-cover ceiling; storing a small
   * value keeps the next gesture continuous instead of jumping.
   */
  const setBoxZoom = (boxId, zoom) => {
    const found = findBox(boxId);
    // Aspect-locked boxes keep the natural crop, so they ignore zoom changes.
    if (!found || found.box.lock === 'aspect' || !Number.isFinite(zoom)) {
      return false;
    }
    found.box.zoom = Math.min(METRICS.maxZoom, Math.max(0.0001, zoom));
    return true;
  };

  /** Pan offsets are −1…1 shares of the image slack along each axis. */
  const setBoxPan = (boxId, offsetX, offsetY) => {
    const found = findBox(boxId);
    if (!found || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
      return false;
    }
    found.box.offsetX = Math.min(1, Math.max(-1, offsetX));
    found.box.offsetY = Math.min(1, Math.max(-1, offsetY));
    return true;
  };

  /** Keep rotation in the (−180, 180] range so the value stays readable. */
  const normalizeAngle = (degrees) => {
    let angle = degrees % 360;
    if (angle > 180) angle -= 360;
    else if (angle <= -180) angle += 360;
    return angle;
  };

  const setBoxRotation = (boxId, degrees) => {
    const found = findBox(boxId);
    if (!found || !Number.isFinite(degrees)) return false;
    found.box.rotation = normalizeAngle(degrees);
    return true;
  };

  /** Rotate a free-form box around its centre. */
  const setFreeRotation = (freeId, degrees) => {
    const found = findFreeBox(freeId);
    if (!found || !Number.isFinite(degrees)) return false;
    found.box.rotation = normalizeAngle(degrees);
    return true;
  };

  /** Replace a row's box weights, used to preserve widths when unlocking. */
  const setRowWeights = (rowId, weights) => {
    const row = findRow(rowId);
    if (!row || weights.length !== row.boxes.length) return false;

    let changed = false;
    row.boxes.forEach((box, index) => {
      const weight = weights[index];
      if (Number.isFinite(weight) && weight > 0) {
        box.weight = weight;
        changed = true;
      }
    });
    if (!changed) return false;

    normalizeWeights(row.boxes);
    return true;
  };

  /**
   * Replace every row weight with the given pixel heights. Used when a lone
   * aspect-locked row stops deriving its height from its width, so the layout
   * keeps its current heights instead of jumping.
   */
  const setRowHeights = (heights) => {
    if (!Array.isArray(heights) || heights.length !== rows.length) return false;
    if (!heights.every((height) => Number.isFinite(height) && height > 0)) {
      return false;
    }
    rows.forEach((row, index) => {
      row.weight = heights[index];
    });
    normalizeWeights(rows);
    return true;
  };

  /**
   * Split the combined weight of two adjacent rows so the upper row gets
   * `upperShare` of their height. The pair's total weight stays the same, so
   * every other row keeps its height.
   */
  const setRowSplit = (upperRowId, lowerRowId, upperShare) => {
    const upper = findRow(upperRowId);
    const lower = findRow(lowerRowId);
    if (!upper || !lower || !Number.isFinite(upperShare)) return false;

    const share = Math.min(0.999, Math.max(0.001, upperShare));
    const pairWeight = upper.weight + lower.weight;
    upper.weight = Math.max(0.0001, pairWeight * share);
    lower.weight = Math.max(0.0001, pairWeight * (1 - share));
    return true;
  };

  /** Same idea as setRowSplit, but for two neighboring boxes in one group. */
  const setBoxSplit = (leftBoxId, rightBoxId, leftShare) => {
    const left = findBox(leftBoxId);
    const right = findBox(rightBoxId);
    if (!left || !right || left.row !== right.row || !Number.isFinite(leftShare)) {
      return false;
    }

    const share = Math.min(0.999, Math.max(0.001, leftShare));
    const pairWeight = left.box.weight + right.box.weight;
    left.box.weight = Math.max(0.0001, pairWeight * share);
    right.box.weight = Math.max(0.0001, pairWeight * (1 - share));
    return true;
  };

  const select = (boxId) => {
    if (!boxId || !findBox(boxId)) {
      selectedBoxId = null;
      return false;
    }
    selectedFreeId = null;
    selectedBoxId = boxId;
    return true;
  };

  const selectFree = (freeId) => {
    if (!freeId || !findFreeBox(freeId)) {
      selectedFreeId = null;
      return false;
    }
    selectedBoxId = null;
    selectedFreeId = freeId;
    return true;
  };

  const clearSelection = () => {
    selectedBoxId = null;
    selectedFreeId = null;
  };

  const isHexColor = (value) =>
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

  /** Solid canvas margin/padding color; picking one leaves gradient mode. */
  const setCanvasColor = (value) => {
    if (!isHexColor(value)) return false;
    canvasColor = value.toLowerCase();
    canvasMode = 'fill';
    return true;
  };

  /**
   * Two-stop canvas gradient. The style decides the axis or shape that carries
   * the first color to the second.
   */
  const setCanvasGradient = (top, bottom, style = gradientStyle) => {
    if (!isHexColor(top) || !isHexColor(bottom)) return false;
    if (!GRADIENT_STYLES.has(style)) return false;
    gradientTop = top.toLowerCase();
    gradientBottom = bottom.toLowerCase();
    gradientStyle = style;
    canvasMode = 'gradient';
    return true;
  };

  const mixChannel = (from, to, share) =>
    Math.round(from + (to - from) * share);

  const hexChannels = (value) => [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];

  const channelsHex = (channels) =>
    `#${channels
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')}`;

  const mixColors = (from, to, share) => {
    const start = hexChannels(from);
    const end = hexChannels(to);
    return channelsHex(
      start.map((channel, index) =>
        mixChannel(channel, end[index], Math.min(1, Math.max(0, share))),
      ),
    );
  };

  /**
   * The margin paint at a canvas point, so chrome that cannot host a CSS
   * gradient (a free-form frame, the export's frame fill) lines up with the
   * background behind it. Random spots have no closed form, so their frame
   * takes the midpoint of the two colors.
   */
  const canvasColorAt = (x = 0, y = 0) => {
    if (canvasMode !== 'gradient') return canvasColor;
    if (gradientStyle === 'horizontal') {
      return mixColors(gradientTop, gradientBottom, x / (Layout.canvasW || 1));
    }
    if (gradientStyle === 'radial') {
      const dx = (Number(x) || 0) - Layout.canvasW / 2;
      const dy = (Number(y) || 0) - Layout.canvasH / 2;
      const corner = Math.hypot(Layout.canvasW / 2, Layout.canvasH / 2) || 1;
      // Second color at the centre, first color in the corners.
      return mixColors(
        gradientBottom,
        gradientTop,
        Math.hypot(dx, dy) / corner,
      );
    }
    if (gradientStyle === 'spots') {
      return mixColors(gradientTop, gradientBottom, 0.5);
    }
    return mixColors(gradientTop, gradientBottom, y / (Layout.canvasH || 1));
  };

  /**
   * Global border thickness in logical pixels: the canvas padding and the gap
   * around every box. 0 removes the margin color around and between photos.
   */
  const setBorderThickness = (value) => {
    const pixels = Number(value);
    if (!Number.isFinite(pixels)) return false;
    const next = Math.min(METRICS.maxBorder, Math.max(0, Math.round(pixels)));
    if (next === borderThickness) return false;
    borderThickness = next;
    // A thicker frame raises the free-form minimum, so keep those boxes at a
    // size that still fits the frame and the 40 px photo.
    freeBoxes.forEach((box) => {
      box.width = clampFreeWidth(box, box.width);
    });
    return true;
  };

  /**
   * Switch between the horizontal row layout and its transposed column layout.
   * `rotate` is the 90° turn used by the action-bar toggle: the top row becomes
   * the right column (and the right column becomes the top row going back).
   * The photos themselves never rotate, only the structure around them.
   * Ratio locks are defined against the old axis, so they are released before
   * the structure moves.
   */
  const setOrientation = (mode, rotate = true) => {
    const next = mode === 'column' ? 'column' : 'row';
    if (next === orientation) return false;

    if (rotate) {
      // Ratio locks are tied to the old axis, so release them first.
      for (const row of rows) {
        for (const box of row.boxes) {
          box.lock = null;
          box.ratio = null;
          box.lockSeq = 0;
        }
      }
      // The 90° turn maps the top row to the right column; reversing keeps the
      // box order inside each group, so the left box becomes the top one.
      rows.reverse();
    }

    orientation = next;
    return true;
  };

  const orderedBoxes = () => rows.flatMap((row) => row.boxes);

  // v1 default: two rows, one empty placeholder box each.
  rows.push(createRow(1), createRow(1));

  return {
    get rows() {
      return rows;
    },
    get selectedBoxId() {
      return selectedBoxId;
    },
    get selectedFreeId() {
      return selectedFreeId;
    },
    get freeBoxes() {
      return freeBoxes;
    },
    get canvasColor() {
      return canvasColor;
    },
    get canvasMode() {
      return canvasMode;
    },
    get gradientTop() {
      return gradientTop;
    },
    get gradientBottom() {
      return gradientBottom;
    },
    get gradientStyle() {
      return gradientStyle;
    },
    get borderThickness() {
      return borderThickness;
    },
    get orientation() {
      return orientation;
    },
    get boxCount() {
      return rows.reduce((count, row) => count + row.boxes.length, 0);
    },
    findBox,
    findRow,
    addRow,
    addBox,
    removeBox,
    restoreBox,
    setImage,
    setBoxVisible,
    canLockBox,
    canAspectLock,
    setBoxLock,
    setBoxZoom,
    setBoxPan,
    setBoxRotation,
    setRowWeights,
    setRowHeights,
    setRowSplit,
    setBoxSplit,
    select,
    selectFree,
    clearSelection,
    setCanvasColor,
    setCanvasGradient,
    canvasColorAt,
    setBorderThickness,
    setOrientation,
    orderedBoxes,
    findFreeBox,
    addFreeBox,
    removeFreeBox,
    restoreFreeBox,
    setFreeImage,
    setFreeSquare,
    setFreePosition,
    setFreeScale,
    setFreeBorder,
    setFreeRotation,
    freeHeight,
  };
})();
