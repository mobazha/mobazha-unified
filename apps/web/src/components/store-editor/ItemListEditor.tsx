// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

/**
 * ItemListEditor — PG-203 V2-P0
 *
 * Generic editor for array-typed section props (FAQ items, testimonials,
 * trust badges, gallery images). Renders each item as a removable card with
 * caller-provided fields, plus an add button. Generalizes the pattern the
 * FAQ editor pioneered so no section is left with an uneditable array.
 */

import React, { useState } from 'react';
import { useI18n } from '@mobazha/core';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { FieldLabel } from './form-helpers';

interface ItemListEditorProps<T> {
  label?: string;
  items: T[];
  onChange: (items: T[]) => void;
  /** Renders the editable fields of one item; `update` merges a partial patch. */
  renderFields: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  /** Short label shown in the item card header (e.g. the item's title). */
  itemLabel: (item: T, index: number) => string;
  /** Creates a fresh item when the add button is clicked. */
  createItem: () => T;
  addLabel: string;
  max?: number;
}

export function ItemListEditor<T>({
  label,
  items,
  onChange,
  renderFields,
  itemLabel,
  createItem,
  addLabel,
  max,
}: ItemListEditorProps<T>) {
  const { t } = useI18n();

  // Items are plain data with no natural id, so track a parallel array of
  // stable uids to key the cards. Keys must survive a reorder, otherwise React
  // rebuilds the cards in place and the field state (and focus) follows the
  // position rather than the item.
  //
  // Index-based commits are safe despite the 300ms field debounce: the inputs
  // fire through an onChange ref they refresh every render, so a commit pending
  // across a reorder resolves against this render's closure, whose index is
  // already the item's new position.
  const [uidState, setUidState] = useState(() => ({
    uids: items.map((_, i) => `ile-${i}`),
    next: items.length,
  }));

  let uids = uidState.uids;
  if (uids.length !== items.length) {
    // Length changed from outside (undo/redo, preset swap). Resync during
    // render — an effect would leave one paint with keys for the old length.
    const resized = uids.slice(0, items.length);
    let next = uidState.next;
    while (resized.length < items.length) resized.push(`ile-${next++}`);
    uids = resized;
    setUidState({ uids: resized, next });
  }

  const updateAt = (index: number, patch: Partial<T>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeAt = (index: number) => {
    // Drop the removed position's uid, not the trailing one, so the surviving
    // cards keep their identity.
    setUidState(prev => ({ ...prev, uids: prev.uids.filter((_, i) => i !== index) }));
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= items.length) return;
    setUidState(prev => {
      const nextUids = [...prev.uids];
      const [movedUid] = nextUids.splice(index, 1);
      nextUids.splice(to, 0, movedUid);
      return { ...prev, uids: nextUids };
    });
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const canAdd = max === undefined || items.length < max;

  return (
    <div className="space-y-2">
      {label && <FieldLabel>{label}</FieldLabel>}
      {items.map((item, i) => (
        <div key={uids[i]} className="p-2 rounded-md border border-border bg-muted/30 space-y-2">
          <div className="flex items-center gap-1">
            <span className="flex-1 min-w-0 text-xs font-medium truncate">
              {itemLabel(item, i) || `#${i + 1}`}
            </span>
            <button
              type="button"
              onClick={() => moveItem(i, -1)}
              disabled={i === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label={t('admin.storeBranding.moveItemUp')}
            >
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => moveItem(i, 1)}
              disabled={i === items.length - 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label={t('admin.storeBranding.moveItemDown')}
            >
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label={t('admin.storeBranding.removeItem')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {renderFields(item, patch => updateAt(i, patch), i)}
        </div>
      ))}
      {canAdd && (
        <button
          type="button"
          onClick={() => onChange([...items, createItem()])}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </button>
      )}
    </div>
  );
}
