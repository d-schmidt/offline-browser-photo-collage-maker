# Photo Collage Editor

A photo collage editor that runs entirely in your browser. Open the page, add
rows and image boxes, and pick photos from your computer. Everything happens
locally: no install, no build step, no network requests, and no uploads.

## Open it

- **Hosted:** <https://d-schmidt.github.io/offline-browser-photo-collage-maker/>
- **Quickest locally:** double-click `index.html`. It works straight from disk
  (`file://`).
- **Dev server:** run `python serve.py` and visit
  <http://localhost:8000>. Use `-p 8080` for another port or `--no-open` to skip
  launching a browser. Standard library only; nothing to install.

## What it does today

- Starts with a format chooser: **9:16 Status** (1080 × 1920), **16:9 Banner**
  (1920 × 1080), **7:9 Portrait** (1080 × 1389), **5:4** (1350 × 1080), and
  **1:1 Square** (1080 × 1080). Every format keeps 1080 px on its shorter side.
- After choosing, two groups appear, each holding one empty photo box. Empty boxes show a centered add-photo icon. Portrait and square formats start with rows; landscape formats start with columns.
- The permanent **row/column button** in the action bar switches the layout. Column mode is the same model turned on its side: columns run left to right, boxes stack inside them, and every divider and lock constraint follows the columns.
- **+ above/below the canvas** adds a row; **+ on either side of a row** adds a box to it. In column mode the buttons swap: **+ left/right** adds a column and **+ above/below a column** adds a box.
- Drag the white gap between two boxes in a group to trade width (row mode) or height (column mode); a blue line and the matching resize cursor show the handle.
- Drag the white gap between two groups to trade height (row mode) or width (column mode); a blue line and resize cursor show the handle.
- Switching modes turns the structure 90°: the top row becomes the right column going to column mode, and the right column becomes the top row going back. Photos keep their own zoom, pan, and rotation; ratio locks are released before the turn.
- Click a box to select it: blue 3 px border, with the contextual actions in the action bar. A red border means a lock is active.
- Double-click a box to open the image picker for it.
- Click the gray background around the canvas or press `Escape` to clear the selection.
- The action bar offers **Delete box**, **Select image**, and, once the box has an image, exclusive **square** and **aspect ratio** locks. An active lock turns red; Save is always visible on the right.
- Locked boxes keep their square or image ratio when the group's cross-axis size changes; boundaries touching a locked box are disabled. In a multi-box group, at most all but one box can be locked; the remaining box fills the space left. Aspect-ratio locks must share the same image ratio within a group—the first one sets the reference. A single-box group with a locked box also locks its group-boundary handles. Clicking the active lock releases it and preserves the current size. Activating the aspect-ratio lock resets the photo's zoom and pan to the plain cover crop and hides its zoom circle until the lock is released; square locks keep zoom available. A lone aspect-locked group fills the canvas from margin to margin (top to bottom in column mode).
- Photos are cropped to cover the box, centered and clipped to its edges at 1×; zooming out below 1× shows the whole rotated photo with the margin color around it.
- Select a photo box to reveal a small circle in its bottom-right corner. Drag it away from the box centre to zoom in (up to 6× the unrotated cover) or inward below 1× to show the whole rotated photo, down to the fit scale; drag the photo, or the canvas background under its ghost, to pan. A second circle just outside the corner rotates the photo; at 1× the crop scales up as needed to stay full, and zooming out below 1× reveals more of the photo. While the box is selected, the whole photo appears as a translucent ghost outside the crop; the ghost and both circles are editor-only and never appear in the export.
- Deleting every box in a group removes the group; the empty state keeps the
  add-group buttons available.
- The canvas (1080 px on its shorter side, longer side set by the chosen
  format) scales to fit the window without changing its layout.
- **Margin color** in the action bar opens the system color picker and recolors the canvas padding and gaps; the export uses the same color.
- **Save** opens a menu for JPEG or PNG. Both download a file at the chosen canvas size named `collage-yyyy-MM-dd-HH-mm.jpg` or `.png` using the local save time; JPEG uses 85% quality. The export matches the on-screen layout in either mode.

Keyboard: on the start screen, `Tab` moves between formats and `Enter` or
`Space` starts the editor. While editing, `Tab` moves through controls, arrow keys move box selection,
`Delete`/`Backspace` deletes the selected box, `Enter`/`Space` opens the image
picker, and `Escape` clears the selection. With the zoom circle focused, the
arrow keys zoom in and out and `Home` resets the zoom. With the rotation circle
focused, the arrow keys rotate by 1° (Shift for 15°) and `Home` resets.

Still to come: dragging boxes to reorder, persistence, and undo/redo.

## Privacy

Files you select are read in memory through `URL.createObjectURL` and are never
sent anywhere. The page makes no network requests, uses no CDN, and needs no
dependencies.
