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
  maxZoom: 6,
});

const Layout = (() => {
  const { canvasW, canvasH, pad, gap, minRowH, minBoxW, maxZoom } = METRICS;
  const contentW = canvasW - 2 * pad;
  const contentH = canvasH - 2 * pad;

  const clamp = (value, minimum, maximum) =>
    Math.min(maximum, Math.max(minimum, value));

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

  const isLocked = (box) =>
    Boolean(box.lock && Number.isFinite(box.ratio) && box.ratio > 0);

  /**
   * Widths in pixels. Locked boxes ask for `boxHeight × ratio`; unlocked boxes
   * share what is left by weight. If the locks cannot all fit, shrink them
   * proportionally rather than overflowing the canvas.
   */
  const boxWidths = (boxes, boxH, total) => {
    const locked = boxes.map((box) =>
      isLocked(box) ? Math.max(minBoxW, boxH * box.ratio) : null,
    );
    const unlocked = [];
    let lockedTotal = 0;

    locked.forEach((width, index) => {
      if (width === null) unlocked.push(index);
      else lockedTotal += width;
    });

    if (unlocked.length === boxes.length) {
      return distribute(
        total,
        boxes.map((box) => Math.max(box.weight, 0.0001)),
        minBoxW,
      );
    }

    if (unlocked.length === 0) {
      if (lockedTotal > total && lockedTotal > 0) {
        const factor = total / lockedTotal;
        return locked.map((width) => width * factor);
      }
      return locked;
    }

    const maxLockedTotal = Math.max(0, total - minBoxW * unlocked.length);
    if (lockedTotal > maxLockedTotal && lockedTotal > 0) {
      const factor = maxLockedTotal / lockedTotal;
      for (let index = 0; index < locked.length; index += 1) {
        if (locked[index] !== null) locked[index] *= factor;
      }
      lockedTotal = maxLockedTotal;
    }

    const remaining = Math.max(0, total - lockedTotal);
    const unlockedWidths = distribute(
      remaining,
      unlocked.map((index) => Math.max(boxes[index].weight, 0.0001)),
      minBoxW,
    );
    const widths = locked.slice();
    unlocked.forEach((boxIndex, index) => {
      widths[boxIndex] = unlockedWidths[index];
    });
    return widths;
  };

  /**
   * Placement of a photo inside its box, relative to the box's top-left corner.
   * The photo always covers the box (so the collage never shows holes) and the
   * zoom scales it further. `offsetX`/`offsetY` are −1…1 shares of the slack
   * along each axis: driving them keeps the framing proportional when the box
   * changes size. Both the on-screen crop and the PNG export use this rect.
   */
  const imageRect = (image, boxW, boxH, zoom = 1, offsetX = 0, offsetY = 0) => {
    const sourceW = image ? image.width : 0;
    const sourceH = image ? image.height : 0;
    if (!sourceW || !sourceH || boxW <= 0 || boxH <= 0) return null;

    const scale =
      Math.max(boxW / sourceW, boxH / sourceH) *
      clamp(Number(zoom) || 1, 1, maxZoom);
    const w = sourceW * scale;
    const h = sourceH * scale;
    const slackX = Math.max(0, (w - boxW) / 2);
    const slackY = Math.max(0, (h - boxH) / 2);

    return {
      x: (boxW - w) / 2 + clamp(Number(offsetX) || 0, -1, 1) * slackX,
      y: (boxH - h) / 2 + clamp(Number(offsetY) || 0, -1, 1) * slackY,
      w,
      h,
    };
  };

  const placeBoxes = (row, rowH) => {
    const boxH = Math.max(0, rowH - 2 * gap);
    // Every box contributes a gap on both sides. The canvas padding supplies
    // the outer half of the edge margin; between two boxes the two margins add
    // up to twice the gap, so spacing matches the rows above and below.
    const available = Math.max(0, contentW - 2 * gap * row.boxes.length);
    const widths = boxWidths(row.boxes, boxH, available);
    const used = widths.reduce((sum, width) => sum + width, 0);
    const fills = Math.abs(used - available) < 0.01;

    const start = pad + gap;
    const limit = pad + contentW - gap;
    let cursor = start;
    let exact = start;
    return widths.map((width, index) => {
      exact += width;
      const last = index === widths.length - 1;
      // A row whose boxes are all locked can be narrower than the canvas; it
      // stays left-aligned instead of stretching and breaking the ratio.
      const end = last && fills ? limit : Math.min(Math.round(exact), limit);
      const x = Math.min(cursor, limit);
      cursor = end + 2 * gap;
      exact += 2 * gap;
      return {
        id: row.boxes[index].id,
        image: row.boxes[index].image,
        locked: isLocked(row.boxes[index]),
        zoom: row.boxes[index].zoom,
        offsetX: row.boxes[index].offsetX,
        offsetY: row.boxes[index].offsetY,
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

  return { compute, imageRect, maxZoom, minZoom: 1 };
})();
