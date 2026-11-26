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

- Starts with a two-step start screen: a **Format** row with **16:9 Banner**,
  **5:4**, **1:1 Square**, **10:15 Photo**, and **DIN A5**,
  then an **Orientation** row with **Portrait** and **Landscape**.
  The format cards show the pixel size the orientation produces, a summary line
  names the effective canvas, and **Start collage** begins the editor. 16:9 and
  Portrait are pre-selected. Every canvas keeps 1080 px on its shorter side;
  orientation turns the same ratio, so 16:9 Portrait is 1080 × 1920. Below the
  Start button, an **Import project** button opens a saved JSON file and
  continues the collage in its stored format and orientation.
- After Start, two groups appear, each holding one empty photo box. Empty boxes show a centered add-photo icon over their translucent gray fill: on a white canvas that still reads as the same solid gray as before, while a gradient margin shows faintly through. Portrait and square canvases start with rows; landscape canvases start with columns.
- The permanent **row/column button** in the action bar switches the layout. Column mode is the same model turned on its side: columns run left to right, boxes stack inside them, and every divider and lock constraint follows the columns.
- **+ above/below the canvas** adds a row; **+ on either side of a row** adds a box to it. In column mode the buttons swap: **+ left/right** adds a column and **+ above/below a column** adds a box.
- Drag the white gap between two boxes in a group to trade width (row mode) or height (column mode); a blue line and the matching resize cursor show the handle.
- Drag the white gap between two groups to trade height (row mode) or width (column mode); a blue line and resize cursor show the handle.
- Switching modes turns the structure 90°: the top row becomes the right column going to column mode, and the right column becomes the top row going back. The current box selection is cleared, photos keep their own zoom, pan, and rotation, and ratio locks are released before the turn.
- Click a box to select it: blue 3 px border, with the contextual actions in the action bar. The border stays rectangular even when the cell is rounded or circle-locked. A red border means a lock is active.
- Double-click a box to open the image picker for it.
- Click the gray background around the canvas or press `Escape` to clear the selection.
- The action bar offers **Delete box** (**Remove photo** while the box holds a photo: the photo goes to the shelf and the box returns to its empty, colored cell), **Select image**, a color menu for an empty box's fill (color plus opacity, for grid and free-form boxes alike), and a **shape menu** behind the image-ratio icon with four exclusive choices: **Square**, **Image ratio**, **Circle**, and **None**. The trigger shows the active shape's icon, and **None** is marked while the box is unlocked. The image-ratio choice is disabled while the box is still empty (colored or not); square and circle work on an empty cell too. An active shape turns the trigger red. While nothing is selected, the left side of the bar holds the two add actions and a canvas settings group (row/column layout, border thickness, margin color, and canvas corner radius); selecting any box hides that group so the contextual actions get the room, while Save stays on the right behind its own divider.
- The shape menu stays open while a choice is made. Picking the active shape again, or picking **None**, removes the lock. Locked boxes keep their square, image, or circular shape when the group's cross-axis size changes; boundaries touching a locked box are disabled. A circle lock makes the cell a true circle and disables **Corner radius** until another shape is chosen, while a stored radius returns afterward. In a multi-box group, at most all but one box can be locked; the remaining box fills the space left. Aspect-ratio locks must share the same image ratio within a group—the first one sets the reference. A single-box group with a locked box also locks its group-boundary handles. Clicking the active choice releases it and preserves the current size. Activating the aspect-ratio lock resets the photo's zoom and pan to the plain cover crop and hides its zoom circle until the lock is released; square and circle locks keep zoom available. A lone aspect-locked group fills the canvas from margin to margin (top to bottom in column mode).
- A selected box with a photo also has a **visibility toggle**. It starts with the open-eye icon; switching it off replaces the photo with the canvas/margin color while keeping the box, its image, and its occupied space. The crossed-eye button stays available and turns red while the box is hidden, and the box remains selectable, so toggling it back restores the same framing. Hidden cells export as the margin color.
- A selected photo, grid or free-form, also offers **Colorize photo**: pick a color and the photo becomes a duotone with that color in its darkest pixels and white in its brightest — a black-and-white QR code reads white and red — while transparency, zoom, crop, and rotation stay intact. **No color** restores the original photo, and the export uses the same tint.
- Photos are cropped to cover the box, centered and clipped to its edges at 1×; zooming out below 1× shows the whole rotated photo with the margin color around it.
- Select a photo box to reveal a small circle in its bottom-right corner, marked with the expand arrows. Drag it away from the box centre to zoom in (up to 6× the unrotated cover) or inward below 1× to show the whole rotated photo, down to the fit scale; drag the photo, or the canvas background under its ghost, to pan. A second circle just outside the corner rotates the photo and carries the rotate mark; at 1× the crop scales up as needed to stay full, and zooming out below 1× reveals more of the photo. While the box is selected, the whole photo appears as a translucent ghost outside the crop; the ghost and both circles are editor-only and never appear in the export.
- A **free-form photo layer** sits above the rows/columns. The square-plus button at the canvas's top-left corner adds a gray empty square at the centre, framed in the margin paint like its photos and filled with the same translucent gray as the grid cells; load a photo and the box takes the photo's natural ratio. The add-photo button also sits at the left of the action bar while nothing is selected. Drag the box to move it anywhere (over the grid and over other free-form boxes), drag the corner circle to scale it, and drag the outer circle to rotate it (both carry the same expand and rotate marks as the grid photo handles). While selected, any part hanging outside the canvas is previewed at reduced opacity; unselected and in the export it is cut at the canvas edge. A selected free-form photo uses the shared **shape menu** with **Square**, **Image Ratio** (the default), and **Circle**; Image Ratio keeps the button and selection border blue, while Square and Circle turn them red, and a circle clips the photo to a true circle. The photo border wraps around the box’s rounded corners or circle instead of staying square. A transparent PNG also gets a **Fill photo background** toggle beside its border action: it is off by default, and switching it on fills the box behind the photo with the canvas paint, so the grid no longer shows through. Free-form boxes use the same two-step delete as grid photos: the first removes only the photo into the shelf and leaves the empty square in place, the second removes the box with its one-step undo, and the deleted-photo shelf behaves the same.
- A **free-form text box** uses the `edit_note` button at the canvas's top-right corner, and the same button sits at the left of the action bar while nothing is selected. It starts as the same translucent gray square, without a frame, and opens the centered five-line text editor right away. Saving fits the box snugly around the words at their current type size while keeping the box centered, so it reads as a caption tile rather than a large empty square; scaling the box scales the text with it. The words start centered and bold inside the box and keep their typed line breaks, in Montserrat, white with a black outline that scales with the type size. A text box moves, scales, and rotates exactly like a free-form photo, and any part outside the canvas is clipped in the export. **Edit text** reopens the editor; clicking outside the textarea or its buttons, or pressing `Escape`, cancels. **Font** lists exactly 12 bundled families — Bebas Neue, Caveat, Cinzel, Clash Display, Fraunces, Great Vibes, Montserrat, Pacifico, Permanent Marker, Playfair Display, Reenie Beanie, and Space Mono — each shown as its own supplied SVG preview. Opening the menu loads only those previews; a family's WOFF2 is fetched the first time it is selected for a text box (the default Montserrat loads when the first caption is saved), and the words refit around the loaded face. Every family has a generic fallback, so text stays readable if a font fails. **Text style** opens with a row of three icon-only alignment buttons — left, center, and right, with center as every box's default — and a second row for **Bold** (on by default), **Italic**, and **Underline**, then sets the **Text color** and **Outline color** through their own pickers, with an **Outline thickness** slider below the outline color that runs from 0 to 50 px (8 px by default, 0 for no outline) and scales with the text box. While **Text background** is on, the same menu also shows the **Background color** and a **Background opacity** slider that paint the backdrop. **Text background** and **Text border** switch the gray backdrop and the painted frame. The first saved text removes the untouched gray backdrop; the font and both colors of the last edited text box carry over to the next new one. Deleting a text box that holds words removes only the words.
- Deleting every box in a group removes the group; the empty state keeps the
  add-group buttons available.
- Deleting an empty box puts an **Undo** button at the left of the action bar. It
  restores only the last deleted box, in its old place, with its empty-cell color
  but without a ratio lock. Adding a box or group, deleting another
  box, or switching row/column mode removes the undo.
- The last ten deleted, removed, or replaced photos are kept in the browser (deduplicated
  and downscaled, so they survive a reload). They appear as square thumbnails
  in a second bar — on the left for a portrait canvas on a wide screen, and
  along the bottom for landscape and square canvases or any small screen. Select
  a box, then click a thumbnail to put that photo into it. The delete button at
  the end of the bar empties the shelf and removes the stored copies from the
  browser. The shelf never changes the layout on its own.
- The canvas (1080 px on its shorter side, longer side set by the chosen
  format and orientation) scales to fit the window without changing its layout.
- **Margin color** in the action bar opens a menu with **Fill** and **Gradient**: Fill recolors the canvas padding and gaps, while Gradient offers top-to-bottom, left-to-right, radial, and random-spots paints with two editable colors. The canvas starts with the **Warm Stone** preset as a top-to-bottom gradient (`#f5f2eb` → `#dfd6c7`). While a gradient is active, both the margin menu and the color panel show 20 presets in a 4 × 5 grid; each chip previews its two colors diagonally, names itself (and its description) on hover, and applies both stops in one click. The export uses whatever is on screen.
- **Border thickness** in the action bar opens a slider from 0 to 100 px that sets the canvas padding and every gap together. The default 5 px keeps the classic look (10 px between boxes and at the canvas edge); 0 removes all margins so the photos touch and the margin color disappears. The export uses the same thickness.
- **Corner radius** rounds a selected photo or text box. The rounded-corner button opens a 0–200 px slider with a **Remove** row below it, starts at 60 px on the first click, and returns the box to square corners when the slider reaches 0 or **Remove** is pressed. It is disabled on a plain empty cell, on a text box with its background off, and while a circle lock owns the box's shape; recolored empty cells and framed text with a backdrop can be rounded too. The canvas settings group also has a **canvas corner radius** action: one click rounds every existing box at 60 px, the slider applies one value to all boxes, **Remove** clears them, the button turns red while active, and every box added afterwards starts with that canvas value. Individual boxes can still be changed in their own menu. The export uses the same rounded clip, and a JSON project keeps both the per-box values and the canvas default.
- **Save** opens a menu for JPEG or PNG. Both download a file at the chosen canvas size named `collage-yyyy-MM-dd-HH-mm.jpg` or `.png` using the local save time; JPEG uses 85% quality. The export matches the on-screen layout in either mode.
- Below a divider in the same menu, **JSON Export** downloads the whole work in progress as `collage-yyyy-MM-dd-HH-mm.json`, with every photo embedded at its original resolution plus the layout, margin paint, styles, text, positions, and framing. **JSON Import** restores that file exactly; an unreadable file leaves the current collage untouched. Project files get large when they contain large photos, so keep them as working files rather than sharing them.

Keyboard: on the start screen, `Tab` moves between the format cards, the
orientation cards, Start, and Import; `Enter` or `Space` picks a card or presses
the focused button. While editing, `Tab` moves through controls, arrow keys move box selection,
`Delete`/`Backspace` deletes the selected box (or only its photo or text, when it has
one), `Enter`/`Space` opens the image
picker (or the text editor for a text box), and `Escape` clears the selection. With the zoom circle focused, the
arrow keys zoom in and out and `Home` resets the zoom. With the rotation circle
focused, the arrow keys rotate by 1° (Shift for 15°) and `Home` resets. A
selected free-form box moves with the arrow keys (10 px, Shift 1 px); its scale
and rotation circles use the same arrow/`Home` controls.

Still to come: dragging boxes to reorder, automatic persistence of the
collage in the browser, and general undo/redo. A JSON project file already
carries the complete collage, photos included, between sessions.

## Privacy

Files you select are read in memory through `URL.createObjectURL` and are never
sent anywhere. Deleted, removed, or replaced photos are copied into your browser's
`localStorage` as small JPEGs for the recovery shelf; clearing site data removes
them. The page makes no network requests, uses no CDN, and needs no
dependencies.
