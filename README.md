# Photo Collage Editor

A photo collage editor that runs entirely in your browser. Open the page, add
rows and image boxes, and pick photos from your computer. Everything happens
locally: no install, no build step, no network requests, and no uploads.

## Open it

- **Quickest:** double-click `index.html`. It works straight from disk
  (`file://`).
- **Dev server:** run `python serve.py` and visit
  <http://localhost:8000>. Use `-p 8080` for another port or `--no-open` to skip
  launching a browser. Standard library only; nothing to install.

## What it does today

- Starts with two rows, each holding one empty photo box on a 9:16 canvas.
- **+ above/below the canvas** adds a row; **+ on either side of a row** adds a box to it.
- Drag the white gap between two boxes in a row to trade width; a vertical blue line and column-resize cursor show the handle.
- Drag the white gap between two rows to trade height between them; a blue line and resize cursor show the handle.
- Click a box to select it. The action bar offers **Delete box** and
  **Select image**, plus an always-visible **Save** button.
- Photos are cropped to cover the box, centered and clipped to its edges.
- Deleting every box in a row removes the row; the empty state keeps the
  add-row buttons available.
- The 1080 × 1920 canvas scales to fit the window without changing its layout.
- **Save** downloads the collage as a 1080 × 1920 PNG (`photo-collage.png`).

Keyboard: `Tab` moves through controls, arrow keys move box selection,
`Delete`/`Backspace` deletes the selected box, `Enter`/`Space` opens the image
picker, and `Escape` clears the selection.

Still to come: dragging boxes to reorder, persistence, and undo/redo.

## Privacy

Files you select are read in memory through `URL.createObjectURL` and are never
sent anywhere. The page makes no network requests, uses no CDN, and needs no
dependencies.
