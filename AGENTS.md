# AGENTS.md

## Project

**Photo Collage Editor** — a single-page photo collage editor that runs entirely in the browser.

- Opens directly from disk (`file://`) with no build step and no install.
- Pure vanilla JavaScript, HTML, and CSS. No frameworks, no bundler, no package manager.
- Offline by design: no network requests, no CDN links, no analytics, no remote fonts.
- Photos never leave the machine. All work happens in memory / `localStorage`.

## Current state

The editor shell is functional: a 9:16 canvas with weighted rows and boxes, add/remove, selection, image loading, keyboard control, row-boundary and box-width resizing, image-ratio width locks with full-width single-image rows, per-photo zoom/pan/rotation with a selection-only ghost overlay, a configurable margin color, and PNG save/export.

**Working:**

- `index.html` — two-region shell with the action bar, scaled 9:16 canvas stage, add-row buttons, add-box rails on both sides, hidden file and color inputs, and live region.
- `css/styles.css` — layout tokens, scaled canvas, boxes, side rails, focus/hover states, toast variants, reduced-motion handling.
- `js/layout.js` — 9:16 `METRICS`, weight-to-pixel flow math, per-box gaps on both edges, image-ratio width locks (including full-width fitted rows), 40 px minimums, whole-pixel rounding, and the cover/zoom/pan/rotate photo rectangle shared with export.
- `js/state.js` — rows, boxes, weights, selection, add/remove, image assignment, exclusive square/aspect locks, canvas margin color, neighbor weight splits, and per-box zoom/pan/rotation that resets when the photo is replaced; revokes replaced object URLs.
- `js/images.js` — file validation, `createImageBitmap`/`<img>` decoding, URL element loading for export, and object URL cleanup.
- `js/render.js` — renders rows, boxes, contextual tools including the lock toggles, both rails, row/box boundary overlays, the selection-only zoom and rotation circles plus the translucent full-photo ghost, empty state, and success/error toast; includes geometry-only updates during drags; announces via `aria-live`.
- `js/export.js` — offscreen `1080 × 1920` PNG compositing using the chosen margin color, the same zoom/pan/rotate crop as the editor, with no selection or ghost chrome, plus download.
- `js/main.js` — event wiring, file picker, margin-color picker, save action, lock toggles, keyboard navigation/deletion, row- and box-boundary dragging with a 3 px threshold, drag-to-zoom on the corner circle, drag-to-rotate on the outer circle, drag-to-pan on the selected photo, and canvas fit scaling.
- `serve.py` — stdlib-only local server on `http://localhost:8000`, verified to return the page and assets with `no-store`.
- `assets/` — the supplied and locally added Material Symbols SVGs, including the placeholder, lock, and margin-color icons.

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

1. **Action bar** — fixed height (~56 px) at the top, dark background. Contextual tool icons sit on the left; the always-visible **margin-color picker** and **Save** button sit on the right. The contextual area is empty when nothing is selected.
2. **Editor area** — fills the remaining height, dark gray background (`#2b2b2b`). Centered inside it: the collage canvas, with add-row buttons above and below and add-box buttons beside each row on both the left and right sides.

### Layout metrics

Define once as CSS custom properties on `:root` and mirror them in JS constants:

| Token | Value | Meaning |
| --- | --- | --- |
| `--canvas-w` / `--canvas-h` | 1080 × 1920 px | Fixed logical canvas size (9:16). Never changes with content. Matches the PNG export size. |
| `--canvas-pad` | 5 px | White padding inside the canvas, all sides |
| `--gap` | 5 px | White margin around every image box; adjacent boxes show 10 px between them, and the canvas edges show 5 px padding plus 5 px margin |
| `--placeholder` | `#d9d9d9` | Empty image box fill; a centered add-photo icon marks the drop target |
| `--canvas-bg` | `#ffffff` | Canvas background / margin color; configurable with the action-bar color picker |
| `--page-bg` | `#2b2b2b` | Page background around the canvas |
| `--accent` | `#1e88e5` | Selection border, row-line highlight |

The canvas keeps its logical pixel size; it is visually scaled down (CSS `transform: scale()`, centered) to fit the available viewport space. All editor math uses logical pixels, so behavior is identical at any zoom. The real `<canvas>` is only used for export — the editor UI itself is DOM elements.

### Rows and image boxes

- Initial state: **two rows**, each containing **one empty placeholder box**.
- A row is a horizontal track inside the canvas; boxes fill it left to right, like a flex row with wrapping disabled.
- Image boxes are white on the outside (5 px margin) with light gray placeholder fill; once populated, the photo covers the box, cropped to the box aspect ratio and centered (`object-fit: cover`), clipped by the box. Adjacent boxes therefore have 10 px of white between them, and the canvas edges have 5 px padding plus the 5 px box margin.
- Empty boxes show a centered `add_photo_alternate` icon as a visual hint; loading a photo replaces it.
- **Add box:** a button beside each row, vertically centered, on both the left and right sides of the canvas, using `add_circle.svg`.
- **Add row:** buttons above and below the canvas, using `add_circle.svg`. A new row always starts with one empty box. The top button inserts at the top of the stack; the bottom button appends.
- No minimum number of rows: deleting the last box in the last row leaves an empty editor area, with the add-row buttons still usable.

### Selection and contextual actions

- Clicking an image box selects it: 3 px border in the accent blue. The border turns red while one of the box's locks is active.
- Clicking the canvas background, the gray editor background, or pressing `Escape` clears the selection and empties the contextual actions. The margin-color picker and Save stay visible.
- Double-clicking a box selects it and opens the image picker.
- Selected-box actions:
  - **Delete** (`delete.svg`) — removes the box. Deleting the last box in a row removes that row. The selection is cleared.
  - **Select image** (`image_search.svg`) — opens the browser file picker (`accept="image/*"`). The chosen file replaces the placeholder, cropped to the box aspect ratio and centered. Invalid or undecodable files show a visible error and leave the box unchanged.
  - **Lock square** (`crop_square.svg`) — enabled only after the box has an image. Sets the box width so it is square and keeps that ratio as the row height changes. The active button is red.
  - **Lock aspect ratio** (`image_aspect_ratio.svg`) — enabled only after the box has an image, and only when its image ratio matches any existing aspect lock in the row. Uses the image's natural aspect ratio to set the box width and keeps that ratio as the row height changes. When this is the row's only box, the row height is instead recalculated from the full width available to a box, so the photo spans the canvas from margin to margin whenever the other rows can still keep their 40 px minimums. Activating it resets the box's zoom and pan to the plain cover crop and hides the zoom circle until the lock is released; zoom changes are ignored while locked. Rotation stays available. The active button is red.
  - The two locks are exclusive: choosing one releases the other, and clicking the active lock releases it. While locked, width-boundary dragging involving that box is disabled; row height remains adjustable in multi-box rows, while a single-box locked row keeps its row-height handles disabled.
  - A row with multiple boxes can have at most `n − 1` locks. The remaining unlocked box is forced to fill whatever width is left. Deleting the forced box can leave only locked boxes, so the last lock is released automatically to restore the rule.
  - Aspect-ratio locks are further limited to one ratio per row: the first aspect-locked image sets the row's reference ratio, and another box may be aspect-locked only if its image has the exact same width:height ratio. The `n − 1` cap still applies. Replacing an aspect-locked image updates the group; locks that no longer match the reference are released.
  - A row with a single box may lock that box. Its row-height handles are then disabled: a square lock keeps its width derived from the row height, while an aspect lock derives the row height from the full width and centres the box if the row minimum makes it shorter.
- **Margin color** (`dashboard_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg`, always visible) — opens the system color picker and changes the canvas background, which is also the padding, gaps, and border color around the boxes. The chosen color is used by the PNG export.
- **Save** (`download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg`, always visible) — composites the fixed 1080 × 1920 canvas offscreen and downloads it as a PNG named `photo-collage.png`. Selection borders are not included; empty boxes export as their gray fill without the add-photo hint; photos are cover-cropped exactly as on screen.
- Only boxes have contextual actions; the margin-color picker and Save are global.

### Direct manipulation

- **Zoom a photo** — selecting a box that has a photo shows an 18 px circle in its bottom-right corner (screen-sized at any canvas scale). An invisible 40 px grab pad extends up-left from the dot so the target stays finger-sized without changing the visual. Pointer-drag the circle away from the box centre to scale the photo; the zoom factor follows the distance ratio, so pulling to twice the starting distance shows 2×. Zoom starts at the cover crop and stops at 6×. The circle is a `role="slider"`: arrow keys zoom and `Home` resets. While the box's aspect-ratio lock is active, the zoom circle is hidden and the state ignores zoom changes.
- **Rotate a photo** — a second 18 px circle sits 14 screen px outside the same corner, in an unclipped chrome layer so it stays reachable when the box touches the canvas edge. Its invisible grab pad extends 40 px down-right, away from the zoom pad so the two targets do not fight. Drag it around the box centre to rotate the photo in degrees; the image scales up just enough that its rotated rectangle still covers the box, so no gap appears. Arrow keys rotate ±1° (Shift ±15°) and `Home` resets. The rotation is stored per box in the (−180, 180] range and resets when the photo is replaced.
- **Pan a photo** — while the box is selected, pointer-drag the photo itself, or the canvas background under its ghost, to move it within the crop. Panning stops at the image edges, so no empty background ever shows. Offsets are stored as −1…1 shares of the rotation-aware slack on each screen axis, so the framing survives row and box resizes and is preserved through PNG export.
- **Ghost overlay** — while an image box is selected, the full photo is drawn at 32% opacity behind the box but above its siblings, showing the parts outside the crop as a drag reference. It follows the zoom and rotation. It is DOM chrome: the PNG export draws only the cropped, zoomed, rotated photo. The ghost and both circles vanish as soon as the selection clears or moves to another box.
- **Drag a box** — planned, not built: pointer-drag on a selected box reorders it within or across rows. Until reordering lands, a drag on a selected photo pans it instead.
- **Resize a box** — hovering the white gap between two boxes in the same row highlights it with a 2 px vertical accent line and shows a column-resize cursor. The grab band is measured in screen pixels (8 px around the boundary for a mouse, 22 px for touch) and extends over the boxes, so it stays usable when the canvas is scaled down. Dragging moves that boundary, trading width between the two boxes while every other box keeps its width. Both boxes are clamped to the 40 px minimum. Height always follows the row. A boundary touching a locked box is not draggable.
- **Resize a row** — hovering the white gap between two rows highlights it with a 2 px accent line across the canvas and shows a row-resize cursor. The same screen-sized grab band widens for touch. Dragging moves that boundary, trading height between the two adjacent rows while the canvas height and every other row stay fixed. Both rows are clamped to the 40 px minimum. Locked boxes recalculate their width from the new height so their ratio is preserved. A boundary adjacent to a single-box locked row is not draggable.
- **Lock a ratio** — square locks use 1:1; aspect locks use the natural image ratio. The width is derived from the current box height, so row-height changes keep the ratio. Unlocked siblings in the row reflow; other rows are untouched. Releasing a lock preserves the box's current pixel width and makes its boundaries draggable again.
- Use pointer events and capture the pointer only once the ~3 px movement threshold is crossed, so a tap still selects the box (or a boundary tap does nothing) instead of being swallowed by a drag.

### Reflow model

Boxes flow like flex items with `flex-grow`; the canvas never resizes.

- Canvas content width = `canvas-w − 2 × pad`. Content height = `canvas-h − 2 × pad`.
- Each row has a height **weight**; each box has a width **weight**.
- Row height = `contentH × weight / Σ rowWeights`, minus `2 × gap` for box height.
- Box width = `(contentW − 2 × gap × n) × weight / Σ boxWeights` in its row. Each box reserves a gap on both sides, so two adjacent boxes show twice the gap between them and every outer edge keeps one gap beyond the canvas padding.
- A locked box requests `boxHeight × lockRatio` instead of using its weight. Unlocked boxes share the remaining width by weight. A multi-box row always leaves at least one unlocked box, which absorbs the remainder. If the locked widths cannot fit, they shrink proportionally; if every box in a row is locked and the row is narrower than the canvas, the row stays left-aligned rather than stretching and breaking the ratio.
- A row's only box with an **aspect** lock is the exception: its height comes from the full width available to a box (`availableWidth ÷ imageRatio`), so the box fills the canvas from margin to margin. Fitted rows claim their height first; the remaining rows share the rest by weight and stay at or above 40 px. When the fitted heights cannot all fit, they are scaled down proportionally and every other row stays at its minimum. A fitted row whose ideal height would be shorter than 40 px keeps the 40 px row and centres the full-width box in it. If every row is fitted and there is height left over, the stack stays top-aligned and the canvas background shows below it.
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
| Empty-box hint | `assets/add_photo_alternate_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Delete box | `assets/delete_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Select image | `assets/image_search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Lock square | `assets/crop_square_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Lock aspect ratio | `assets/image_aspect_ratio_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Margin color | `assets/dashboard_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
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

- Fresh page shows two rows, one gray box each with a centered add-photo icon, white padding, and a 5 px box margin on every canvas edge.
- Add/remove boxes and rows from both ends and both side rails; confirm reflow and unchanged canvas size.
- Select a box: blue 3 px border and all four actions appear; deselect clears them while Save stays.
- Select an empty box: both lock buttons are gray and disabled.
- Load an image; the lock buttons enable. Lock square: the box becomes square, the button turns red, the selection border turns red, and its width boundaries stop responding.
- Add a second box to the row: only one of the two can be locked. Select the other box and confirm its lock buttons are disabled while it is forced to fill the remaining width.
- Aspect-ratio locks: with two boxes, aspect-lock one and confirm the other's aspect button is enabled only when its image has the exact same ratio. A different ratio leaves the aspect button disabled while the square lock remains available.
- Replace the reference aspect-locked image with a different ratio: confirm other aspect locks that no longer match are released.
- Single-box row: lock its box and confirm both row-height boundaries stop responding. Unlock and confirm row resizing returns.
- Delete the forced box from a row with multiple boxes and two locks: confirm a lock is released so one box stays unlocked.
- Double-click a box: the image picker opens for that box.
- Click the gray area around the canvas: the current selection clears.
- Change the row height with a square or aspect lock active: the locked box keeps its ratio and siblings in the row reflow.
- Lock aspect ratio: the box ratio matches the image's natural ratio. Replace the image and confirm the ratio updates.
- Aspect-lock the only box in a row: it expands to the full available width and its row height follows the image ratio; the other rows share the remaining height but stay at least 40 px. Add a row or change the photo and confirm the fitted box still fills the width. Unlock and confirm the row keeps its height instead of jumping.
- Aspect-lock a very tall image with several rows present: the fitted row takes all the height it can while the other rows stay at 40 px, and its box stays at the image ratio instead of overflowing.
- Zoom and pan a photo, then activate the aspect lock: zoom returns to 1×, pan recenters, the zoom circle disappears while the rotation circle stays, and further zoom attempts do nothing. Release the lock: the zoom circle returns at 1×. Activate the square lock instead and confirm zoom stays available.
- Choose the other lock: it replaces the first. Click the active lock: it releases, the current width is preserved, and width dragging works again.
- Load an image; confirm it covers the box, centered, cropped to the aspect ratio.
- Select an image box: a small accent circle appears in its bottom-right corner, a second circle just outside that corner, and the full photo shows as a translucent ghost outside the crop.
- Drag the inner circle outward: the photo zooms and the ghost keeps showing what falls outside the box. Release and confirm the live region reports the zoom. Drag inward to 1× and beyond; it stops at the cover crop. Arrow keys and `Home` on the focused circle zoom and reset.
- Drag the outer circle around the box: the photo and its ghost rotate together, and the crop grows just enough to stay full (no background gaps at the box corners). Arrow keys rotate ±1° (Shift ±15°); `Home` resets.
- Rotate a photo, then resize its row and box: the rotation stays, the crop continues to cover the box, and the rotate circle keeps tracking the corner — including when the corner sits on the canvas edge, where the unclipped chrome layer keeps it clickable.
- Drag the selected photo, or the background under its ghost: it pans within the crop, stops at the image edges, and the ghost moves with it. Resize its row or box and confirm the framing stays proportional. Panning still respects the tighter slack of a rotated photo.
- Select another box or clear the selection: both circles and the ghost disappear. Select an image box again: the saved zoom/pan/rotation return. Replace the photo: zoom, pan, and rotation all reset.
- Save while zoomed, panned, and rotated: the PNG matches the visible crop, with no ghost, circles, or selection border.
- Click Save; confirm a 1080 × 1920 PNG downloads and matches the canvas without selection borders.
- Click the margin-color button; pick a color and confirm the canvas padding/gaps change live and the exported PNG uses that color.
- Hover between two boxes in a row: vertical blue line and column-resize cursor; drag to trade widths down to 40 px.
- Hover between two rows: horizontal blue line and row-resize cursor; drag to trade heights down to 40 px.
- Drag a selected photo: it pans rather than reorders until drag reordering is built.
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

- Every icon button is a real `<button>` with an `aria-label`, a `title` tooltip for mouse users, and a visible hover/focus state.
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
