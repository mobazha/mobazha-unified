// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

/**
 * ResourcePicker — PG-203 V2-P0
 *
 * Shopify-style resource selection for section props that reference store
 * resources (products, collections). Two building blocks:
 *
 *   - ResourcePickerDialog: searchable multi-select modal, selection order
 *     preserved (click order = display order).
 *   - ProductPickerField / CollectionPickerField: complete form fields for
 *     SectionPropsEditor — selected list with drag-to-reorder + remove,
 *     plus a button opening the dialog. Empty catalog states link to the
 *     matching admin page so sellers are never dead-ended.
 */

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  useI18n,
  useUserStore,
  productDataService,
  collectionsApi,
  getImageUrl,
  queryKeys,
} from '@mobazha/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImageIcon, Loader2, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FieldLabel } from './form-helpers';

export interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

interface ResourcePickerDialogProps {
  open: boolean;
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  items: PickerItem[];
  loading?: boolean;
  initialSelected: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

export function ResourcePickerDialog({
  open,
  title,
  searchPlaceholder,
  emptyText,
  items,
  loading,
  initialSelected,
  onConfirm,
  onClose,
}: ResourcePickerDialogProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  // Selection order preserved: array, not set.
  const [selected, setSelected] = useState<string[]>(initialSelected);

  useEffect(() => {
    if (open) {
      setSelected(initialSelected);
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      i => i.label.toLowerCase().includes(q) || i.sublabel?.toLowerCase().includes(q)
    );
  }, [items, query]);

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));
  };

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent className="max-w-lg flex flex-col max-h-[80vh]" data-testid="resource-picker">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            className="w-full text-sm pl-8 pr-2.5 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="resource-picker-search"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            <ul className="space-y-1 py-1">
              {filtered.map(item => {
                const checked = selected.includes(item.id);
                const order = checked ? selected.indexOf(item.id) + 1 : null;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors',
                        checked ? 'bg-primary/5 ring-1 ring-primary/40' : 'hover:bg-muted'
                      )}
                      aria-pressed={checked}
                    >
                      <span
                        className={cn(
                          'w-5 h-5 shrink-0 rounded-full border text-[10px] font-semibold flex items-center justify-center',
                          checked
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border text-transparent'
                        )}
                      >
                        {order ?? '·'}
                      </span>
                      <span className="w-10 h-10 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{item.label}</span>
                        {item.sublabel && (
                          <span className="block text-xs text-muted-foreground truncate">
                            {item.sublabel}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {t('admin.storeBranding.pickerSelectedCount', { count: String(selected.length) })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={() => onConfirm(selected)}
              data-testid="resource-picker-confirm"
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sortable selected list (shared by both fields)
// ---------------------------------------------------------------------------

function SortableSelectedRow({ item, onRemove }: { item: PickerItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 p-1.5 rounded-md border border-border bg-card',
        isDragging && 'z-50 shadow-md opacity-90'
      )}
    >
      <button
        type="button"
        className="p-0.5 rounded cursor-grab active:cursor-grabbing hover:bg-muted touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <span className="w-7 h-7 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </span>
      <span className="flex-1 min-w-0 text-xs font-medium truncate">{item.label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
        aria-label="Remove"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

function SortableSelectedList({
  ids,
  itemsById,
  onChange,
  missingLabel,
}: {
  ids: string[];
  itemsById: Map<string, PickerItem>;
  onChange: (ids: string[]) => void;
  missingLabel: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  if (ids.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {ids.map(id => (
            <SortableSelectedRow
              key={id}
              item={itemsById.get(id) ?? { id, label: `${missingLabel} (${id})` }}
              onRemove={() => onChange(ids.filter(i => i !== id))}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Data hooks (owner catalog)
// ---------------------------------------------------------------------------

function useOwnPeerID(): string | null {
  const { profile } = useUserStore();
  return profile?.peerID || null;
}

export function useOwnerProducts() {
  const peerID = useOwnPeerID();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.ownerCatalog(peerID || 'unknown'),
    queryFn: () => productDataService.getStoreListings(peerID!),
    enabled: !!peerID,
    staleTime: 60 * 1000,
  });
  return { peerID, products: data ?? [], isLoading };
}

export function useOwnerCollections() {
  const peerID = useOwnPeerID();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.collections.list(1),
    queryFn: () => collectionsApi.listCollections(1, 100),
    enabled: !!peerID,
    staleTime: 60 * 1000,
  });
  return { peerID, collections: data?.data ?? [], isLoading };
}

// ---------------------------------------------------------------------------
// Field: manual product selection
// ---------------------------------------------------------------------------

export function ProductPickerField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { peerID, products, isLoading } = useOwnerProducts();

  const pickerItems = useMemo<PickerItem[]>(
    () =>
      products.map(p => ({
        id: p.slug,
        label: p.title,
        imageUrl: getImageUrl(p.thumbnail?.small, peerID || undefined),
      })),
    [products, peerID]
  );
  const itemsById = useMemo(() => new Map(pickerItems.map(i => [i.id, i])), [pickerItems]);

  const catalogEmpty = !isLoading && products.length === 0;

  return (
    <div>
      <FieldLabel>{t('admin.storeBranding.fieldManualProducts')}</FieldLabel>
      {catalogEmpty ? (
        <p className="text-xs text-muted-foreground">
          {t('admin.storeBranding.noProductsYet')}{' '}
          <Link href="/admin/products" className="text-primary hover:underline">
            {t('admin.storeBranding.goAddProducts')}
          </Link>
        </p>
      ) : (
        <div className="space-y-2">
          <SortableSelectedList
            ids={value}
            itemsById={itemsById}
            onChange={onChange}
            missingLabel={t('admin.storeBranding.missingProduct')}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-colors"
            data-testid="open-product-picker"
          >
            <Plus className="w-3.5 h-3.5" />
            {value.length > 0
              ? t('admin.storeBranding.editProductSelection')
              : t('admin.storeBranding.selectProducts')}
          </button>
          {value.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              {t('admin.storeBranding.manualProductsHint')}
            </p>
          )}
        </div>
      )}
      <ResourcePickerDialog
        open={open}
        title={t('admin.storeBranding.selectProducts')}
        searchPlaceholder={t('admin.storeBranding.searchProducts')}
        emptyText={t('admin.storeBranding.noProductsFound')}
        items={pickerItems}
        loading={isLoading}
        initialSelected={value}
        onConfirm={ids => {
          onChange(ids);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field: manual collection selection
// ---------------------------------------------------------------------------

export function CollectionPickerField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { peerID, collections, isLoading } = useOwnerCollections();

  const pickerItems = useMemo<PickerItem[]>(
    () =>
      collections.map(c => ({
        id: c.id,
        label: c.title,
        sublabel: c.published ? undefined : t('admin.storeBranding.collectionUnpublished'),
        imageUrl: getImageUrl(c.image, peerID || undefined),
      })),
    [collections, peerID, t]
  );
  const itemsById = useMemo(() => new Map(pickerItems.map(i => [i.id, i])), [pickerItems]);

  const catalogEmpty = !isLoading && collections.length === 0;

  return (
    <div>
      <FieldLabel>{t('admin.storeBranding.fieldManualCollections')}</FieldLabel>
      {catalogEmpty ? (
        <p className="text-xs text-muted-foreground">
          {t('admin.storeBranding.noCollectionsYet')}{' '}
          <Link href="/admin/collections" className="text-primary hover:underline">
            {t('admin.storeBranding.goAddCollections')}
          </Link>
        </p>
      ) : (
        <div className="space-y-2">
          <SortableSelectedList
            ids={value}
            itemsById={itemsById}
            onChange={onChange}
            missingLabel={t('admin.storeBranding.missingCollection')}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-colors"
            data-testid="open-collection-picker"
          >
            <Plus className="w-3.5 h-3.5" />
            {value.length > 0
              ? t('admin.storeBranding.editCollectionSelection')
              : t('admin.storeBranding.selectCollections')}
          </button>
        </div>
      )}
      <ResourcePickerDialog
        open={open}
        title={t('admin.storeBranding.selectCollections')}
        searchPlaceholder={t('admin.storeBranding.searchCollections')}
        emptyText={t('admin.storeBranding.noCollectionsFound')}
        items={pickerItems}
        loading={isLoading}
        initialSelected={value}
        onConfirm={ids => {
          onChange(ids);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
