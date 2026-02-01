'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  /** 选项列表 */
  options: SearchableSelectOption[];
  /** 当前选中值 */
  value?: string;
  /** 值变化回调 */
  onValueChange?: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 无结果文本 */
  emptyText?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 可搜索的下拉选择组件
 */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found',
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // 过滤选项
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      option =>
        option.label.toLowerCase().includes(searchLower) ||
        option.value.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  // 获取当前选中项的标签
  const selectedLabel = React.useMemo(() => {
    if (!value) return null;
    return options.find(opt => opt.value === value)?.label;
  }, [options, value]);

  // 处理滚动事件，阻止事件冒泡
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 flex flex-col"
        align="start"
        style={{ maxHeight: '350px' }}
      >
        {/* 搜索输入框 */}
        <div className="flex items-center border-b px-3 py-2 flex-shrink-0">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* 选项列表 */}
        <div
          className="flex-1 p-1"
          style={{
            overflowY: 'auto',
            maxHeight: '300px',
            WebkitOverflowScrolling: 'touch',
          }}
          onWheel={handleWheel}
        >
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            <>
              {filteredOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onValueChange?.(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                    value === option.value && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
