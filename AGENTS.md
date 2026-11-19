# AGENTS.md

## Project

**Photo Collage Editor** — a single-page photo collage editor that runs entirely in the browser.

- Opens directly from disk (`file://`) with no build step and no install.
- Pure vanilla JavaScript, HTML, and CSS. No frameworks, no bundler, no package manager.
- Offline by design: no network requests, no CDN links, no analytics, no remote fonts.
- Photos never leave the machine. All work happens in memory / `localStorage`.

## Current state

The editor shell is functional: a start screen that picks the canvas format (9:16, 16:9, 7:9, 5:4, or 1:1), weighted rows and boxes, a row/column mode toggle, add/remove with a one-step delete undo, selection, image loading, keyboard control, group-boundary and box-boundary resizing, image-ratio locks with full-size single-image groups, per-photo zoom/pan/rotation with a selection-only ghost overlay, a browser-local shelf of the last ten deleted or replaced photos, a configurable margin color, and JPEG/PNG save/export.

**Working:**

- `index.html` — two-region shell with the format start screen, action bar (including the permanent row/column toggle and border-thickness slider), scaled canvas stage, add-group buttons, add-box rails, hidden file and color inputs, and live region.
- `css/styles.css` — layout tokens, format buttons, scaled canvas, boxes, side rails, the mirrored column-mode stage, orientation-aware resize cursors, the border-thickness popover, focus/hover states, toast variants, reduced-motion handling.
- `js/layout.js` — format list and canvas sizes, weight-to-pixel flow math, per-box gaps on both edges with the user-set padding/gap thickness, image-ratio locks (including full-size fitted groups), 40 px minimums, whole-pixel rounding, the transposed column layout, and the cover/zoom/pan/rotate photo rectangle shared with export.
- `js/i18n.js` — English and German UI strings, selecting German for a `de` browser language and English otherwise, with declarative markup hooks.
- `js/state.js` — groups, boxes, weights, selection, add/remove, image assignment, exclusive square/aspect locks, row/column orientation with the structure turn, canvas margin color, border thickness, neighbor weight splits, per-box zoom/pan/rotation that resets when the photo is replaced, and the one-step remove/restore snapshot; revokes replaced object URLs.
- `js/images.js` — file validation, `createImageBitmap`/`<img>` decoding, URL element loading for export, and object URL cleanup; keeps the original `File` on the image so it can be shelved later.
- `js/history.js` — browser-local shelf of the last ten deleted or replaced photos in `localStorage`, deduplicated by content hash, storing downscaled JPEG copies and handing them back as image objects; survives a reload and starts empty when storage is unavailable.
- `js/render.js` — renders the format buttons, rows/columns, boxes, contextual tools including the lock toggles, both rails, group/box boundary overlays in either orientation, the selection-only zoom and rotation circles plus the translucent full-photo ghost, the square deleted-photo thumbnails, empty state, and success/error toast; includes geometry-only updates during drags; announces via `aria-live`.
- `js/export.js` — offscreen JPEG/PNG compositing at the chosen canvas size using the chosen margin color, the same zoom/pan/rotate crop as the editor, with no selection or ghost chrome, plus download.
- `js/main.js` — event wiring, format selection, file picker, margin-color picker, border-thickness popover with a frame-coalesced reflow, save action, orientation toggle, lock toggles, keyboard navigation/deletion, the one-step delete undo, the deleted-photo shelf, group- and box-boundary dragging in both orientations with a 3 px threshold, drag-to-zoom on the corner circle, drag-to-rotate on the outer circle, drag-to-pan on the selected photo, and canvas fit scaling.
- `serve.py` — stdlib-only local server on `http://localhost:8000`, verified to return the page and assets with `no-store`.
- `assets/` — the supplied and locally added Material Symbols SVGs, including the placeholder, lock, margin-color, and row/column mode icons.

**Not built yet:** drag reordering, full collage persistence, and general undo/redo. The deleted-photo shelf and its one-step delete undo are already browser-local.

**Next step:** drag a selected box to reorder within and across groups.


## Hard constraints

1. **No dependencies.** Do not add npm packages, vendored libraries, or remote script/style/icon URLs.
2. **Works from `file://`.** Do not use ES `import` / `export` or `fetch()` for local assets — browsers block both on the `file:` protocol. Use classic `<script>` tags in dependency order.
3. **No network I/O.** No `fetch`, `XMLHttpRequest`, WebSockets, or remote images.
4. **No generated artifacts in git.** No `node_modules`, dist bundles, or exported collages.

## UI specification (v1)

### Page structure

On load the editor area shows a **format start screen**: the heading `Select format:` above five buttons (9:16 Status, 16:9 Banner, 7:9 Portrait, 5:4, 1:1 Square), each with its icon, ratio, optional name, and pixel size. The action bar and canvas stay hidden until a format is chosen. Choosing one starts the editor and does not offer the start screen again for that session.

While editing, two stacked regions fill the viewport height, no page scrolling:

1. **Action bar** — fixed height (~56 px) at the top, dark background. Contextual tool icons sit on the left; the always-visible **row/column toggle**, **border-thickness button**, **margin-color picker**, and **Save** button sit on the right. The contextual area is empty when nothing is selected.
2. **Editor area** — fills the remaining height, dark gray background (`#2b2b2b`). Centered inside it: the collage canvas, with add-group buttons and add-box rails arranged according to the current mode.

### Row and column modes

- A permanent action-bar toggle switches between **row mode** and **column mode**, showing `space_dashboard` upright in column mode and rotated 90° counter-clockwise in row mode. The switch is exposed through the button's label and title.
- Distinct portrait formats (9:16, 7:9) start in **row mode**; landscape formats (16:9, 5:4) start in **column mode**; 1:1 starts in row mode. The chosen canvas size never changes with the mode.
- Row mode is the horizontal model: groups stack top to bottom, boxes run left to right within each group, add-group buttons sit above and below, add-box buttons sit left and right, group boundaries are horizontal, and box boundaries are vertical.
- Column mode is the same weighted model transposed: groups run left to right as columns, boxes stack top to bottom within each column, add-group buttons sit left and right, add-box buttons sit above and below, group boundaries are vertical, and box boundaries are horizontal. The canvas itself keeps its format.
- The lock rules are per group, so they apply per column in column mode: the `n − 1` cap, the shared aspect-ratio reference, and the disabled boundary next to a single-box locked group all follow the columns.
- A single-box aspect-locked group still spans the full cross axis, which means the full canvas height in column mode. Square locks derive the box's other side from the group's cross-axis size in either mode.
- Switching modes turns the structure 90°: row → column is clockwise (the top row becomes the right column) and column → row is counter-clockwise (the right column becomes the top row). Box order inside each group is preserved, so the leftmost box becomes the topmost.
- The turn freezes the current pixel proportions into the weights first, releases every ratio lock before the structure moves, and never rotates or resets the photos themselves. Their zoom, pan, and rotation survive; only the box shape changes.
- Switching modes clears the current box selection, so the selection border, ghost, and zoom/rotate circles do not follow the box into the new layout.
- No animation is used for the switch.

### Layout metrics

Define once as CSS custom properties on `:root` and mirror them in JS constants:

| Token | Value | Meaning |
| --- | --- | --- |
| `--canvas-w` / `--canvas-h` | from the chosen format | Logical canvas size; 1080 px on the shorter side, the longer side from the ratio: 9:16 → 1080 × 1920, 16:9 → 1920 × 1080, 7:9 → 1080 × 1389, 5:4 → 1350 × 1080, 1:1 → 1080 × 1080. Set when the format is chosen; never changes with content. Matches the export size. |
| `--canvas-pad` | 5 px default, 0–100 px | White padding inside the canvas, all sides. Set by the border-thickness slider; 0 removes it |
| `--gap` | 5 px default, 0–100 px | White margin around every image box, set by the same slider. At 5 px adjacent boxes show 10 px between them, and the canvas edges show 5 px padding plus 5 px margin; at 0 the photos touch and the canvas background is hidden |
| `--placeholder` | `#d9d9d9` | Empty image box fill; a centered add-photo icon marks the drop target |
| `--canvas-bg` | `#ffffff` | Canvas background / margin color; configurable with the action-bar color picker |
| `--page-bg` | `#2b2b2b` | Page background around the canvas |
| `--accent` | `#1e88e5` | Selection border, row-line highlight |

The canvas keeps its logical pixel size; it is visually scaled down (CSS `transform: scale()`, centered) to fit the available viewport space. All editor math uses logical pixels, so behavior is identical at any zoom. The real `<canvas>` is only used for export — the editor UI itself is DOM elements.

### Rows and image boxes

- Initial state after choosing a format: **two groups**, each containing **one empty placeholder box**. Portrait and square formats call these rows; landscape formats call them columns.
- In row mode a group is a horizontal track inside the canvas; boxes fill it left to right, like a flex row with wrapping disabled. In column mode the same group is a vertical track; boxes stack top to bottom.
- Image boxes are white on the outside (5 px margin by default, set by the border-thickness slider) with light gray placeholder fill; once populated, the photo covers the box, cropped to the box aspect ratio and centered (`object-fit: cover`), clipped by the box. At the default thickness, adjacent boxes have 10 px of white between them, and the canvas edges have 5 px padding plus the 5 px box margin.
- Empty boxes show a centered `add_photo_alternate` icon as a visual hint; loading a photo replaces it.
- **Add box:** a button beside each group, using `add_circle.svg`. In row mode the buttons sit on the left and right of the canvas, vertically centered on the row. In column mode they sit above and below the canvas, horizontally centered on the column.
- **Add group:** buttons outside the canvas, using `add_circle.svg`. In row mode they sit above and below and add a row (top inserts at the top, bottom appends). In column mode they sit to the left and right and add a column (left inserts at the left, right appends). A new group always starts with one empty box.
- No minimum number of groups: deleting the last box in the last group leaves an empty editor area, with the add-group buttons still usable.

### Selection and contextual actions

- Clicking an image box selects it: 3 px border in the accent blue. The border turns red while one of the box's locks is active.
- Clicking the canvas background, the gray editor background, or pressing `Escape` clears the selection and empties the contextual actions. The row/column toggle, border-thickness button, margin-color picker, and Save stay visible.
- Double-clicking a box selects it and opens the image picker.
- Selected-box actions:
  - **Delete** (`delete.svg`) — removes the box. Deleting the last box in a group removes that group. The selection is cleared.
  - **Select image** (`image_search.svg`) — opens the browser file picker (`accept="image/*"`). The chosen file replaces the placeholder, cropped to the box aspect ratio and centered. Invalid or undecodable files show a visible error and leave the box unchanged.
  - **Lock square** (`crop_square.svg`) — enabled only after the box has an image. Sets the box's free side so it is square and keeps that ratio as the group's cross-axis size changes (row height in row mode, column width in column mode). The active button is red.
  - **Lock aspect ratio** (`image_aspect_ratio.svg`) — enabled only after the box has an image, and only when its image ratio matches any existing aspect lock in the group. Uses the image's natural aspect ratio to set the box's free side and keeps that ratio as the group's cross-axis size changes. When this is the group's only box, the group's cross-axis size is instead recalculated from the full flow-axis space available to a box, so the photo spans the canvas from margin to margin (top to bottom in column mode) whenever the other groups can still keep their 40 px minimums. Activating it resets the box's zoom and pan to the plain cover crop and hides the zoom circle until the lock is released; zoom changes are ignored while locked. Rotation stays available. The active button is red.
  - The two locks are exclusive: choosing one releases the other, and clicking the active lock releases it. While locked, boundary dragging involving that box is disabled; the group's cross-axis size remains adjustable in multi-box groups, while a single-box locked group keeps its group-boundary handles disabled.
  - A group with multiple boxes can have at most `n − 1` locks. The remaining unlocked box is forced to fill whatever space is left. Deleting the forced box can leave only locked boxes, so the last lock is released automatically to restore the rule.
  - Aspect-ratio locks are further limited to one ratio per group: the first aspect-locked image sets the group's reference ratio, and another box may be aspect-locked only if its image has the exact same width:height ratio. The `n − 1` cap still applies. Replacing an aspect-locked image updates the group; locks that no longer match the reference are released.
  - A group with a single box may lock that box. Its group-boundary handles are then disabled: a square lock keeps the box's free side derived from the group's cross-axis size, while an aspect lock derives the group's cross-axis size from the full flow-axis space and centres the box if the group minimum makes it shorter.
- **Margin color** (`format_color_fill_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg`, always visible) — opens the system color picker and changes the canvas background, which is also the padding, gaps, and border color around the boxes. The chosen color is used by both export formats.
- **Border thickness** (`line_weight_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` rotated 90° clockwise, always visible) — opens a small popover below the button with a 0–100 px slider and a live `N px` readout. The value sets the canvas padding and every box gap together, so 5 px is the classic layout (10 px between boxes and to the canvas edge) and 0 px removes all margins: boxes touch each other and the canvas edge, and the margin color is no longer visible. It applies to both modes and both export formats. The slider is keyboard reachable; each step reflows the canvas once per frame. Escape, an outside click, or tabbing out closes the popover.
- **Save** (`download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg`, always visible) — opens a small menu below the button with **JPEG (.jpg)** and **PNG (.png)**. Both composite the canvas at the chosen format's logical size (1080 px on the shorter side) offscreen and download it as `collage-yyyy-MM-dd-HH-mm.<ext>` using the local save time; JPEG is encoded at 85% quality. Selection borders are not included; empty boxes export as their gray fill without the add-photo hint; photos are cover-cropped exactly as on screen.
- Only boxes have contextual actions; the row/column toggle, border-thickness slider, margin-color picker, and Save are global.

### Undo and the deleted-photo shelf

- Every deleted or replaced photo is copied into a browser-local shelf in `localStorage`: the ten most recent, newest first, deduplicated by a content hash so the same photo never fills two slots. The stored copy is downscaled to 800 px on its longer side (JPEG, 80% quality); deleting or replacing the same photo again moves its existing entry to the front instead of adding another. Storage failures (private mode, full quota) degrade to a session-only shelf instead of breaking the editor.
- The shelf is a second dark bar with square 40 px thumbnails cropped with `object-fit: cover`: beside the left edge of the editor for landscape formats (16:9, 5:4) and along the bottom for portrait and square formats (9:16, 7:9, 1:1). It hides before a format is chosen and while it is empty, and scrolls when ten thumbnails do not fit.
- Clicking a thumbnail inserts the stored photo into the currently selected box; the photo it replaces joins the shelf in turn. With no box selected it shows a short hint instead. The shelf never adds, removes, or reorders boxes on its own, and the selected box keeps the selection.
- Deleting a box shows an **Undo** button (`undo_24dp_…svg`) at the far left of the action bar. It restores only the last deleted box: same group, index, and weight, with its photo, zoom, pan, and rotation, but without a ratio lock, and selects the restored box. The button hides after that one undo.
- Any structural change discards the pending undo: another delete (which becomes the new undo target), adding a box or group, or switching row/column mode. The shelved photo stays available. Replacing a photo or editing its zoom, pan, rotation, or locks does not discard the undo.
- The in-memory image of the pending undo is kept alive (its object URL is not revoked) until the undo is used or discarded.

### Direct manipulation

- **Zoom a photo** — selecting a box that has a photo shows an 18 px circle in its bottom-right corner (screen-sized at any canvas scale). An invisible 40 px grab pad extends up-left from the dot so the target stays finger-sized without changing the visual. Pointer-drag the circle away from the box centre to scale the photo; the zoom factor follows the distance ratio, so pulling to twice the starting distance shows 2×. 1× is the cover crop for the current rotation; dragging inward goes below 1× until the whole rotated photo fits in the box (the canvas background shows around it), and outward stops at six times the unrotated cover. The range is recalculated when the photo is rotated or the box is resized. The circle is a `role="slider"`: arrow keys zoom and `Home` resets to the cover crop. While the box's aspect-ratio lock is active, the zoom circle is hidden and the state ignores zoom changes.
- **Rotate a photo** — a second 18 px circle sits 14 screen px outside the same corner, in an unclipped chrome layer so it stays reachable when the box touches the canvas edge. Its invisible grab pad extends 40 px down-right, away from the zoom pad so the two targets do not fight. Drag it around the box centre to rotate the photo in degrees. At 1× the image scales up just enough that its rotated rectangle still covers the box, so no gap appears; zooming out below 1× then trades that cover for showing more of the photo, down to the fit scale. Arrow keys rotate ±1° (Shift ±15°) and `Home` resets. The rotation is stored per box in the (−180, 180] range and resets when the photo is replaced.
- **Pan a photo** — while the box is selected, pointer-drag the photo itself, or the canvas background under its ghost, to move it within the crop. Panning stops at the image edges, so it never reveals more background than the current zoom already shows. Offsets are stored as −1…1 shares of the rotation-aware slack on each screen axis, so the framing survives row and box resizes and is preserved through export.
- **Ghost overlay** — while an image box is selected, the full photo is drawn at 32% opacity behind the box but above its siblings, showing the parts outside the crop as a drag reference. It follows the zoom and rotation. It is DOM chrome: the export draws only the cropped, zoomed, rotated photo. The ghost and both circles vanish as soon as the selection clears or moves to another box.
- **Drag a box** — planned, not built: pointer-drag on a selected box reorders it within or across groups. Until reordering lands, a drag on a selected photo pans it instead.
- **Resize a box** — hovering the white gap between two boxes in the same group highlights it with a 2 px accent line (vertical in row mode, horizontal in column mode) and shows the matching column- or row-resize cursor. The grab band is measured in screen pixels (8 px around the boundary for a mouse, 22 px for touch) and extends over the boxes, so it stays usable when the canvas is scaled down. Dragging moves that boundary, trading width or height between the two boxes while every other box keeps its size. Both boxes are clamped to the 40 px minimum. The cross-axis size always follows the group. A boundary touching a locked box is not draggable.
- **Resize a group** — hovering the white gap between two groups highlights it with a 2 px accent line (horizontal between rows, vertical between columns) and shows the matching row- or column-resize cursor. The same screen-sized grab band widens for touch. Dragging moves that boundary, trading height or width between the two adjacent groups while the canvas size and every other group stay fixed. Both groups are clamped to the 40 px minimum. Locked boxes recalculate their free side from the new cross-axis size so their ratio is preserved. A boundary adjacent to a single-box locked group is not draggable.
- **Lock a ratio** — square locks use 1:1; aspect locks use the natural image ratio. The box's free side is derived from the group's current cross-axis size, so resizing the group keeps the ratio. Unlocked siblings in the group reflow; other groups are untouched. Releasing a lock preserves the box's current pixel size and makes its boundaries draggable again.
- Use pointer events and capture the pointer only once the ~3 px movement threshold is crossed, so a tap still selects the box (or a boundary tap does nothing) instead of being swallowed by a drag.

### Reflow model

Boxes flow like flex items with `flex-grow`; the canvas never resizes. Row mode is the model below; column mode is the same math with the flow and cross axes swapped.

- Canvas content width = `canvas-w − 2 × pad`. Content height = `canvas-h − 2 × pad`.
- Each group has a flow-axis **weight** (row height or column width); each box has a cross-axis **weight** (box width or height).
- Group extent = `flowTotal × weight / Σ groupWeights`, minus `2 × gap` for the box extent.
- Box extent = `(crossTotal − 2 × gap × n) × weight / Σ boxWeights` in its group. Each box reserves a gap on both sides, so two adjacent boxes show twice the gap between them and every outer edge keeps one gap beyond the canvas padding.
- A locked box requests the group's cross-axis size multiplied by the lock ratio (inverted in column mode so the image's width:height proportion still holds) instead of using its weight. Unlocked boxes share the remaining cross-axis space by weight. A multi-box group always leaves at least one unlocked box, which absorbs the remainder. If the locked sizes cannot fit, they shrink proportionally; if every box in a group is locked and the group is smaller than the canvas, it stays left/top-aligned rather than stretching and breaking the ratio.
- A group's only box with an **aspect** lock is the exception: its cross-axis size comes from the full flow-axis space available to a box, so the box fills the canvas from margin to margin (top to bottom in column mode). Fitted groups claim their flow-axis extent first; the remaining groups share the rest by weight and stay at or above 40 px. When the fitted extents cannot all fit, they are scaled down proportionally and every other group stays at its minimum. A fitted group whose ideal extent would be shorter than 40 px keeps the 40 px group and centres the full-size box in it. If every group is fitted and there is space left over, the stack stays start-aligned and the canvas background shows beyond it.
- Adding a box gives it the group's mean weight; adding a group gives it the mean group weight and renormalizes the stack.
- Removing a box or group renormalizes the remaining weights.
- Resizing redistributes weight only between the dragged element and its siblings/adjacent groups.
- Clamp with minimums (group 40 px, box ≈ 40 px) so nothing collapses to zero.
- Round to whole logical pixels; give the last box in a group the rounding remainder so edges stay flush. Never let a gap or box overflow the padded content box.

The result: any structural or size change reflows the whole canvas to fill the same fixed area, with no scrolling inside the canvas.

### Icons

The icons are already downloaded into `assets/` as Material Symbols SVGs. Keep
the supplied filenames; reference them through a single `ICONS` constant so the
long names are written once.

| Purpose | Path |
| --- | --- |
| Add group / add box | `assets/add_circle_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Undo last delete | `assets/undo_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Row/column mode indicator | `assets/space_dashboard_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` (row mode rotates it 90° counter-clockwise) |
| Empty-box hint | `assets/add_photo_alternate_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Delete box | `assets/delete_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Select image | `assets/image_search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Lock square | `assets/crop_square_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Lock aspect ratio | `assets/image_aspect_ratio_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Margin color | `assets/format_color_fill_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |
| Border thickness | `assets/line_weight_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` (rotated 90° clockwise) |
| Save / download | `assets/download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg` |

- The SVGs have a baked-in `fill="#e3e3e3"`, tuned for the dark UI. Do not wrap them in a darker container; if extra contrast is ever needed, override the fill instead of downloading new icons.
- 24 × 24 viewBox. Reference with `<img>` or an inline `<symbol>` sprite; never an icon font or CDN.

## File layout

```
index.html            Markup, hidden file input, script/style includes
css/styles.css        All styles, layout metrics as custom properties
js/
  state.js            Editor state, weights, history, persistence
  layout.js           Format sizes, weight → pixel flow math, row/column group and box geometry
  i18n.js             UI strings for the browser language (German for de, English otherwise)
  images.js           File loading, decoding, cover-crop, object URLs
  history.js          Deleted/replaced photo shelf in localStorage (10, deduplicated)
  render.js           DOM rendering of the format screen, rows/columns, boxes, shelf and selection UI
  export.js           Offscreen canvas compositing at the chosen format → PNG/JPEG
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

- Fresh page shows two groups (rows or columns, depending on the format), one gray box each with a centered add-photo icon, white padding, and a 5 px box margin on every canvas edge.
- Add/remove boxes and groups from both ends and both rails in each mode; confirm reflow and unchanged canvas size.
- Select a box: blue 3 px border and all four actions appear; deselect clears them while Save stays.
- Select an empty box: both lock buttons are gray and disabled.
- Load an image; the lock buttons enable. Lock square: the box becomes square, the button turns red, the selection border turns red, and its width boundaries stop responding.
- Add a second box to the row: only one of the two can be locked. Select the other box and confirm its lock buttons are disabled while it is forced to fill the remaining width.
- Aspect-ratio locks: with two boxes, aspect-lock one and confirm the other's aspect button is enabled only when its image has the exact same ratio. A different ratio leaves the aspect button disabled while the square lock remains available.
- Replace the reference aspect-locked image with a different ratio: confirm other aspect locks that no longer match are released.
- Single-box row: lock its box and confirm both row-height boundaries stop responding. Unlock and confirm row resizing returns.
- Delete the forced box from a row with multiple boxes and two locks: confirm a lock is released so one box stays unlocked.
- Delete a box with a photo: an undo button appears at the far left of the action bar, the photo appears in the shelf (left bar on a landscape format, bottom bar on a portrait or square format), and no console errors appear.
- Click undo: the box returns at its old position with its photo and framing, its ratio lock is gone, the box is selected, and the undo button disappears.
- Delete a box, then add a box, add a group, or switch row/column mode: the undo button disappears. Repeat with a second delete: undo reverts only the newest delete.
- Replace a loaded photo: the previous photo joins the shelf. Replace it again with the same photo: it moves to the front instead of appearing twice. Reload the page and confirm the shelf is restored; delete or replace more than ten photos and confirm the oldest drops off.
- Click a shelf thumbnail with a box selected: the photo replaces that box's image and the old photo joins the shelf. Click one with nothing selected: a hint asks for a box and the collage structure stays unchanged.
- Choose a 16:9 or 5:4 format: the shelf sits on the left. Choose 9:16, 7:9, or 1:1: it sits along the bottom. It stays hidden until the first photo is shelved, scales the canvas when it appears, and its thumbnails are square crops.
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
- Drag the inner circle outward: the photo zooms and the ghost keeps showing what falls outside the box. Release and confirm the live region reports the zoom. Drag inward past 1×: the photo keeps shrinking until the whole rotated photo fits in the box, then stops. Arrow keys and `Home` on the focused circle zoom and reset to the cover crop.
- Rotate a portrait photo in a wide box, then drag the zoom circle inward: the photo can now be zoomed out below the cover scale, down to the fit scale, with the canvas background showing around it. Rotating back to 0° recalculates the minimum and clamps the zoom if the current value no longer fits.
- Drag the outer circle around the box: the photo and its ghost rotate together, and the crop grows just enough to stay full (no background gaps at the box corners). Arrow keys rotate ±1° (Shift ±15°); `Home` resets.
- Rotate a photo at 1×, then resize its row and box: the rotation stays, the crop continues to cover the box, and the rotate circle keeps tracking the corner — including when the corner sits on the canvas edge, where the unclipped chrome layer keeps it clickable.
- Drag the selected photo, or the background under its ghost: it pans within the crop, stops at the image edges, and the ghost moves with it. Resize its row or box and confirm the framing stays proportional. Panning still respects the tighter slack of a rotated photo.
- Select another box or clear the selection: both circles and the ghost disappear. Select an image box again: the saved zoom/pan/rotation return. Replace the photo: zoom, pan, and rotation all reset.
- Save while zoomed, panned, and rotated: the exported PNG and JPEG match the visible crop, with no ghost, circles, or selection border.
- Fresh page shows the `Select format:` heading above five buttons with icons, ratios, names, and pixel sizes; the action bar and canvas stay hidden. Choose one and the editor appears with the matching canvas (9:16 → 1080 × 1920, 16:9 → 1920 × 1080, 7:9 → 1080 × 1389, 5:4 → 1350 × 1080, 1:1 → 1080 × 1080).
- The action bar shows the permanent row/column toggle before the border-thickness and margin-color buttons. Portrait and square formats open in row mode with the dashboard icon rotated 90° counter-clockwise; landscape formats open in column mode with the dashboard icon upright. The browser surface stays at the chosen size in both modes.
- Click the border-thickness button: a popover opens with a slider at 5 px and the line-weight icon shows upright (rotated 90° clockwise). Drag it to 0: the canvas fills edge to edge, boxes touch each other, and the margin color is no longer visible. Slide to 20 and confirm the padding and every gap grow to 20 px (40 px between two boxes), the readout follows, and the canvas size stays fixed. Check the same in column mode and in an exported PNG/JPEG. Escape, an outside click, or tabbing away closes the popover.
- Switch a portrait format to column mode: two stacked rows become two side-by-side columns, the top row becomes the right column, add-group buttons move to the left/right, add-box buttons move above/below each column, group boundaries are vertical, and box boundaries are horizontal. Switch back and the right column becomes the top row.
- With images present, switch modes: the box selection clears (border, ghost, and zoom/rotate circles disappear), every ratio lock is released, the photos keep their zoom, pan, and rotation, and the visible proportions are carried into the new axes. No animation runs.
- In column mode, hover between two columns for a vertical line and column-resize cursor; hover between two boxes inside a column for a horizontal line and row-resize cursor. Drag each and confirm the sizes trade while the canvas stays fixed.
- In column mode, confirm the `n − 1` lock cap, matching aspect ratios, and the disabled group boundary next to a single-box locked column. Lock aspect ratio on a lone column: the box spans the canvas from top to bottom with its natural ratio. Lock square on a lone column: its height matches its width.
- Delete every box in column mode: the empty state mentions columns, and the left/right add-group buttons still add a column.
- Click Save; confirm a menu opens below the button with JPEG and PNG. Each downloads a file at the chosen canvas size with the matching extension and matches the canvas without selection borders. Repeat in column mode and confirm the columns and boxes appear at their on-screen positions, not stacked at the left edge. Confirm the menu closes with Escape, an outside click, or after choosing a format.
- Click the margin-color button; pick a color and confirm the canvas padding/gaps change live and the exported file uses that color.
- Hover between two boxes in a row: vertical blue line and column-resize cursor; drag to trade widths down to 40 px.
- Hover between two rows: horizontal blue line and row-resize cursor; drag to trade heights down to 40 px.
- Drag a selected photo: it pans rather than reorders until drag reordering is built.
- Resize a box and drag a row boundary; confirm neighboring boxes/rows reflow and every other box/row keeps its size.
- Delete every box; confirm rows disappear and add-row still works.
- Resize the window; confirm the canvas scales without changing its logical layout.

## Code conventions

- Modern JavaScript (ES2020+): `const`/`let`, arrow functions, template literals, `'use strict'` per file.
- `kebab-case` for ids/classes, `camelCase` for JS, `UPPER_SNAKE_CASE` for constants.
- All user-facing text lives in `js/i18n.js`; use `I18n.t()` in scripts and the `data-i18n*` attributes in markup.
- One source of truth for state (`state.js`). DOM is a render target; never read editor state back out of the DOM.
- Separate "mutate state" from "render". Route undoable mutations through one commit function.
- Use `requestAnimationFrame` for visual updates; throttle pointermove work; avoid layout thrash and per-frame `toBlob()`.
- Release object URLs and `ImageBitmap`/canvas references when boxes are removed or photos replaced.
- Comments explain *why*. No commented-out code.

## UX and accessibility

- Every icon button is a real `<button>` with an `aria-label`, a `title` tooltip for mouse users, and a visible hover/focus state.
- Keyboard: `Tab` moves through controls; arrow keys move selection between boxes; `Delete`/`Backspace` deletes the selected box; `Enter`/`Space` opens the image picker; `Escape` deselects.
- Announce selection and error messages via an `aria-live` region.
- Show a friendly empty state when no groups remain, using row or column wording; fail visibly on unsupported or undecodable images.
- Respect `prefers-reduced-motion` for transitions.

## Performance and limits

- Keep drag/resize at ~60 fps with 20 boxes on a mid-range laptop; update existing group/box geometry during a drag instead of rebuilding the tree.
- Prefer `createImageBitmap` where available; never block on decoding.
- Downscale very large photos for on-screen rendering while keeping originals for export.

## Open questions

Defaults chosen for v1 — change them here before implementation if wrong:

1. **Drag semantics:** reorder by weight, not free placement. Free positioning would conflict with the flex-flow requirement.
2. **Canvas size:** 1080 px on the shorter side, longer side from the chosen format (9:16, 16:9, 7:9, 5:4, or 1:1), matching the export target.
3. **Resize axes:** in row mode, boxes resize horizontally and rows vertically; column mode swaps those axes. The mode toggle owns the choice, so there are no per-box vertical handles.
4. **Persistence and undo/redo:** full collage persistence and general undo/redo are still planned. The deleted-photo shelf and its one-step delete undo are part of v1; the weight-based state keeps broader persistence cheap to add later.

## Git

- Imperative, short commit subjects, e.g. `Add row boundary dragging`.
- One logical change per commit; keep refactors separate.
