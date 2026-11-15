# AGENTS.md

## Project

**Photo Collage Editor** — a single-page photo collage editor that runs entirely in the browser.

- Opens directly from disk (`file://`) with no build step and no install.
- Pure vanilla JavaScript, HTML, and CSS. No frameworks, no bundler, no package manager.
- Offline by design: no network requests, no CDN links, no analytics, no remote fonts.
- Photos never leave the machine. All work happens in memory / `localStorage`.

## Current state

The editor shell is functional: a 9:16 canvas with weighted rows and boxes, add/remove, selection, image loading, keyboard control, row-boundary and box-width resizing, and PNG save/export.

**Working:**

- `index.html` — two-region shell with the action bar, scaled 9:16 canvas stage, add-row buttons, add-box rails on both sides, hidden file input, and live region.
- `css/styles.css` — layout tokens, scaled canvas, boxes, side rails, focus/hover states, toast variants, reduced-motion handling.
- `js/layout.js` — 9:16 `METRICS`, weight-to-pixel flow math, per-box gaps on both edges, 40 px minimums, and whole-pixel rounding.
- `js/state.js` — rows, boxes, weights, selection, add/remove, image assignment, and neighbor weight splits for row/box resizing; revokes replaced object URLs.
- `js/images.js` — file validation, `createImageBitmap`/`<img>` decoding, URL element loading for export, and object URL cleanup.
- `js/render.js` — renders rows, boxes, contextual tools, both rails, row/box boundary overlays, empty state, and success/error toast; includes geometry-only updates during drags; announces via `aria-live`.
- `js/export.js` — offscreen `1080 × 1920` PNG compositing and download.
- `js/main.js` — event wiring, file picker, save action, keyboard navigation/deletion, row- and box-boundary dragging with a 3 px threshold, and canvas fit scaling.
- `serve.py` — stdlib-only local server on `http://localhost:8000`, verified to return the page and assets with `no-store`.
- `assets/` — the three supplied Material Symbols SVGs plus the locally added `download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg`.

**Not built yet:** drag reordering, persistence, and undo/redo. The weight model and layout math already support the remaining drag work.

**Next step:** drag a selected box to reorder within and across rows.


## Hard constraints

1. **No dependencies.** Do not add npm packages, vendored libraries, or remote script/style/icon URLs.
2. **Works from `file://`.** Do not use ES `import` / `export` or `fetch()` for local assets — browsers block both on the `file:` protocol. Use classic `<script>` tags in dependency order.
3. **No network I/O.** No `fetch`, `XMLHttpRequest`, WebSockets, or remote images.
4. **No generated artifacts in git.** No `node_modules`, dist bundles, or exported collages.

## UI specification (v1)

### Page structure

Two stacked regions, full viewport height, no page scrolling:

1. **Action bar** — fixed height (~56 px) at the top, dark background. Contextual tool icons sit on the left; the always-visible **Save** button sits on the right. The contextual area is empty when nothing is selected.
2. **Editor area** — fills the remaining height, dark gray background (`#2b2b2b`). Centered inside it: the collage canvas, with add-row buttons above and below and add-box buttons beside each row on both the left and right sides.

### Layout metrics

Define once as CSS custom properties on `:root` and mirror them in JS constants:

| Token | Value | Meaning |
| --- | --- | --- |
| `--canvas-w` / `--canvas-h` | 1080 × 1920 px | Fixed logical canvas size (9:16). Never changes with content. Matches the PNG export size. |
| `--canvas-pad` | 5 px | White padding inside the canvas, all sides |
| `--gap` | 5 px | White margin around every image box; adjacent boxes show 10 px between them, and the canvas edges show 5 px padding plus 5 px margin |
| `--placeholder` | `#d9d9d9` | Empty image box fill |
| `--canvas-bg` | `#ffffff` | Canvas background |
| `--page-bg` | `#2b2b2b` | Page background around the canvas |
| `--accent` | `#1e88e5` | Selection border, row-line highlight |

The canvas keeps its logical pixel size; it is visually scaled down (CSS `transform: scale()`, centered) to fit the available viewport space. All editor math uses logical pixels, so behavior is identical at any zoom. The real `<canvas>` is only used for export — the editor UI itself is DOM elements.

### Rows and image boxes

- Initial state: **two rows**, each containing **one empty placeholder box**.
- A row is a horizontal track inside the canvas; boxes fill it left to right, like a flex row with wrapping disabled.
- Image boxes are white on the outside (5 px margin) with light gray placeholder fill; once populated, the photo covers the box, cropped to the box aspect ratio and centered (`object-fit: cover`), clipped by the box. Adjacent boxes therefore have 10 px of white between them, and the canvas edges have 5 px padding plus the 5 px box margin.
- **Add box:** a button beside each row, vertically centered, on both the left and right sides of the canvas, using `add_circle.svg`.
- **Add row:** buttons above and below the canvas, using `add_circle.svg`. A new row always starts with one empty box. The top button inserts at the top of the stack; the bottom button appends.
- No minimum number of rows: deleting the last box in the last row leaves an empty editor area, with the add-row buttons still usable.

### Selection and contextual actions

- Clicking an image box selects it: blue border, and its actions appear in the action bar.
- Clicking the canvas background or pressing `Escape` clears the selection and empties the contextual actions. Save stays visible.
- Selected-box actions:
  - **Delete** (`delete.svg`) — removes the box. Deleting the last box in a row removes that row. The selection is cleared.
  - **Select image** (`image_search.svg`) — opens the browser file picker (`accept="image/*"`). The chosen file replaces the placeholder, cropped to the box aspect ratio and centered. Invalid or undecodable files show a visible error and leave the box unchanged.
- **Save** (`download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg`, always visible) — composites the fixed 1080 × 1920 canvas offscreen and downloads it as a PNG named `photo-collage.png`. Selection borders are not included; photos are cover-cropped exactly as on screen.
- Only boxes have contextual actions in v1; Save is global.

### Direct manipulation

- **Drag a box** — pointer-drag on a selected box reorders it: within its row, or into another row (insertion indicator at the drop position). Dragging never leaves boxes at arbitrary absolute coordinates; the flow model always wins.
- **Resize a box** — hovering the white gap between two boxes in the same row highlights it with a 2 px vertical accent line and shows a column-resize cursor. Dragging moves that boundary, trading width between the two boxes while every other box keeps its width. Both boxes are clamped to the 40 px minimum. Height always follows the row.
- **Resize a row** — hovering the white gap between two rows highlights it with a 2 px accent line across the canvas and shows a row-resize cursor. Dragging moves that boundary, trading height between the two adjacent rows while the canvas height and every other row stay fixed. Both rows are clamped to the 40 px minimum.
- Use pointer events with pointer capture and a ~3 px movement threshold, so a click selects (or a boundary click does nothing) without starting a drag until the pointer actually moves.

### Reflow model

Boxes flow like flex items with `flex-grow`; the canvas never resizes.

- Canvas content width = `canvas-w − 2 × pad`. Content height = `canvas-h − 2 × pad`.
- Each row has a height **weight**; each box has a width **weight**.
- Row height = `contentH × weight / Σ rowWeights`, minus `2 × gap` for box height.
- Box width = `(contentW − 2 × gap × n) × weight / Σ boxWeights` in its row. Each box reserves a gap on both sides, so two adjacent boxes show twice the gap between them and every outer edge keeps one gap beyond the canvas padding.
- Adding a box gives it the row's mean weight; adding a row gives it the mean row weight and renormalizes the stack.
- Removing a box or row renormalizes the remaining weights.
- Resizing redistributes weight only between the dragged element and its siblings/adjacent rows.
- Clamp with minimums (row 40 px, box ≈ 40 px) so nothing collapses to zero.
- Round to whole logical pixels; give the last box in a row the rounding remainder so edges stay flush. Never let a gap or box overflow the padded content box.

The result: any structural or size change reflows the whole canvas to fill the same fixed area, with no scrolling inside the canvas.

### Icons

The icons are already downloaded into `assets/` as Material Symbols SVGs. Keep
the supplied filenames; reference them through a single `ICONS` constant so the
long names are written once.

| Purpose | Path |
| --- | --- |
| Add row / add box | `assets/add_circle_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Delete box | `assets/delete_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Select image | `assets/image_search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Save / download | `assets/download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |

- The SVGs have a baked-in `fill="#e3e3e3"`, tuned for the dark UI. Do not wrap them in a darker container; if extra contrast is ever needed, override the fill instead of downloading new icons.
- 24 × 24 viewBox. Reference with `<img>` or an inline `<symbol>` sprite; never an icon font or CDN.

## File layout

```
index.html            Markup, hidden file input, script/style includes
css/styles.css        All styles, layout metrics as custom properties
js/
  state.js            Editor state, weights, history, persistence
  layout.js           Weight → pixel flow math, row/box geometry
  images.js           File loading, decoding, cover-crop, object URLs
  render.js           DOM rendering of rows/boxes and selection UI
  export.js           Offscreen canvas compositing → 1080 × 1920 PNG
  main.js             Wiring, events, startup
assets/               Material Symbols SVG icons (supplied + download)
serve.py              Optional stdlib-only dev server (localhost)
README.md             User-facing description and how to open the page
```

Split by concern, not by line count. This layout is a target, not a mandate — collapse files that stay trivial.

## How to run and verify

- Quickest: open `index.html` in a browser — that satisfies the offline requirement.
- Dev server: `python serve.py` → http://localhost:8000 (add `-p 8080` for another port, `--no-open` to skip launching a browser). Stdlib only, no install.
- No test runner; verify manually and say what you checked.
- DevTools console must be clean and the Network tab must show no requests.

Manual test checklist:

- Fresh page shows two rows, one gray box each, with white padding and a 5 px box margin on every canvas edge.
- Add/remove boxes and rows from both ends and both side rails; confirm reflow and unchanged canvas size.
- Select a box: blue border and both actions appear; deselect clears them while Save stays.
- Load an image; confirm it covers the box, centered, cropped to the aspect ratio.
- Click Save; confirm a 1080 × 1920 PNG downloads and matches the canvas without selection borders.
- Hover between two boxes in a row: vertical blue line and column-resize cursor; drag to trade widths down to 40 px.
- Hover between two rows: horizontal blue line and row-resize cursor; drag to trade heights down to 40 px.
- Drag a box to reorder within and across rows.
- Resize a box and drag a row boundary; confirm neighboring boxes/rows reflow and every other box/row keeps its size.
- Delete every box; confirm rows disappear and add-row still works.
- Resize the window; confirm the canvas scales without changing its logical layout.

## Code conventions

- Modern JavaScript (ES2020+): `const`/`let`, arrow functions, template literals, `'use strict'` per file.
- `kebab-case` for ids/classes, `camelCase` for JS, `UPPER_SNAKE_CASE` for constants.
- One source of truth for state (`state.js`). DOM is a render target; never read editor state back out of the DOM.
- Separate "mutate state" from "render". Route undoable mutations through one commit function.
- Use `requestAnimationFrame` for visual updates; throttle pointermove work; avoid layout thrash and per-frame `toBlob()`.
- Release object URLs and `ImageBitmap`/canvas references when boxes are removed or photos replaced.
- Comments explain *why*. No commented-out code.

## UX and accessibility

- Every icon button is a real `<button>` with an `aria-label` and a visible hover/focus state.
- Keyboard: `Tab` moves through controls; arrow keys move selection between boxes; `Delete`/`Backspace` deletes the selected box; `Enter`/`Space` opens the image picker; `Escape` deselects.
- Announce selection and error messages via an `aria-live` region.
- Show a friendly empty state when no rows remain; fail visibly on unsupported or undecodable images.
- Respect `prefers-reduced-motion` for transitions.

## Performance and limits

- Keep drag/resize at ~60 fps with 20 boxes on a mid-range laptop; update existing row/box geometry during a drag instead of rebuilding the tree.
- Prefer `createImageBitmap` where available; never block on decoding.
- Downscale very large photos for on-screen rendering while keeping originals for export.

## Open questions

Defaults chosen for v1 — change them here before implementation if wrong:

1. **Drag semantics:** reorder by weight, not free placement. Free positioning would conflict with the flex-flow requirement.
2. **Canvas size:** 1080 × 1920 (9:16), configurable in one constant, matching the 1080 × 1920 PNG export target.
3. **Resize axes:** box width only; row heights come from row-boundary drags. Vertical box handles are omitted.
4. **Persistence and undo/redo:** planned next, not in v1. State is already weight-based, so both are cheap to add once the model is stable.

## Git

- Imperative, short commit subjects, e.g. `Add row boundary dragging`.
- One logical change per commit; keep refactors separate.
