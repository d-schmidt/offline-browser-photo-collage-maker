'use strict';

// Every format keeps 1080 logical pixels on its shorter side, so exports stay
// sharp and the longer side follows from the aspect ratio.
const SHORT_SIDE = 1080;

const formatSize = (ratioW, ratioH) => {
  const landscape = ratioW > ratioH;
  const longSide = Math.round(
    (SHORT_SIDE * Math.max(ratioW, ratioH)) / Math.min(ratioW, ratioH),
  );
  return {
    canvasW: landscape ? longSide : SHORT_SIDE,
    canvasH: landscape ? SHORT_SIDE : longSide,
  };
};

const createFormat = (id, ratioW, ratioH, label, name, icon) =>
  Object.freeze({
    id,
    ratioW,
    ratioH,
    label,
    name,
    icon,
    ...formatSize(ratioW, ratioH),
  });

/** Canvas formats offered on the start screen, in display order. */
const FORMATS = Object.freeze([
  createFormat('9x16', 9, 16, '9:16', 'Status', 'format9x16'),
  createFormat('16x9', 16, 9, '16:9', 'Banner', 'format16x9'),
  createFormat('7x9', 7, 9, '7:9', 'Portrait', 'format7x9'),
  createFormat('5x4', 5, 4, '5:4', '', 'format5x4'),
  createFormat('1x1', 1, 1, '1:1', 'Square', 'format1x1'),
]);

// Logical layout metrics. These mirror the CSS custom properties in
// styles.css; the editor always computes in these fixed pixels and the canvas
// is only visually scaled to fit the viewport. The canvas size comes from the
// chosen format.
const METRICS = Object.freeze({
  pad: 5,
  gap: 5,
  minRowH: 40,
  minBoxW: 40,
  maxZoom: 6,
});

const Layout = (() => {
  const { pad, gap, minRowH, minBoxW, maxZoom } = METRICS;
  let canvasW = FORMATS[0].canvasW;
  let canvasH = FORMATS[0].canvasH;
  let contentW = canvasW - 2 * pad;
  let contentH = canvasH - 2 * pad;

  /**
   * Switch the logical canvas size to a format. Weights are relative, so the
   * rows already in state simply reflow into the new area.
   */
  const setCanvasSize = (width, height) => {
    canvasW = width;
    canvasH = height;
    contentW = width - 2 * pad;
    contentH = height - 2 * pad;
  };

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
   * Scale data shared by the photo placement and the zoom controls. The cover
   * scale fills the box for the current rotation, so 1× always means "cover";
   * `minZoom` is the scale that shows the whole rotated photo, and `maxZoom` is
   * capped so the absolute zoom never exceeds six times the unrotated cover.
   */
  const scaleMetrics = (image, boxW, boxH, rotation = 0) => {
    const sourceW = image ? image.width : 0;
    const sourceH = image ? image.height : 0;
    if (!sourceW || !sourceH || boxW <= 0 || boxH <= 0) return null;

    const degrees = Number(rotation) || 0;
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const cosAbs = Math.abs(cos);
    const sinAbs = Math.abs(sin);

    const unrotatedCover = Math.max(boxW / sourceW, boxH / sourceH);
    // Extent of the box along the rotated photo's own axes.
    const neededW = cosAbs * boxW + sinAbs * boxH;
    const neededH = sinAbs * boxW + cosAbs * boxH;
    const coverScale = Math.max(
      unrotatedCover,
      neededW / sourceW,
      neededH / sourceH,
    );

    // The rotated photo's own extent gives the smallest scale that still
    // shows all of it inside the box.
    const rotatedW = cosAbs * sourceW + sinAbs * sourceH;
    const rotatedH = sinAbs * sourceW + cosAbs * sourceH;
    const fitScale = Math.min(boxW / rotatedW, boxH / rotatedH);

    return {
      degrees,
      cos,
      sin,
      cosAbs,
      sinAbs,
      coverScale,
      minZoom: Math.min(1, fitScale / coverScale),
      maxZoom: Math.max(1, (maxZoom * unrotatedCover) / coverScale),
    };
  };

  /** The zoom range for a photo in a box at a given rotation. */
  const zoomRange = (image, boxW, boxH, rotation = 0) => {
    const metrics = scaleMetrics(image, boxW, boxH, rotation);
    if (!metrics) return { min: 1, max: maxZoom };
    return { min: metrics.minZoom, max: metrics.maxZoom };
  };

  /**
   * Placement of a photo inside its box, relative to the box's top-left corner.
   * The photo covers the box at 1× and can be zoomed in to the cap or out below
   * the cover crop until the whole rotated photo fits. Rotation is in degrees
   * and happens around the photo centre. `offsetX`/`offsetY` are −1…1 shares of
   * the remaining slack along each screen axis, so the framing survives box
   * resizes and rotation. Both the on-screen crop and the PNG export use this
   * rect.
   */
  const imageRect = (
    image,
    boxW,
    boxH,
    zoom = 1,
    offsetX = 0,
    offsetY = 0,
    rotation = 0,
  ) => {
    const metrics = scaleMetrics(image, boxW, boxH, rotation);
    if (!metrics) return null;

    const sourceW = image.width;
    const sourceH = image.height;
    const {
      degrees,
      cos,
      sin,
      cosAbs,
      sinAbs,
      coverScale,
      minZoom,
      maxZoom: zoomMax,
    } = metrics;
    const scale = coverScale * clamp(Number(zoom) || 1, minZoom, zoomMax);

    const neededW = cosAbs * boxW + sinAbs * boxH;
    const neededH = sinAbs * boxW + cosAbs * boxH;
    const w = sourceW * scale;
    const h = sourceH * scale;
    // The pan stays inside a rectangle aligned with the photo, so every box
    // corner that is still under the photo keeps it covered. Zoomed out below
    // the cover crop there is no slack, so the photo stays centred.
    const allowedX = Math.max(0, (w - neededW) / 2);
    const allowedY = Math.max(0, (h - neededH) / 2);
    const slackX = allowedX * cosAbs + allowedY * sinAbs;
    const slackY = allowedX * sinAbs + allowedY * cosAbs;

    let panX = clamp(Number(offsetX) || 0, -1, 1) * slackX;
    let panY = clamp(Number(offsetY) || 0, -1, 1) * slackY;
    // M = [[cos, sin], [sin, -cos]] is its own inverse; clamping in that
    // rotated basis keeps a partially panned, rotated photo gap-free.
    const localX = cos * panX + sin * panY;
    const localY = sin * panX - cos * panY;
    const clampedX = clamp(localX, -allowedX, allowedX);
    const clampedY = clamp(localY, -allowedY, allowedY);
    panX = cos * clampedX + sin * clampedY;
    panY = sin * clampedX - cos * clampedY;

    return {
      x: (boxW - w) / 2 + panX,
      y: (boxH - h) / 2 + panY,
      w,
      h,
      rotation: degrees,
      slackX,
      slackY,
    };
  };

  const placeBoxes = (row, rowH, fitBoxH = null) => {
    const rowBoxH = Math.max(0, rowH - 2 * gap);
    // A single aspect-locked box derives its height from the full row width,
    // so it can be shorter than the row minimum (centre it) or a fraction of a
    // pixel taller than the rounded row (it eats into the next row's gap).
    const boxH = fitBoxH === null ? rowBoxH : fitBoxH;
    const boxY = gap + Math.max(0, (rowBoxH - boxH) / 2);
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
        rotation: row.boxes[index].rotation,
        x,
        // Relative to the row element, which is already positioned in the
        // canvas; the gap is the white margin inside the row.
        y: boxY,
        w: Math.max(0, end - x),
        h: boxH,
      };
    });
  };

  /**
   * The box height that makes a lone aspect-locked box span the full row
   * width. A row with more than one box still derives widths from the height,
   * because its siblings have to share the width.
   */
  const fitBoxHeight = (row) => {
    if (row.boxes.length !== 1) return null;
    const box = row.boxes[0];
    if (box.lock !== 'aspect' || !isLocked(box)) return null;
    return (contentW - 2 * gap) / box.ratio;
  };

  const placeRows = (rows) => {
    if (rows.length === 0) return [];

    const fits = rows.map(fitBoxHeight);
    const fitIndices = [];
    fits.forEach((height, index) => {
      if (height !== null) fitIndices.push(index);
    });

    let heights;
    const fitBoxHeights = new Array(rows.length).fill(null);

    if (fitIndices.length === 0) {
      heights = distribute(
        contentH,
        rows.map((row) => Math.max(row.weight, 0.0001)),
        minRowH,
      );
    } else if (contentH <= minRowH * rows.length) {
      // Not enough room for every row minimum; split evenly instead.
      heights = new Array(rows.length).fill(contentH / rows.length);
    } else {
      const idealRows = fits.map((boxH) =>
        boxH === null ? null : Math.max(minRowH, boxH + 2 * gap),
      );
      const fitBudget =
        contentH - minRowH * (rows.length - fitIndices.length);
      const idealTotal = fitIndices.reduce(
        (sum, index) => sum + idealRows[index],
        0,
      );

      heights = new Array(rows.length);
      if (idealTotal <= fitBudget) {
        // Every fitted row gets its full-width height; the remaining rows
        // share what is left by weight, as usual.
        fitIndices.forEach((index) => {
          heights[index] = idealRows[index];
          fitBoxHeights[index] = fits[index];
        });
        const restIndices = rows
          .map((_, index) => index)
          .filter((index) => fits[index] === null);
        const rest = distribute(
          contentH - idealTotal,
          restIndices.map((index) => Math.max(rows[index].weight, 0.0001)),
          minRowH,
        );
        restIndices.forEach((index, position) => {
          heights[index] = rest[position];
        });
      } else {
        // Full width cannot fit. Share the available height between the fitted
        // rows and keep every other row at its minimum.
        const extras = fitIndices.map((index) =>
          Math.max(0, idealRows[index] - minRowH),
        );
        const extraTotal = extras.reduce((sum, extra) => sum + extra, 0);
        const availableExtra = Math.max(
          0,
          fitBudget - minRowH * fitIndices.length,
        );
        heights.fill(minRowH);
        fitIndices.forEach((index, position) => {
          heights[index] =
            minRowH +
            (extraTotal > 0
              ? (availableExtra * extras[position]) / extraTotal
              : availableExtra / fitIndices.length);
        });
      }
    }

    let cursor = pad;
    let exact = pad;
    return heights.map((height, index) => {
      exact += height;
      const last = index === heights.length - 1;
      // Rows whose fitted boxes need less than the full canvas stay top
      // aligned; only the normal weighted layout reaches the bottom edge.
      const end = last
        ? Math.min(pad + contentH, Math.round(exact))
        : Math.round(exact);
      const y = cursor;
      cursor = end;
      return {
        row: rows[index],
        y,
        h: end - y,
        fitBoxH: fitBoxHeights[index],
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
      rows: placed.map(({ row, y, h, fitBoxH }) => ({
        id: row.id,
        y,
        h,
        boxes: placeBoxes(row, h, fitBoxH),
      })),
    };
  };

  return {
    compute,
    imageRect,
    zoomRange,
    maxZoom,
    minZoom: 1,
    setCanvasSize,
    get canvasW() {
      return canvasW;
    },
    get canvasH() {
      return canvasH;
    },
  };
})();
