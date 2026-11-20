# Photo Collage Editor

A photo collage editor that runs entirely in your browser. Open the page, add
rows and image boxes, and pick photos from your computer. Everything happens
locally: no install, no build step, no network requests, and no uploads.
The interface follows the browser language: German for a German locale, English
otherwise.

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
- After choosing, two groups appear, each holding one empty photo box. Empty boxes show a centered add-photo icon over their translucent gray fill: on a white canvas that still reads as the same solid gray as before, while a gradient margin shows faintly through. Portrait and square formats start with rows; landscape formats start with columns.
- The permanent **row/column button** in the action bar switches the layout. Column mode is the same model turned on its side: columns run left to right, boxes stack inside them, and every divider and lock constraint follows the columns.
- **+ above/below the canvas** adds a row; **+ on either side of a row** adds a box to it. In column mode the buttons swap: **+ left/right** adds a column and **+ above/below a column** adds a box.
- Drag the white gap between two boxes in a group to trade width (row mode) or height (column mode); a blue line and the matching resize cursor show the handle.
- Drag the white gap between two groups to trade height (row mode) or width (column mode); a blue line and resize cursor show the handle.
- Switching modes turns the structure 90°: the top row becomes the right column going to column mode, and the right column becomes the top row going back. The current box selection is cleared, photos keep their own zoom, pan, and rotation, and ratio locks are released before the turn.
- Click a box to select it: blue 3 px border, with the contextual actions in the action bar. A red border means a lock is active.
- Double-click a box to open the image picker for it.
- Click the gray background around the canvas or press `Escape` to clear the selection.
- The action bar offers **Delete box** (**Remove photo** while the box holds a photo: the photo goes to the shelf and the box returns to its empty, colored cell), **Select image**, a color menu for an empty box's fill (color plus opacity, for grid and free-form boxes alike), and, once the box has an image, exclusive **square** and **aspect ratio** locks (the two lock buttons are hidden while the box is still empty). An active lock turns red; Save is always visible on the right.
- Locked boxes keep their square or image ratio when the group's cross-axis size changes; boundaries touching a locked box are disabled. In a multi-box group, at most all but one box can be locked; the remaining box fills the space left. Aspect-ratio locks must share the same image ratio within a group—the first one sets the reference. A single-box group with a locked box also locks its group-boundary handles. Clicking the active lock releases it and preserves the current size. Activating the aspect-ratio lock resets the photo's zoom and pan to the plain cover crop and hides its zoom circle until the lock is released; square locks keep zoom available. A lone aspect-locked group fills the canvas from margin to margin (top to bottom in column mode).
- A selected box with a photo also has a **visibility toggle**. It starts with the open-eye icon; switching it off replaces the photo with the canvas/margin color while keeping the box, its image, and its occupied space. The crossed-eye button stays available, and the box remains selectable, so toggling it back restores the same framing. Hidden cells export as the margin color.
- Photos are cropped to cover the box, centered and clipped to its edges at 1×; zooming out below 1× shows the whole rotated photo with the margin color around it.
- Select a photo box to reveal a small circle in its bottom-right corner, marked with the expand arrows. Drag it away from the box centre to zoom in (up to 6× the unrotated cover) or inward below 1× to show the whole rotated photo, down to the fit scale; drag the photo, or the canvas background under its ghost, to pan. A second circle just outside the corner rotates the photo and carries the rotate mark; at 1× the crop scales up as needed to stay full, and zooming out below 1× reveals more of the photo. While the box is selected, the whole photo appears as a translucent ghost outside the crop; the ghost and both circles are editor-only and never appear in the export.
- A **free-form photo layer** sits above the rows/columns. The square-plus button at the canvas's top-left corner adds a gray empty square at the centre, framed in the margin paint like its photos and filled with the same translucent gray as the grid cells; load a photo and the box takes the photo's natural ratio. Drag the box to move it anywhere (over the grid and over other free-form boxes), drag the corner circle to scale it, and drag the outer circle to rotate it (both carry the same expand and rotate marks as the grid photo handles). While selected, any part hanging outside the canvas is previewed at reduced opacity; unselected and in the export it is cut at the canvas edge. A transparent PNG also gets a **Fill photo background** toggle beside its crop and border actions: it is off by default, and switching it on fills the box behind the photo with the canvas paint, so the grid no longer shows through. Free-form boxes use the same two-step delete as grid photos: the first removes only the photo into the shelf and leaves the empty square in place, the second removes the box with its one-step undo, and the deleted-photo shelf behaves the same.
- A **free-form text box** uses the `edit_note` button at the canvas's top-right corner. It starts as the same translucent gray square, without a frame, and opens the centered five-line text editor right away. The words are centered inside the box, wrapped, in the browser's default sans-serif font, white with a 1 px black outline. A text box moves, scales, and rotates exactly like a free-form photo, and any part outside the canvas is clipped in the export. **Edit text** reopens the editor; clicking outside the textarea or its buttons, or pressing `Escape`, cancels. **Font** offers **Sans serif** and **Serif** (browsers have no offline system font picker), **Text colors** sets the **Text color** and **Outline color** through their own pickers, and — while **Text background** is on — also the **Background color** and a **Background opacity** slider that paint the backdrop. **Text background** and **Text border** switch the gray backdrop and the painted frame. The first saved text removes the untouched gray backdrop; the font and both colors of the last edited text box carry over to the next new one. Deleting a text box that holds words removes only the words.
- Deleting every box in a group removes the group; the empty state keeps the
  add-group buttons available.
- Deleting an empty box puts an **Undo** button at the left of the action bar. It
  restores only the last deleted box, in its old place, with its empty-cell color
  but without a ratio lock. Adding a box or group, deleting another
  box, or switching row/column mode removes the undo.
- The last ten deleted, removed, or replaced photos are kept in the browser (deduplicated
  and downscaled, so they survive a reload). They appear as square thumbnails
  in a second bar — on the left for a portrait format on a wide screen, and
  along the bottom for landscape and square formats or any small screen. Select
  a box, then click a thumbnail to put that photo into it. The delete button at
  the end of the bar empties the shelf and removes the stored copies from the
  browser. The shelf never changes the layout on its own.
- The canvas (1080 px on its shorter side, longer side set by the chosen
  format) scales to fit the window without changing its layout.
- **Margin color** in the action bar opens a menu with **Fill** and **Gradient**: Fill recolors the canvas padding and gaps, while Gradient offers top-to-bottom, left-to-right, radial, and random-spots paints with two editable colors. The canvas starts with the **Warm Stone** preset as a top-to-bottom gradient (`#f5f2eb` → `#dfd6c7`). While a gradient is active, both the margin menu and the color panel show 20 presets in a 4 × 5 grid; each chip previews its two colors diagonally, names itself (and its description) on hover, and applies both stops in one click. The export uses whatever is on screen.
- **Border thickness** in the action bar opens a slider from 0 to 100 px that sets the canvas padding and every gap together. The default 5 px keeps the classic look (10 px between boxes and at the canvas edge); 0 removes all margins so the photos touch and the margin color disappears. The export uses the same thickness.
- **Save** opens a menu for JPEG or PNG. Both download a file at the chosen canvas size named `collage-yyyy-MM-dd-HH-mm.jpg` or `.png` using the local save time; JPEG uses 85% quality. The export matches the on-screen layout in either mode.

Keyboard: on the start screen, `Tab` moves between formats and `Enter` or
`Space` starts the editor. While editing, `Tab` moves through controls, arrow keys move box selection,
`Delete`/`Backspace` deletes the selected box (or only its photo or text, when it has
one), `Enter`/`Space` opens the image
picker (or the text editor for a text box), and `Escape` clears the selection. With the zoom circle focused, the
arrow keys zoom in and out and `Home` resets the zoom. With the rotation circle
focused, the arrow keys rotate by 1° (Shift for 15°) and `Home` resets. A
selected free-form box moves with the arrow keys (10 px, Shift 1 px); its scale
and rotation circles use the same arrow/`Home` controls.

Still to come: dragging boxes to reorder, saving and restoring the whole
collage, and general undo/redo.

## Privacy

Files you select are read in memory through `URL.createObjectURL` and are never
sent anywhere. Deleted, removed, or replaced photos are copied into your browser's
`localStorage` as small JPEGs for the recovery shelf; clearing site data removes
them. The page makes no network requests, uses no CDN, and needs no
dependencies.
