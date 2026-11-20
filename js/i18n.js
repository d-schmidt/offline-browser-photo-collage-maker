'use strict';

/**
 * UI strings in every supported language. The browser language picks the
 * locale: a `de` locale gets German, everything else falls back to English.
 * Both catalogs stay complete so no sentence mixes languages.
 */
const I18n = (() => {
  const CATALOGS = Object.freeze({
    en: Object.freeze({
      'app.title': 'Photo Collage Editor',

      'actions.label': 'Actions',
      'orientation.toggle': 'Toggle row or column layout',
      'orientation.toRow': 'Switch to row layout',
      'orientation.toColumn': 'Switch to column layout',

      'border.change': 'Change border thickness',
      'border.title': 'Border thickness',
      'border.value': '{n} px',
      'border.pixels': '{n} pixels',

      'margin.change': 'Change margin color or gradient',
      'margin.label': 'Margin color',
      'margin.menu': 'Margin paint',
      'margin.fill': 'Fill',
      'margin.gradient': 'Gradient',
      'margin.shuffle': 'Shuffle spots',
      'margin.gradientTitle': 'Gradient colors',
      'margin.gradientFirst': 'First color',
      'margin.gradientSecond': 'Second color',
      'margin.gradientStyle': 'Gradient style',
      'gradient.style.vertical': 'Top to bottom',
      'gradient.style.horizontal': 'Left to right',
      'gradient.style.radial': 'Radial',
      'gradient.style.spots': 'Random spots',

      'save.button': 'Save collage as JPEG or PNG',
      'save.menu': 'Save format',
      'save.jpeg': 'JPEG (.jpg)',
      'save.png': 'PNG (.png)',
      'save.saved': 'Saved {filename}.',
      'save.failed': 'The collage could not be saved.',

      'undo.button': 'Undo last delete',
      'history.label': 'Deleted photos',
      'history.photo': 'Deleted photo {n}',
      'history.selectBox':
        'Select a photo box first, then click a saved photo.',

      'format.title': 'Select format:',
      'format.aria': '{label}, {w} × {h} pixels',
      'format.selected':
        '{label} format selected, {w} by {h} pixels.',
      'format.selectedNamed':
        '{label} {name} format selected, {w} by {h} pixels.',
      'format.name.status': 'Status',
      'format.name.banner': 'Banner',
      'format.name.portrait': 'Portrait',
      'format.name.square': 'Square',

      'add.group.top': 'Add row above the canvas',
      'add.group.bottom': 'Add row below the canvas',
      'add.group.left': 'Add column to the left of the canvas',
      'add.group.right': 'Add column to the right of the canvas',
      'add.box.rowLeft': 'Add image box to row {n} on the left',
      'add.box.rowRight': 'Add image box to row {n} on the right',
      'add.box.columnTop': 'Add image box to column {n} at the top',
      'add.box.columnBottom': 'Add image box to column {n} at the bottom',

      'rail.left': 'Row actions, left side',
      'rail.right': 'Row actions, right side',
      'rail.top': 'Column actions, above the canvas',
      'rail.bottom': 'Column actions, below the canvas',

      'canvas.label': 'Photo collage canvas',
      'empty.rows':
        'No rows yet. Use the + button above or below the canvas to add one.',
      'empty.columns':
        'No columns yet. Use the + button to the left or right of the canvas to add one.',

      'group.row': 'row',
      'group.column': 'column',

      'box.label': 'Photo box {n}',
      'box.labelEmpty': 'Empty photo box {n}',
      'box.labelHidden': 'Hidden box {n}',
      'box.alt': 'Photo {n}',

      'free.add': 'Add free-form photo box',
      'free.layer': 'Free-form photos',
      'free.label': 'Free-form photo box {n}',
      'free.labelEmpty': 'Empty free-form photo box {n}',
      'free.scale': 'Free-form box scale',
      'free.scaleTitle': 'Drag to scale the free-form box',
      'free.rotate': 'Free-form box rotation',
      'free.rotateTitle': 'Drag to rotate the free-form box',
      'free.size': '{n} pixels',

      'action.delete': 'Delete box',
      'action.selectImage': 'Select image',
      'action.lockSquare': 'Lock square box',
      'action.lockAspect': 'Lock image aspect ratio',
      'action.visibility': 'Box visibility',
      'action.hideImage': 'Hide photo',
      'action.showImage': 'Show photo',
      'action.hideBox': 'Hide box',
      'action.showBox': 'Show box',
      'action.cropSquare': 'Crop to square',
      'action.matchPhoto': 'Match the photo ratio',
      'action.border': 'Photo border',
      'action.background': 'Fill photo background',
      'hint.unlocked': 'At least one box in a {group} must stay unlocked',
      'hint.ratio':
        'Aspect locks in a {group} must use the same image ratio',

      'zoom.label': 'Photo zoom',
      'zoom.title': 'Drag outwards to zoom the photo',
      'rotate.label': 'Photo rotation',
      'rotate.title': 'Drag around the photo to rotate it',
      'rotate.value': '{n} degrees',

      'announce.selected': 'Photo box {n} selected.',
      'announce.selectedFree': 'Free-form photo box {n} selected.',
      'announce.deselected': 'Selection cleared.',
      'announce.deleted': 'Photo box {n} deleted.',
      'announce.undone': 'Photo box {n} restored.',
      'announce.historyAdded': 'Deleted photo added to photo box {n}.',
      'announce.lockReleased': 'Box lock released.',
      'announce.needUnlocked':
        'At least one box in a {group} must stay unlocked.',
      'announce.needRatio':
        'Aspect locks in a {group} must use the same image ratio.',
      'announce.squareOn': 'Square lock on.',
      'announce.aspectOn': 'Aspect ratio lock on.',
      'announce.hidden': 'Box {n} hidden.',
      'announce.shown': 'Box {n} shown.',
      'announce.opening': 'Opening image…',
      'announce.imageAdded': 'Image added to photo box {n}.',
      'announce.saving': 'Saving collage as {format}…',
      'announce.boxAdded': 'Image box added to {group} {n}.',
      'announce.columnAddedLeft': 'Column added at the left.',
      'announce.columnAddedRight': 'Column added at the right.',
      'announce.rowAddedTop': 'Row added at the top.',
      'announce.rowAddedBottom': 'Row added at the bottom.',
      'announce.borderThickness': 'Border thickness {n} pixels.',
      'announce.marginColor': 'Margin color set to {color}.',
      'announce.gradient': 'Margin gradient from {top} to {bottom}.',
      'announce.gradientStyle': 'Gradient style: {style}.',
      'announce.shuffleSpots': 'Spots shuffled.',
      'announce.zoom': 'Photo zoom {n} percent.',
      'announce.zoomReset': 'Photo zoom reset.',
      'announce.rotation': 'Photo rotation {n} degrees.',
      'announce.rotationReset': 'Photo rotation reset.',
      'announce.freeAdded': 'Free-form photo box added and selected.',
      'announce.freeDeleted': 'Free-form photo box {n} deleted.',
      'announce.freeUndone': 'Free-form photo box {n} restored.',
      'announce.freeImageAdded': 'Image added to free-form photo box {n}.',
      'announce.freeScale': 'Free-form box width {n} pixels.',
      'announce.freeRotation': 'Free-form box rotation {n} degrees.',
      'announce.freeRotationReset': 'Free-form box rotation reset.',
      'announce.freeSquareOn': 'Free-form photo box {n} cropped to a square.',
      'announce.freeSquareOff': 'Free-form photo box {n} matches its photo ratio.',
      'announce.freeBorderOn': 'Border shown on free-form photo box {n}.',
      'announce.freeBorderOff': 'Border hidden on free-form photo box {n}.',
      'announce.freeBackgroundOn':
        'Background fill shown on free-form photo box {n}.',
      'announce.freeBackgroundOff':
        'Background fill hidden on free-form photo box {n}.',
      'layout.rowOne': 'Row layout. 1 row.',
      'layout.rows': 'Row layout. {count} rows.',
      'layout.columnOne': 'Column layout. 1 column.',
      'layout.columns': 'Column layout. {count} columns.',

      'error.boxGone': 'That box no longer exists.',
      'image.notImage':
        'That file is not an image. Choose a photo or another image file.',
      'image.openFailed':
        'That image could not be opened. Try a different file.',
      'image.decodeFailed': 'An image could not be decoded.',
      'export.encodeFailed': 'The collage could not be encoded.',
      'export.unsupported': 'This browser cannot export {format}.',
    }),
    de: Object.freeze({
      'app.title': 'Foto-Collagen-Editor',

      'actions.label': 'Aktionen',
      'orientation.toggle': 'Zeilen- oder Spaltenlayout umschalten',
      'orientation.toRow': 'Zum Zeilenlayout wechseln',
      'orientation.toColumn': 'Zum Spaltenlayout wechseln',

      'border.change': 'Rahmenstärke ändern',
      'border.title': 'Rahmenstärke',
      'border.value': '{n} px',
      'border.pixels': '{n} Pixel',

      'margin.change': 'Randfarbe oder Verlauf ändern',
      'margin.label': 'Randfarbe',
      'margin.menu': 'Randfüllung',
      'margin.fill': 'Füllung',
      'margin.gradient': 'Verlauf',
      'margin.shuffle': 'Punkte mischen',
      'margin.gradientTitle': 'Verlaufsfarben',
      'margin.gradientFirst': 'Erste Farbe',
      'margin.gradientSecond': 'Zweite Farbe',
      'margin.gradientStyle': 'Verlaufsstil',
      'gradient.style.vertical': 'Oben nach unten',
      'gradient.style.horizontal': 'Links nach rechts',
      'gradient.style.radial': 'Radial',
      'gradient.style.spots': 'Zufällige Punkte',

      'save.button': 'Collage als JPEG oder PNG speichern',
      'save.menu': 'Speicherformat',
      'save.jpeg': 'JPEG (.jpg)',
      'save.png': 'PNG (.png)',
      'save.saved': '{filename} gespeichert.',
      'save.failed': 'Die Collage konnte nicht gespeichert werden.',

      'undo.button': 'Letztes Löschen rückgängig machen',
      'history.label': 'Gelöschte Fotos',
      'history.photo': 'Gelöschtes Foto {n}',
      'history.selectBox':
        'Wähle zuerst ein Bildfeld aus und klicke dann auf ein gespeichertes Foto.',

      'format.title': 'Format auswählen:',
      'format.aria': '{label}, {w} × {h} Pixel',
      'format.selected': '{label} ausgewählt, {w} × {h} Pixel.',
      'format.selectedNamed': '{label} {name} ausgewählt, {w} × {h} Pixel.',
      'format.name.status': 'Status',
      'format.name.banner': 'Banner',
      'format.name.portrait': 'Hochformat',
      'format.name.square': 'Quadrat',

      'add.group.top': 'Zeile über der Arbeitsfläche hinzufügen',
      'add.group.bottom': 'Zeile unter der Arbeitsfläche hinzufügen',
      'add.group.left': 'Spalte links neben der Arbeitsfläche hinzufügen',
      'add.group.right': 'Spalte rechts neben der Arbeitsfläche hinzufügen',
      'add.box.rowLeft': 'Bildfeld zu Zeile {n} links hinzufügen',
      'add.box.rowRight': 'Bildfeld zu Zeile {n} rechts hinzufügen',
      'add.box.columnTop': 'Bildfeld zu Spalte {n} oben hinzufügen',
      'add.box.columnBottom': 'Bildfeld zu Spalte {n} unten hinzufügen',

      'rail.left': 'Zeilenaktionen, links',
      'rail.right': 'Zeilenaktionen, rechts',
      'rail.top': 'Spaltenaktionen, über der Arbeitsfläche',
      'rail.bottom': 'Spaltenaktionen, unter der Arbeitsfläche',

      'canvas.label': 'Foto-Collagen-Arbeitsfläche',
      'empty.rows':
        'Noch keine Zeilen. Mit der +-Schaltfläche über oder unter der Arbeitsfläche eine hinzufügen.',
      'empty.columns':
        'Noch keine Spalten. Mit der +-Schaltfläche links oder rechts neben der Arbeitsfläche eine hinzufügen.',

      'group.row': 'Zeile',
      'group.column': 'Spalte',

      'box.label': 'Bildfeld {n}',
      'box.labelEmpty': 'Leeres Bildfeld {n}',
      'box.labelHidden': 'Ausgeblendetes Bildfeld {n}',
      'box.alt': 'Foto {n}',

      'free.add': 'Freies Bildfeld hinzufügen',
      'free.layer': 'Freie Fotos',
      'free.label': 'Freies Bildfeld {n}',
      'free.labelEmpty': 'Leeres freies Bildfeld {n}',
      'free.scale': 'Größe des freien Bildfelds',
      'free.scaleTitle': 'Ziehen, um das freie Bildfeld zu skalieren',
      'free.rotate': 'Drehung des freien Bildfelds',
      'free.rotateTitle': 'Ziehen, um das freie Bildfeld zu drehen',
      'free.size': '{n} Pixel',

      'action.delete': 'Bildfeld löschen',
      'action.selectImage': 'Bild auswählen',
      'action.lockSquare': 'Quadrat sperren',
      'action.lockAspect': 'Seitenverhältnis sperren',
      'action.visibility': 'Sichtbarkeit des Bildfelds',
      'action.hideImage': 'Foto ausblenden',
      'action.showImage': 'Foto einblenden',
      'action.hideBox': 'Bildfeld ausblenden',
      'action.showBox': 'Bildfeld einblenden',
      'action.cropSquare': 'Quadratisch zuschneiden',
      'action.matchPhoto': 'Fotoformat übernehmen',
      'action.border': 'Fotorahmen',
      'action.background': 'Hintergrund des Fotos füllen',
      'hint.unlocked': 'Mindestens ein Bildfeld pro {group} muss entsperrt bleiben',
      'hint.ratio':
        'Seitenverhältnis-Sperren in einer {group} müssen dasselbe Verhältnis verwenden',

      'zoom.label': 'Foto-Zoom',
      'zoom.title': 'Nach außen ziehen, um das Foto zu zoomen',
      'rotate.label': 'Foto-Drehung',
      'rotate.title': 'Um das Foto herum ziehen, um es zu drehen',
      'rotate.value': '{n} Grad',

      'announce.selected': 'Bildfeld {n} ausgewählt.',
      'announce.selectedFree': 'Freies Bildfeld {n} ausgewählt.',
      'announce.deselected': 'Auswahl aufgehoben.',
      'announce.deleted': 'Bildfeld {n} gelöscht.',
      'announce.undone': 'Bildfeld {n} wiederhergestellt.',
      'announce.historyAdded': 'Gelöschtes Foto zu Bildfeld {n} hinzugefügt.',
      'announce.lockReleased': 'Sperre aufgehoben.',
      'announce.needUnlocked':
        'Mindestens ein Bildfeld pro {group} muss entsperrt bleiben.',
      'announce.needRatio':
        'Seitenverhältnis-Sperren in einer {group} müssen dasselbe Verhältnis verwenden.',
      'announce.squareOn': 'Quadratsperre aktiv.',
      'announce.aspectOn': 'Seitenverhältnis-Sperre aktiv.',
      'announce.hidden': 'Bildfeld {n} ausgeblendet.',
      'announce.shown': 'Bildfeld {n} eingeblendet.',
      'announce.opening': 'Bild wird geöffnet…',
      'announce.imageAdded': 'Bild zu Bildfeld {n} hinzugefügt.',
      'announce.saving': 'Collage wird als {format} gespeichert…',
      'announce.boxAdded': 'Bildfeld zu {group} {n} hinzugefügt.',
      'announce.columnAddedLeft': 'Spalte links hinzugefügt.',
      'announce.columnAddedRight': 'Spalte rechts hinzugefügt.',
      'announce.rowAddedTop': 'Zeile oben hinzugefügt.',
      'announce.rowAddedBottom': 'Zeile unten hinzugefügt.',
      'announce.borderThickness': 'Rahmenstärke {n} Pixel.',
      'announce.marginColor': 'Randfarbe auf {color} gesetzt.',
      'announce.gradient': 'Randverlauf von {top} nach {bottom}.',
      'announce.gradientStyle': 'Verlaufsstil: {style}.',
      'announce.shuffleSpots': 'Punkte neu gemischt.',
      'announce.zoom': 'Foto-Zoom {n} Prozent.',
      'announce.zoomReset': 'Foto-Zoom zurückgesetzt.',
      'announce.rotation': 'Foto-Drehung {n} Grad.',
      'announce.rotationReset': 'Foto-Drehung zurückgesetzt.',
      'announce.freeAdded': 'Freies Bildfeld hinzugefügt und ausgewählt.',
      'announce.freeDeleted': 'Freies Bildfeld {n} gelöscht.',
      'announce.freeUndone': 'Freies Bildfeld {n} wiederhergestellt.',
      'announce.freeImageAdded': 'Bild zu freiem Bildfeld {n} hinzugefügt.',
      'announce.freeScale': 'Breite des freien Bildfelds {n} Pixel.',
      'announce.freeRotation': 'Drehung des freien Bildfelds {n} Grad.',
      'announce.freeRotationReset': 'Drehung des freien Bildfelds zurückgesetzt.',
      'announce.freeSquareOn': 'Freies Bildfeld {n} quadratisch zugeschnitten.',
      'announce.freeSquareOff': 'Freies Bildfeld {n} übernimmt das Fotoformat.',
      'announce.freeBorderOn': 'Rahmen für freies Bildfeld {n} eingeblendet.',
      'announce.freeBorderOff': 'Rahmen für freies Bildfeld {n} ausgeblendet.',
      'announce.freeBackgroundOn':
        'Hintergrund für freies Bildfeld {n} eingeblendet.',
      'announce.freeBackgroundOff':
        'Hintergrund für freies Bildfeld {n} ausgeblendet.',
      'layout.rowOne': 'Zeilenlayout. 1 Zeile.',
      'layout.rows': 'Zeilenlayout. {count} Zeilen.',
      'layout.columnOne': 'Spaltenlayout. 1 Spalte.',
      'layout.columns': 'Spaltenlayout. {count} Spalten.',

      'error.boxGone': 'Dieses Bildfeld existiert nicht mehr.',
      'image.notImage':
        'Diese Datei ist kein Bild. Wähle ein Foto oder eine andere Bilddatei.',
      'image.openFailed':
        'Dieses Bild konnte nicht geöffnet werden. Versuche es mit einer anderen Datei.',
      'image.decodeFailed': 'Ein Bild konnte nicht dekodiert werden.',
      'export.encodeFailed': 'Die Collage konnte nicht kodiert werden.',
      'export.unsupported': 'Dieser Browser kann {format} nicht exportieren.',
    }),
  });

  const primaryLanguage =
    (navigator.languages && navigator.languages[0]) || navigator.language || '';

  const lang = String(primaryLanguage).toLowerCase().startsWith('de')
    ? 'de'
    : 'en';

  /**
   * Look up a string and fill `{name}` placeholders. Keys missing from the
   * active catalog fall back to English rather than showing the raw key.
   */
  const t = (key, params = {}) => {
    const catalog = CATALOGS[lang];
    const message =
      catalog[key] !== undefined ? catalog[key] : CATALOGS.en[key];
    if (message === undefined) return key;
    return message.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name)
        ? String(params[name])
        : match,
    );
  };

  /**
   * Translate the declarative hooks in the markup: text content, aria labels,
   * and title tooltips. Dynamic labels are re-rendered from the same catalog.
   */
  const apply = (root = document) => {
    document.documentElement.lang = lang;

    root.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute(
        'aria-label',
        t(element.dataset.i18nAriaLabel),
      );
    });
    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.title = t(element.dataset.i18nTitle);
    });
  };

  return { lang, t, apply };
})();
