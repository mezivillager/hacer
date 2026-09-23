/**
 * localStorage key names for saved circuits.
 *
 * Their own module so `autosave.ts` can read `AUTOSAVE_KEY` without importing
 * `persistenceActions.ts`, which closes one edge of the store's persistence
 * cycle (#181 / #329). `persistenceActions.ts` re-exports both, so existing
 * importers are unaffected.
 */
export const STORAGE_PREFIX = 'hacer-circuit-'
export const AUTOSAVE_KEY = `${STORAGE_PREFIX}__autosave__`
