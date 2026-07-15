'use client';

/**
 * StoreEditorContext — PG-203
 *
 * True when sections render inside the admin editor canvas. Sections use it
 * to show guidance for empty states (no products picked, no images yet)
 * instead of collapsing to nothing, which would leave the seller staring at
 * a blank canvas with no way to understand why.
 */

import { createContext, useContext } from 'react';

export const StoreEditorContext = createContext(false);

export function useIsStoreEditor(): boolean {
  return useContext(StoreEditorContext);
}
