'use strict';

const ICONS = Object.freeze({
  add: 'assets/add_circle_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  delete: 'assets/delete_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  download: 'assets/download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  image: 'assets/image_search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  lockAspect: 'assets/image_aspect_ratio_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
  lockSquare: 'assets/crop_square_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg',
});

const Render = (() => {
  const refs = {};
  let toastTimer = 0;
  let announceToken = 0;

  const iconElement = (name) => {
    const image = new Image(24, 24);
    image.src = ICONS[name];
    image.alt = '';
    image.className = 'icon';
    image.draggable = false;
    return image;
  };

  const toolButton = (action, label, iconName) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button';
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(iconElement(iconName));
    return button;
  };

  const buildBox = (layoutBox, number, selectedId) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'box';
    button.dataset.boxId = layoutBox.id;
    button.style.left = `${layoutBox.x}px`;
    button.style.top = `${layoutBox.y}px`;
    button.style.width = `${layoutBox.w}px`;
    button.style.height = `${layoutBox.h}px`;

    const hasImage = Boolean(layoutBox.image);
    const locked = Boolean(layoutBox.locked);
    button.classList.toggle('has-image', hasImage);
    button.classList.toggle('has-lock', locked);
    button.classList.toggle('is-selected', layoutBox.id === selectedId);
    button.setAttribute('aria-pressed', String(layoutBox.id === selectedId));
    const label = hasImage ? `Photo box ${number}` : `Empty photo box ${number}`;
    button.setAttribute('aria-label', label);
    button.title = label;

    if (hasImage) {
      const image = document.createElement('img');
      image.className = 'box-image';
      image.src = layoutBox.image.url;
      image.alt = `Photo ${number}`;
      image.draggable = false;
      button.append(image);
    }

    return button;
  };

  const paintActions = (state) => {
    refs.selectionActions.replaceChildren();
    if (!state.selectedBoxId) return;

    const found = state.findBox(state.selectedBoxId);
    const box = found ? found.box : null;
    const hasImage = Boolean(box && box.image);
    const lock = box ? box.lock : null;

    const square = toolButton('lock-square', 'Lock square box', 'lockSquare');
    square.disabled = !hasImage;
    square.setAttribute('aria-pressed', String(lock === 'square'));
    square.classList.toggle('is-active', lock === 'square');

    const aspect = toolButton(
      'lock-aspect',
      'Lock image aspect ratio',
      'lockAspect',
    );
    aspect.disabled = !hasImage;
    aspect.setAttribute('aria-pressed', String(lock === 'aspect'));
    aspect.classList.toggle('is-active', lock === 'aspect');

    refs.selectionActions.append(
      toolButton('delete-box', 'Delete box', 'delete'),
      toolButton('select-image', 'Select image', 'image'),
      square,
      aspect,
    );
  };

  const paintRail = (layout, rail, side) => {
    const fragment = document.createDocumentFragment();
    layout.rows.forEach((layoutRow, index) => {
      const button = toolButton(
        'add-box',
        `Add image box to row ${index + 1} on the ${side}`,
        'add',
      );
      button.classList.add('rail-button');
      button.dataset.rowId = layoutRow.id;
      button.style.setProperty('--row-center', `${layoutRow.y + layoutRow.h / 2}px`);
      fragment.append(button);
    });
    rail.replaceChildren(fragment);
  };

  const updateRailGeometry = (layout) => {
    for (const rail of [refs.railLeft, refs.railRight]) {
      const buttons = rail.querySelectorAll('.rail-button');
      layout.rows.forEach((layoutRow, index) => {
        if (buttons[index]) {
          buttons[index].style.setProperty(
            '--row-center',
            `${layoutRow.y + layoutRow.h / 2}px`,
          );
        }
      });
    }
  };

  const showRowBoundary = (y) => {
    refs.rowBoundary.hidden = false;
    refs.rowBoundary.style.top = `${y - 1}px`;
  };

  const hideRowBoundary = () => {
    refs.rowBoundary.hidden = true;
  };

  const setRowResizeCursor = (active) => {
    refs.canvas.classList.toggle('is-row-resizable', active);
  };

  const showBoxBoundary = (x, y, height) => {
    refs.boxBoundary.hidden = false;
    refs.boxBoundary.style.left = `${x - 1}px`;
    refs.boxBoundary.style.top = `${y}px`;
    refs.boxBoundary.style.height = `${height}px`;
  };

  const hideBoxBoundary = () => {
    refs.boxBoundary.hidden = true;
  };

  const setBoxResizeCursor = (active) => {
    refs.canvas.classList.toggle('is-box-resizable', active);
  };

  /** Cheapest possible update while dragging a row boundary. */
  const updateGeometry = (layout) => {
    const rowElements = refs.rows.querySelectorAll('.row');
    layout.rows.forEach((layoutRow, rowIndex) => {
      const row = rowElements[rowIndex];
      if (!row) return;
      row.style.top = `${layoutRow.y}px`;
      row.style.height = `${layoutRow.h}px`;

      const boxElements = row.querySelectorAll('.box');
      layoutRow.boxes.forEach((layoutBox, boxIndex) => {
        const box = boxElements[boxIndex];
        if (!box) return;
        box.style.left = `${layoutBox.x}px`;
        box.style.top = `${layoutBox.y}px`;
        box.style.width = `${layoutBox.w}px`;
        box.style.height = `${layoutBox.h}px`;
      });
    });
    updateRailGeometry(layout);
  };

  const init = () => {
    refs.selectionActions = document.getElementById('selection-actions');
    refs.canvas = document.getElementById('canvas');
    refs.rows = document.getElementById('rows');
    refs.railLeft = document.getElementById('row-rail-left');
    refs.railRight = document.getElementById('row-rail-right');
    refs.empty = document.getElementById('canvas-empty');
    refs.rowBoundary = document.getElementById('row-boundary');
    refs.boxBoundary = document.getElementById('box-boundary');
    refs.toast = document.getElementById('toast');
    refs.live = document.getElementById('live-region');

    // Static controls only carry a data-icon name; the long asset paths live
    // in ICONS alone.
    document.querySelectorAll('[data-icon]').forEach((button) => {
      const name = button.dataset.icon;
      if (ICONS[name]) button.append(iconElement(name));
      button.title = button.getAttribute('aria-label') || '';
    });
  };

  const paint = (state, layout) => {
    refs.empty.hidden = state.rows.length > 0;
    hideRowBoundary();
    hideBoxBoundary();
    setRowResizeCursor(false);
    setBoxResizeCursor(false);

    const fragment = document.createDocumentFragment();
    const selectedId = state.selectedBoxId;
    let number = 0;

    layout.rows.forEach((layoutRow) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.rowId = layoutRow.id;
      row.style.top = `${layoutRow.y}px`;
      row.style.height = `${layoutRow.h}px`;

      layoutRow.boxes.forEach((layoutBox) => {
        number += 1;
        row.append(buildBox(layoutBox, number, selectedId));
      });

      fragment.append(row);
    });

    refs.rows.replaceChildren(fragment);
    paintRail(layout, refs.railLeft, 'left');
    paintRail(layout, refs.railRight, 'right');
    paintActions(state);
  };

  const paintSelection = (state) => {
    refs.rows.querySelectorAll('.box').forEach((box) => {
      const selected = box.dataset.boxId === state.selectedBoxId;
      box.classList.toggle('is-selected', selected);
      box.setAttribute('aria-pressed', String(selected));
    });
    paintActions(state);
  };

  const announce = (message) => {
    // Clear first so repeating the same message is announced again, and keep
    // only the newest message if several arrive before the next frame.
    announceToken += 1;
    const token = announceToken;
    refs.live.textContent = '';
    requestAnimationFrame(() => {
      if (token === announceToken) refs.live.textContent = message;
    });
  };

  const toast = (message, isError = false) => {
    refs.toast.textContent = message;
    refs.toast.classList.toggle('is-error', isError);
    refs.toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      refs.toast.hidden = true;
    }, 5000);
    announce(message);
  };

  const focusBox = (boxId) => {
    const box = refs.rows.querySelector(`[data-box-id="${boxId}"]`);
    if (box) box.focus({ preventScroll: true });
  };

  const focusCanvas = () => {
    refs.canvas.focus({ preventScroll: true });
  };

  return {
    init,
    paint,
    paintSelection,
    updateGeometry,
    showRowBoundary,
    hideRowBoundary,
    setRowResizeCursor,
    showBoxBoundary,
    hideBoxBoundary,
    setBoxResizeCursor,
    announce,
    toast,
    focusBox,
    focusCanvas,
  };
})();
