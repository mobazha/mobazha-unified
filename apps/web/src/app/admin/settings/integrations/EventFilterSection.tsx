'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export const FALLBACK_CATEGORIES = [
  'order',
  'dispute',
  'social',
  'chat',
  'wallet',
  'payment',
  'publish',
  'cart',
  'chatgroup',
];

export type EventCategory = string;

export function eventFilterToCategories(
  filter: string,
  available: string[] = FALLBACK_CATEGORIES
): Set<EventCategory> {
  if (!filter.trim()) return new Set();
  const validSet = new Set(available);
  const parts = filter
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const cats = new Set<EventCategory>();
  for (const p of parts) {
    const cat = p.replace(/\.\*$/, '');
    if (validSet.has(cat)) {
      cats.add(cat);
    }
  }
  return cats;
}

export function categoriesToEventFilter(cats: Set<EventCategory>): string {
  if (cats.size === 0) return '';
  return Array.from(cats)
    .map(c => `${c}.*`)
    .join(',');
}

export function formatEventFilterDisplay(
  filter: string,
  t: ReturnType<typeof useI18n>['t']
): string {
  if (!filter) return t('admin.integrations.eventFilterAll');
  const cats = eventFilterToCategories(filter);
  const labels = Array.from(cats).map(cat => {
    const key =
      `admin.integrations.eventCategory${cat.charAt(0).toUpperCase() + cat.slice(1)}` as Parameters<
        typeof t
      >[0];
    return t(key);
  });
  return labels.join(', ');
}

interface EventFilterSectionProps {
  filterMode: 'all' | 'custom';
  selectedCategories: Set<EventCategory>;
  availableCategories: string[];
  onFilterModeChange: (mode: 'all' | 'custom') => void;
  onToggleCategory: (cat: EventCategory) => void;
}

export function EventFilterSection({
  filterMode,
  selectedCategories,
  availableCategories,
  onFilterModeChange,
  onToggleCategory,
}: EventFilterSectionProps) {
  const { t } = useI18n();
  const categories = availableCategories.length > 0 ? availableCategories : FALLBACK_CATEGORIES;

  return (
    <div className="space-y-3">
      <Label>{t('admin.integrations.eventFilter')}</Label>

      <div className="space-y-2">
        <label className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
          <input
            type="radio"
            name="filterMode"
            checked={filterMode === 'all'}
            onChange={() => onFilterModeChange('all')}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium">{t('admin.integrations.eventFilterAll')}</p>
            <p className="text-xs text-muted-foreground">
              {t('admin.integrations.eventFilterAllDesc')}
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
          <input
            type="radio"
            name="filterMode"
            checked={filterMode === 'custom'}
            onChange={() => onFilterModeChange('custom')}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium">{t('admin.integrations.eventFilterCustom')}</p>
            <p className="text-xs text-muted-foreground">
              {t('admin.integrations.eventFilterCustomDesc')}
            </p>
          </div>
        </label>
      </div>

      {filterMode === 'custom' && (
        <div className="grid grid-cols-1 gap-1 ml-6 mt-1">
          {categories.map(cat => {
            const labelKey =
              `admin.integrations.eventCategory${cat.charAt(0).toUpperCase() + cat.slice(1)}` as Parameters<
                typeof t
              >[0];
            const descKey = `${labelKey}Desc` as Parameters<typeof t>[0];
            return (
              <label
                key={cat}
                className="flex items-start gap-2.5 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedCategories.has(cat)}
                  onCheckedChange={() => onToggleCategory(cat)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{t(labelKey)}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{t(descKey)}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
