/**
 * chunker.js
 * Converts any AI action payload into a consistently-ordered array
 * of individual action objects ready for the execution engine.
 *
 * Rules:
 *   • null / undefined  → []
 *   • plain object      → [object]
 *   • array             → array (filtered for non-null items)
 *   • primitive / other → wrapped in ALERT action
 */

const { ACTION_INTENTS, ALERT_TYPES } = require('../actions/actionSchema');

/**
 * @param {any} payload  Raw parsed value from responseParser
 * @returns {Object[]}   Array of action objects
 */
function chunkActions(payload) {
  if (payload === null || payload === undefined) {
    console.warn('[Chunker] Received null/undefined payload – returning empty chunk');
    return [];
  }

  if (Array.isArray(payload)) {
    const filtered = payload.filter((item) => {
      if (item === null || item === undefined) {
        console.warn('[Chunker] Skipping null/undefined item in action array');
        return false;
      }
      if (typeof item !== 'object') {
        console.warn(`[Chunker] Skipping non-object item: ${JSON.stringify(item)}`);
        return false;
      }
      return true;
    });

    console.log(`[Chunker] Chunked array payload into ${filtered.length} action(s)`);
    return filtered;
  }

  if (typeof payload === 'object') {
    console.log('[Chunker] Single object payload wrapped into 1-item array');
    return [payload];
  }

  // Unexpected scalar
  console.warn(`[Chunker] Unexpected payload type "${typeof payload}" – emitting ALERT action`);
  return [
    {
      intent: ACTION_INTENTS.ALERT,
      type: ALERT_TYPES.ERROR,
      message: `Chunker received an unexpected payload type: ${typeof payload}`,
      metadata: { payload: String(payload).slice(0, 200) },
    },
  ];
}

module.exports = { chunkActions };
