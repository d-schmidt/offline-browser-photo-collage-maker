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

const createFormat = (id, ratioW, ratioH, label, nameKey, icon) =>
  Object.freeze({
    id,
    ratioW,
    ratioH,
    label,
    nameKey,
    icon,
    ...formatSize(ratioW, ratioH),
  });

/** Canvas formats offered on the start screen, in display order. */
const FORMATS = Object.freeze([
  createFormat('9x16', 9, 16, '9:16', 'format.name.status', 'format9x16'),
  createFormat('16x9', 16, 9, '16:9', 'format.name.banner', 'format16x9'),
  createFormat('7x9', 7, 9, '7:9', 'format.name.portrait', 'format7x9'),
  createFormat('5x4', 5, 4, '5:4', '', 'format5x4'),
  createFormat('1x1', 1, 1, '1:1', 'format.name.square', 'format1x1'),
]);

// Logical layout metrics. These mirror the CSS custom properties in
// styles.css; the editor always computes in these fixed pixels and the canvas
// is only visually scaled to fit the viewport. The canvas size comes from the
// chosen format. The padding and the box gap are not fixed: the border
// thickness slider sets both, so 5 px gives the classic 10 px separation and
// 0 px removes the margin color from the canvas entirely.
const METRICS = Object.freeze({
  pad: 5,
  gap: 5,
  minRowH: 40,
  minBoxW: 40,
  maxZoom: 6,
  maxBorder: 100,
});

// Text layout shared by the editor CSS, the fit measurement, and the export:
// every line is 1.25 em tall and the words sit in 0.35 em of padding, so a
// text box can be sized to the measured words exactly.
const TEXT_LINE_HEIGHT = 1.25;
const TEXT_PADDING = 0.35;
// The outline is a centred text stroke with the fill painted over it, so half
// of this width stays visible outside the glyph: 10% of the type size reads as
// a clear halo (~2.4 px at the 48 px default) instead of a hairline.
const TEXT_OUTLINE_RATIO = 0.1;

/**
 * Free-form text fonts. Every entry is a stack of families that come with the
 * machine; nothing is downloaded or bundled. `generic` entries always exist,
 * while the others are only offered when their first family resolves, detected
 * by comparing text metrics with a generic fallback. The last entry of each
 * stack is the fallback used when the preferred family is not installed.
 */
const TEXT_FONTS = Object.freeze([
  { id: 'sans', labelKey: 'font.sans', stack: 'sans-serif', generic: true },
  { id: 'serif', labelKey: 'font.serif', stack: 'serif', generic: true },
  { id: 'mono', labelKey: 'font.mono', stack: 'monospace', generic: true },
  {
    id: 'arial',
    labelKey: 'font.arial',
    probe: 'Arial',
    stack: 'Arial, Helvetica, sans-serif',
  },
  {
    id: 'helvetica',
    labelKey: 'font.helvetica',
    probe: 'Helvetica Neue',
    stack: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  {
    id: 'verdana',
    labelKey: 'font.verdana',
    probe: 'Verdana',
    stack: 'Verdana, Geneva, sans-serif',
  },
  {
    id: 'trebuchet',
    labelKey: 'font.trebuchet',
    probe: 'Trebuchet MS',
    stack: '"Trebuchet MS", Tahoma, sans-serif',
  },
  {
    id: 'segoe',
    labelKey: 'font.segoe',
    probe: 'Segoe UI',
    stack: '"Segoe UI", Tahoma, sans-serif',
  },
  {
    id: 'georgia',
    labelKey: 'font.georgia',
    probe: 'Georgia',
    stack: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'times',
    labelKey: 'font.times',
    probe: 'Times New Roman',
    stack: '"Times New Roman", Times, serif',
  },
  {
    id: 'courier',
    labelKey: 'font.courier',
    probe: 'Courier New',
    stack: '"Courier New", Courier, monospace',
  },
  {
    id: 'impact',
    labelKey: 'font.impact',
    probe: 'Impact',
    stack: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  },
  {
    id: 'comic',
    labelKey: 'font.comic',
    probe: 'Comic Sans MS',
    stack: '"Comic Sans MS", "Comic Sans", cursive',
  },
]);

const Layout = (() => {
  const { minRowH, minBoxW, maxZoom, maxBorder } = METRICS;
  let canvasW = FORMATS[0].canvasW;
  let canvasH = FORMATS[0].canvasH;
  // Padding and gap share one thickness, adjustable from 0 to 100 px.
  let thickness = METRICS.pad;
  let contentW = canvasW - 2 * thickness;
  let contentH = canvasH - 2 * thickness;

  const syncContent = () => {
    contentW = Math.max(0, canvasW - 2 * thickness);
    contentH = Math.max(0, canvasH - 2 * thickness);
  };

  /**
   * Switch the logical canvas size to a format. Weights are relative, so the
   * rows already in state simply reflow into the new area.
   */
  const setCanvasSize = (width, height) => {
    canvasW = width;
    canvasH = height;
    syncContent();
  };

  /**
   * Set the canvas padding and the gap around every box together. The value is
   * in logical pixels: 0 removes the margin color around and between photos,
   * while the 100 px ceiling still leaves the 1080 px canvas usable.
   */
  const setBorderThickness = (value) => {
    const next = clamp(Math.round(Number(value) || 0), 0, maxBorder);
    if (next === thickness) return false;
    thickness = next;
    syncContent();
    return true;
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
   * Widths in pixels along the layout's cross axis. Locked boxes ask for
   * `boxHeight × ratio`; unlocked boxes share what is left by weight. In
   * column mode the whole model is transposed, so the box ratio is inverted
   * to keep the photo's natural width:height proportion. If the locks cannot
   * all fit, shrink them proportionally rather than overflowing the canvas.
   */
  const boxWidths = (boxes, boxH, total, column) => {
    const locked = boxes.map((box) =>
      isLocked(box)
        ? Math.max(minBoxW, boxH * (column ? 1 / box.ratio : box.ratio))
        : null,
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

  const placeBoxes = (row, rowH, contentWidth, column, fitBoxH = null) => {
    const rowBoxH = Math.max(0, rowH - 2 * thickness);
    // A single aspect-locked box derives its height from the full row width,
    // so it can be shorter than the row minimum (centre it) or a fraction of a
    // pixel taller than the rounded row (it eats into the next row's gap).
    const boxH = fitBoxH === null ? rowBoxH : fitBoxH;
    const boxY = thickness + Math.max(0, (rowBoxH - boxH) / 2);
    // Every box contributes a gap on both sides. The canvas padding supplies
    // the outer half of the edge margin; between two boxes the two margins add
    // up to twice the gap, so spacing matches the rows above and below.
    const available = Math.max(
      0,
      contentWidth - 2 * thickness * row.boxes.length,
    );
    const widths = boxWidths(row.boxes, boxH, available, column);
    const used = widths.reduce((sum, width) => sum + width, 0);
    const fills = Math.abs(used - available) < 0.01;

    // Boxes are positioned inside their group: one padding plus one gap at the
    // start, and the mirrored margin at the far edge.
    const start = 2 * thickness;
    const limit = contentWidth;
    let cursor = start;
    let exact = start;
    return widths.map((width, index) => {
      exact += width;
      const last = index === widths.length - 1;
      // A row whose boxes are all locked can be narrower than the canvas; it
      // stays left-aligned instead of stretching and breaking the ratio.
      const end = last && fills ? limit : Math.min(Math.round(exact), limit);
      const x = Math.min(cursor, limit);
      cursor = end + 2 * thickness;
      exact += 2 * thickness;
      return {
        id: row.boxes[index].id,
        image: row.boxes[index].image,
        fill: row.boxes[index].fill,
        visible: row.boxes[index].visible !== false,
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
  const fitBoxHeight = (row, contentWidth, column) => {
    if (row.boxes.length !== 1) return null;
    const box = row.boxes[0];
    if (box.lock !== 'aspect' || !isLocked(box)) return null;
    const ratio = column ? 1 / box.ratio : box.ratio;
    return (contentWidth - 2 * thickness) / ratio;
  };

  const placeRows = (rows, contentWidth, contentHeight, column) => {
    if (rows.length === 0) return [];

    const fits = rows.map((row) => fitBoxHeight(row, contentWidth, column));
    const fitIndices = [];
    fits.forEach((height, index) => {
      if (height !== null) fitIndices.push(index);
    });

    let heights;
    const fitBoxHeights = new Array(rows.length).fill(null);

    if (fitIndices.length === 0) {
      heights = distribute(
        contentHeight,
        rows.map((row) => Math.max(row.weight, 0.0001)),
        minRowH,
      );
    } else if (contentHeight <= minRowH * rows.length) {
      // Not enough room for every row minimum; split evenly instead.
      heights = new Array(rows.length).fill(contentHeight / rows.length);
    } else {
      const idealRows = fits.map((boxH) =>
        boxH === null ? null : Math.max(minRowH, boxH + 2 * thickness),
      );
      const fitBudget =
        contentHeight - minRowH * (rows.length - fitIndices.length);
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
          contentHeight - idealTotal,
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

    let cursor = thickness;
    let exact = thickness;
    return heights.map((height, index) => {
      exact += height;
      const last = index === heights.length - 1;
      // Groups whose fitted boxes need less than the full canvas stay
      // start-aligned; only the normal weighted layout reaches the far edge.
      const end = last
        ? Math.min(thickness + contentHeight, Math.round(exact))
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

  /**
   * Turn the weight-based state into group and box geometry in logical pixels.
   * Column mode is the same weighted model transposed: the group flow runs
   * horizontally, so the flow and cross axes swap. The photos keep their own
   * orientation; only the boxes around them change shape.
   */
  const compute = (rows, orientation = 'row') => {
    const column = orientation === 'column';
    const flowW = column ? contentH : contentW;
    const flowH = column ? contentW : contentH;
    const placed = placeRows(rows, flowW, flowH, column);

    return {
      contentW,
      contentH,
      pad: thickness,
      gap: thickness,
      column,
      rows: placed.map(({ row, y, h, fitBoxH }) => {
        const boxes = placeBoxes(row, h, flowW, column, fitBoxH);
        if (!column) {
          return { id: row.id, x: 0, y, w: canvasW, h, boxes };
        }
        // Transpose the placed row into a column: its vertical extent becomes
        // the column's horizontal extent and every box swaps width and height.
        return {
          id: row.id,
          x: y,
          y: 0,
          w: h,
          h: canvasH,
          boxes: boxes.map((box) => ({
            ...box,
            x: box.y,
            y: box.x,
            w: box.h,
            h: box.w,
          })),
        };
      }),
    };
  };

  /**
   * Optional frame around a free-form photo. Free-form boxes have no grid gap,
   * so the frame keeps the classic separation between two grid photos: one
   * margin on each side, i.e. twice the current border thickness. State keeps
   * every free box large enough for this frame plus the 40 px photo minimum,
   * so the frame width is never squeezed.
   */
  const freeBorder = (box) => {
    if (box.border === false || thickness <= 0) return 0;
    return 2 * thickness;
  };

  /**
   * Font size for a free-form text box. The size is derived from the box
   * height and the number of explicit lines, so a fitted box hugs its words:
   * the text block plus the 0.35 em padding fills the inner height exactly.
   * Scaling the box therefore scales the words with it.
   */
  const freeTextSize = (box) => {
    const border = freeBorder(box);
    const innerH = Math.max(0, box.width / (box.aspect || 1) - 2 * border);
    const lines = Math.max(1, String(box.text || '').split('\n').length);
    return Math.max(1, innerH / (lines * TEXT_LINE_HEIGHT + 2 * TEXT_PADDING));
  };

  /**
   * Starting font size for a text box that has no words yet, so the first
   * caption is a readable size before its box is fitted around it.
   */
  const defaultTextSize = (box) => {
    const border = freeBorder(box);
    const innerW = Math.max(0, box.width - 2 * border);
    const innerH = Math.max(0, box.width / (box.aspect || 1) - 2 * border);
    return Math.max(10, Math.min(innerW, innerH) * 0.14);
  };

  /** Stroke width for the text outline, scaling with the type size. */
  const textOutlineWidth = (box) =>
    Math.max(3, freeTextSize(box) * TEXT_OUTLINE_RATIO);

  /** CSS (and canvas) family list for a text box font id. */
  const textFontStack = (id) => {
    const font = TEXT_FONTS.find((candidate) => candidate.id === id);
    return font ? font.stack : 'sans-serif';
  };

  return {
    compute,
    freeBorder,
    defaultTextSize,
    freeTextSize,
    textOutlineWidth,
    textFontStack,
    textFonts: TEXT_FONTS,
    textLineHeight: TEXT_LINE_HEIGHT,
    textPadding: TEXT_PADDING,
    imageRect,
    zoomRange,
    maxZoom,
    minZoom: 1,
    setCanvasSize,
    setBorderThickness,
    get canvasW() {
      return canvasW;
    },
    get canvasH() {
      return canvasH;
    },
  };
})();
