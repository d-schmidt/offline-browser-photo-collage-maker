'use strict';

/**
 * Single source of truth for the collage. Rows and boxes only carry relative
 * weights; pixel sizes are derived by Layout on every render.
 */
const State = (() => {
  const rows = [];
  let selectedBoxId = null;
  let sequence = 0;

  const uid = (kind) => `${kind}-${(sequence += 1)}`;

  const createBox = (weight) => ({
    id: uid('box'),
    weight,
    image: null,
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
    return box;
  };

  /** Remove a box; an emptied row is removed as well. */
  const removeBox = (boxId) => {
    const found = findBox(boxId);
    if (!found) return null;
    const { row, box, index } = found;

    row.boxes.splice(index, 1);
    Images.release(box.image);

    if (row.boxes.length === 0) {
      rows.splice(rows.indexOf(row), 1);
      normalizeWeights(rows);
    } else {
      normalizeWeights(row.boxes);
    }

    if (selectedBoxId === boxId) selectedBoxId = null;
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

  /** Same idea as setRowSplit, but for two neighboring boxes in one row. */
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
    selectedBoxId = boxId;
    return true;
  };

  const clearSelection = () => {
    selectedBoxId = null;
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
    get boxCount() {
      return rows.reduce((count, row) => count + row.boxes.length, 0);
    },
    findBox,
    findRow,
    addRow,
    addBox,
    removeBox,
    setImage,
    setRowSplit,
    setBoxSplit,
    select,
    clearSelection,
    orderedBoxes,
  };
})();
