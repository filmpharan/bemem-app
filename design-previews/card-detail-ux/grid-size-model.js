/* Preview-only projection of the existing Create metrics, not a wallet validator.
 * Input dimensions come from validated card records, never from a preset name.
 */
(function (root) {
  'use strict';
  function dimensions(card) {
    if (card.kind === 'membership') {
      const fields = ['sizePresetId', 'widthBlocks', 'heightBlocks'];
      const present = fields.filter(key => Object.hasOwn(card, key));
      if (present.length && present.length !== fields.length) throw Error('Incomplete card size');
      if (present.length) {
        if (!Number.isSafeInteger(card.widthBlocks) || !Number.isSafeInteger(card.heightBlocks)
          || card.widthBlocks < 1 || card.heightBlocks < 1 || card.widthBlocks > 12) throw Error('Invalid card dimensions');
        return { widthBlocks: card.widthBlocks, heightBlocks: card.heightBlocks, source: 'dimensions' };
      }
    }
    if (!['portrait', 'landscape'].includes(card.orientation)) throw Error('Invalid legacy orientation');
    return card.orientation === 'portrait' ? { widthBlocks: 4, heightBlocks: 6, source: 'legacy' }
      : { widthBlocks: 6, heightBlocks: 4, source: 'legacy' };
  }
  function metrics(deviceWidth, slotWidth, samples) {
    if (!(deviceWidth > 32) || !(slotWidth > 0)) throw Error('Invalid preview geometry');
    // HomeScreen caps its width at 600; WalletCanvas has 16px margins per side.
    const createCanvasWidth = Math.min(deviceWidth, 600) - 32;
    const blockUnit = createCanvasWidth / 12;
    const sizes = samples.map(dimensions);
    const maxWidthBlocks = Math.max(...sizes.map(s => s.widthBlocks));
    const maxHeightBlocks = Math.max(...sizes.map(s => s.heightBlocks));
    const scale = Math.min(1, slotWidth / (maxWidthBlocks * blockUnit));
    return { createCanvasWidth, blockUnit, scale, displayUnit: blockUnit * scale,
      maxWidthBlocks, maxHeightBlocks, stageHeight: maxHeightBlocks * blockUnit * scale };
  }
  function frame(card, metric) {
    const size = dimensions(card), unit = metric.displayUnit, inset = unit * .1;
    return { ...size, footprintWidth: size.widthBlocks * unit, footprintHeight: size.heightBlocks * unit,
      inset, paintWidth: (size.widthBlocks - .2) * unit, paintHeight: (size.heightBlocks - .2) * unit, radius: 14 };
  }
  const api = { dimensions, metrics, frame };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BememGridSize = api;
})(globalThis);
