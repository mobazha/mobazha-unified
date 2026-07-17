// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface EntityComboboxRenderState {
  selected: boolean;
  active: boolean;
}

export interface EntityComboboxProps<T> {
  items: readonly T[];
  value?: string;
  onValueChange?: (value: string) => void;
  getItemValue: (item: T) => string;
  getItemText: (item: T) => string;
  getItemSearchText?: (item: T) => string;
  renderItem?: (item: T, state: EntityComboboxRenderState) => React.ReactNode;
  renderValue?: (item: T) => React.ReactNode;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  testId?: string;
}

function EntityComboboxInner<T>({
  items,
  value,
  onValueChange,
  getItemValue,
  getItemText,
  getItemSearchText,
  renderItem,
  renderValue,
  id,
  ariaLabel,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found',
  loadingText = 'Loading...',
  loading = false,
  disabled = false,
  className,
  contentClassName,
  testId,
}: EntityComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const generatedId = React.useId();
  const listboxId = `${generatedId}-listbox`;
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return [...items];

    return items.filter(item => {
      const searchable = getItemSearchText?.(item) ?? `${getItemText(item)} ${getItemValue(item)}`;
      return searchable.toLocaleLowerCase().includes(query);
    });
  }, [getItemSearchText, getItemText, getItemValue, items, search]);

  const selectedItem = React.useMemo(
    () => items.find(item => getItemValue(item) === value),
    [getItemValue, items, value]
  );

  const close = React.useCallback(() => {
    setOpen(false);
    setSearch('');
    setActiveIndex(0);
  }, []);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (disabled) return;
      setOpen(nextOpen);
      if (!nextOpen) {
        setSearch('');
        setActiveIndex(0);
      }
    },
    [disabled]
  );

  const selectItem = React.useCallback(
    (item: T) => {
      onValueChange?.(getItemValue(item));
      close();
    },
    [close, getItemValue, onValueChange]
  );

  const handleSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (filteredItems.length === 0) {
        if (event.key === 'Escape') close();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex(current => (current + 1) % filteredItems.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(current => (current - 1 + filteredItems.length) % filteredItems.length);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setActiveIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setActiveIndex(filteredItems.length - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const activeItem = filteredItems[activeIndex];
        if (activeItem) selectItem(activeItem);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    },
    [activeIndex, close, filteredItems, selectItem]
  );

  React.useEffect(() => {
    if (!open) return;
    const selectedIndex = filteredItems.findIndex(item => getItemValue(item) === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredItems, getItemValue, open, value]);

  React.useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  const activeOptionId =
    filteredItems.length > 0 ? `${generatedId}-option-${activeIndex}` : undefined;

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          data-testid={testId}
          className={cn(
            'min-h-11 w-full justify-between gap-2 px-3 font-normal',
            !selectedItem && 'text-muted-foreground',
            className
          )}
        >
          <span className="min-w-0 flex-1 text-left">
            {selectedItem
              ? (renderValue?.(selectedItem) ?? getItemText(selectedItem))
              : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn(
          'flex max-h-[min(26rem,var(--radix-popover-content-available-height))] w-[--radix-popover-trigger-width] flex-col p-0',
          contentClassName
        )}
        onOpenAutoFocus={event => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={searchInputRef}
            role="combobox"
            aria-label={searchPlaceholder}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-activedescendant={activeOptionId}
            placeholder={searchPlaceholder}
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            className="h-9 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid={testId ? `${testId}-search` : undefined}
          />
        </div>

        <div
          id={listboxId}
          role="listbox"
          aria-busy={loading}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
          onWheel={event => event.stopPropagation()}
        >
          {loading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{loadingText}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const itemValue = getItemValue(item);
              const selected = itemValue === value;
              const active = index === activeIndex;
              return (
                <button
                  key={itemValue}
                  ref={element => {
                    optionRefs.current[index] = element;
                  }}
                  id={`${generatedId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectItem(item)}
                  onFocus={() => setActiveIndex(index)}
                  onPointerMove={() => setActiveIndex(index)}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none transition-colors',
                    active && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Check
                    className={cn('h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    {renderItem?.(item, { selected, active }) ?? getItemText(item)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const EntityCombobox = React.memo(EntityComboboxInner) as typeof EntityComboboxInner;
