'use strict';

/**
 * Two-stop margin presets in menu order: four categories of five, so both
 * color menus can lay them out as 4 rows of 5 chips. Categories, names, and
 * descriptions live in I18n under `preset.*` so both languages stay complete;
 * this file only carries the ids and the two stop colors.
 */
const PAINT_PRESETS = Object.freeze([
  // Neutrals
  {
    id: 'warmStone',
    group: 'preset.group.neutrals',
    name: 'preset.warmStone.name',
    description: 'preset.warmStone.description',
    first: '#f5f2eb',
    second: '#dfd6c7',
  },
  {
    id: 'alabasterClay',
    group: 'preset.group.neutrals',
    name: 'preset.alabasterClay.name',
    description: 'preset.alabasterClay.description',
    first: '#faf8f5',
    second: '#e5c3b3',
  },
  {
    id: 'fogSlate',
    group: 'preset.group.neutrals',
    name: 'preset.fogSlate.name',
    description: 'preset.fogSlate.description',
    first: '#f1f5f9',
    second: '#cbd5e1',
  },
  {
    id: 'charcoalEspresso',
    group: 'preset.group.neutrals',
    name: 'preset.charcoalEspresso.name',
    description: 'preset.charcoalEspresso.description',
    first: '#1c1917',
    second: '#44403c',
  },
  {
    id: 'matchaCream',
    group: 'preset.group.neutrals',
    name: 'preset.matchaCream.name',
    description: 'preset.matchaCream.description',
    first: '#f7f8f3',
    second: '#d4dfc7',
  },

  // Seasons
  {
    id: 'springBlossom',
    group: 'preset.group.seasons',
    name: 'preset.springBlossom.name',
    description: 'preset.springBlossom.description',
    first: '#fff1f2',
    second: '#fda4af',
  },
  {
    id: 'summerSolstice',
    group: 'preset.group.seasons',
    name: 'preset.summerSolstice.name',
    description: 'preset.summerSolstice.description',
    first: '#fef9c3',
    second: '#fb923c',
  },
  {
    id: 'autumnHarvest',
    group: 'preset.group.seasons',
    name: 'preset.autumnHarvest.name',
    description: 'preset.autumnHarvest.description',
    first: '#451a03',
    second: '#ea580c',
  },
  {
    id: 'winterFrost',
    group: 'preset.group.seasons',
    name: 'preset.winterFrost.name',
    description: 'preset.winterFrost.description',
    first: '#0f172a',
    second: '#7dd3fc',
  },
  {
    id: 'evergreenPine',
    group: 'preset.group.seasons',
    name: 'preset.evergreenPine.name',
    description: 'preset.evergreenPine.description',
    first: '#052e16',
    second: '#34d399',
  },

  // Events
  {
    id: 'weddingSilk',
    group: 'preset.group.events',
    name: 'preset.weddingSilk.name',
    description: 'preset.weddingSilk.description',
    first: '#fdfbf7',
    second: '#e7d5b8',
  },
  {
    id: 'birthdayConfetti',
    group: 'preset.group.events',
    name: 'preset.birthdayConfetti.name',
    description: 'preset.birthdayConfetti.description',
    first: '#fdf4ff',
    second: '#e879f9',
  },
  {
    id: 'babyShowerMist',
    group: 'preset.group.events',
    name: 'preset.babyShowerMist.name',
    description: 'preset.babyShowerMist.description',
    first: '#f0f9ff',
    second: '#bae6fd',
  },
  {
    id: 'eveningGala',
    group: 'preset.group.events',
    name: 'preset.eveningGala.name',
    description: 'preset.eveningGala.description',
    first: '#18181b',
    second: '#eab308',
  },
  {
    id: 'festiveVelvet',
    group: 'preset.group.events',
    name: 'preset.festiveVelvet.name',
    description: 'preset.festiveVelvet.description',
    first: '#4c0519',
    second: '#f43f5e',
  },

  // Moods
  {
    id: 'calmTeal',
    group: 'preset.group.moods',
    name: 'preset.calmTeal.name',
    description: 'preset.calmTeal.description',
    first: '#0f766e',
    second: '#38bdf8',
  },
  {
    id: 'moodyRich',
    group: 'preset.group.moods',
    name: 'preset.moodyRich.name',
    description: 'preset.moodyRich.description',
    first: '#1e1b4b',
    second: '#e11d48',
  },
  {
    id: 'vibrantCobalt',
    group: 'preset.group.moods',
    name: 'preset.vibrantCobalt.name',
    description: 'preset.vibrantCobalt.description',
    first: '#1d4ed8',
    second: '#f97316',
  },
  {
    id: 'dreamyLavender',
    group: 'preset.group.moods',
    name: 'preset.dreamyLavender.name',
    description: 'preset.dreamyLavender.description',
    first: '#2e1065',
    second: '#c084fc',
  },
  {
    id: 'nostalgicPolaroid',
    group: 'preset.group.moods',
    name: 'preset.nostalgicPolaroid.name',
    description: 'preset.nostalgicPolaroid.description',
    first: '#fef3c7',
    second: '#d97706',
  },
]);
