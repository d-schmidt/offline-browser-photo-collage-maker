'use strict';

// Logical layout metrics. These mirror the CSS custom properties in
// styles.css; the editor always computes in these fixed pixels and the canvas
// is only visually scaled to fit the viewport.
const METRICS = Object.freeze({
  canvasW: 1080,
  canvasH: 1920,
  pad: 5,
  gap: 5,
  minRowH: 40,
  minBoxW: 40,
});

const Layout = (() => {
  const { canvasW, canvasH, pad, gap, minRowH, minBoxW } = METRICS;
  const contentW = canvasW - 2 * pad;
  const contentH = canvasH - 2 * pad;

  /**
   * Split `total` between weighted items, clamping each to `minimum` and
   * redistributing the shortfall. When even the minimums do not fit, fall back
   * to equal shares so the result never overflows more than unavoidable.
   */
  const distribute = (total, weights, minimum) => {
    const count = weights.length;
    if (count === 0) return [];
    if (total <= minimum * count) return new Array(count).fill(total / count);

    const sizes = new Array(count).fill(0);
    const clamped = new Array(count).fill(false);
    let freeTotal = total;
    let freeWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    let freeCount = count;

    // At most `count` passes: every pass either clamps a new item or finishes.
    for (let pass = 0; pass <= count; pass += 1) {
      let clampedAny = false;

      for (let i = 0; i < count; i += 1) {
        if (clamped[i]) continue;
        const size = (freeTotal * weights[i]) / (freeWeight || 1);
        if (size < minimum) {
          clamped[i] = true;
          sizes[i] = minimum;
          freeTotal -= minimum;
          freeWeight -= weights[i];
          freeCount -= 1;
          clampedAny = true;
        }
      }

      if (!clampedAny) {
        for (let i = 0; i < count; i += 1) {
          if (!clamped[i]) {
            sizes[i] = (freeTotal * weights[i]) / (freeWeight || 1);
          }
        }
        break;
      }
      if (freeCount === 0) break;
    }

    return sizes;
  };

  const placeRows = (rows) => {
    const rowWeights = rows.map((row) => Math.max(row.weight, 0.0001));
    const heights = distribute(contentH, rowWeights, minRowH);

    let cursor = pad;
    let exact = pad;
    return heights.map((height, index) => {
      exact += height;
      const last = index === heights.length - 1;
      const end = last ? pad + contentH : Math.round(exact);
      const y = cursor;
      cursor = end;
      return { row: rows[index], y, h: end - y };
    });
  };

  const placeBoxes = (row, rowH) => {
    const boxH = Math.max(0, rowH - 2 * gap);
    const weights = row.boxes.map((box) => Math.max(box.weight, 0.0001));
    // Every box contributes a gap on both sides. The canvas padding supplies
    // the outer half of the edge margin; between two boxes the two margins add
    // up to twice the gap, so spacing matches the rows above and below.
    const available = Math.max(0, contentW - 2 * gap * row.boxes.length);
    const widths = distribute(available, weights, minBoxW);

    const start = pad + gap;
    const limit = pad + contentW - gap;
    let cursor = start;
    let exact = start;
    return widths.map((width, index) => {
      exact += width;
      const last = index === widths.length - 1;
      const end = last ? limit : Math.min(Math.round(exact), limit);
      const x = Math.min(cursor, limit);
      cursor = end + 2 * gap;
      exact += 2 * gap;
      return {
        id: row.boxes[index].id,
        image: row.boxes[index].image,
        x,
        // Relative to the row element, which is already positioned in the
        // canvas; the gap is the white margin inside the row.
        y: gap,
        w: Math.max(0, end - x),
        h: boxH,
      };
    });
  };

  /** Turn the weight-based state into row and box geometry in logical pixels. */
  const compute = (rows) => {
    const placed = placeRows(rows);
    return {
      contentW,
      contentH,
      pad,
      gap,
      rows: placed.map(({ row, y, h }) => ({
        id: row.id,
        y,
        h,
        boxes: placeBoxes(row, h),
      })),
    };
  };

  return { compute };
})();
