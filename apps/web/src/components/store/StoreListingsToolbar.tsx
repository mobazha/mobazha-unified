'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';
import { Search, SlidersHorizontal, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

// 商品类型
export type ProductType = 'all' | 'physical_good' | 'digital_good' | 'service' | 'rwa_token';

// 排序方式
export type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

// 分类项
export interface CategoryItem {
  value: string;
  label: string;
  count?: number;
}

// 筛选状态
export interface FilterState {
  search: string;
  type: ProductType;
  category: string; // 'all' 或具体分类名
  sortBy: SortOption;
  freeShipping: boolean;
}

// 默认筛选状态
export const defaultFilterState: FilterState = {
  search: '',
  type: 'all',
  category: 'all',
  sortBy: 'relevance',
  freeShipping: false,
};

interface StoreListingsToolbarProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  totalCount: number;
  filteredCount?: number;
  categories?: CategoryItem[];
  onOpenMobileFilter?: () => void;
  /** 紧凑模式：桌面端有侧边栏时使用，只显示搜索+排序+数量 */
  compact?: boolean;
  /** Product titles for search suggestions */
  productTitles?: string[];
  className?: string;
}

const DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 6;

// 商品类型配置（RWA 代币不单独筛选，在"全部"中显示）
const productTypes: { value: ProductType; labelKey: string }[] = [
  { value: 'all', labelKey: 'filter.allTypes' },
  { value: 'physical_good', labelKey: 'filter.physicalGoods' },
  { value: 'digital_good', labelKey: 'filter.digitalGoods' },
  { value: 'service', labelKey: 'filter.services' },
];

// 排序选项配置
const sortOptions: { value: SortOption; labelKey: string }[] = [
  { value: 'relevance', labelKey: 'search.relevance' },
  { value: 'price-asc', labelKey: 'search.priceLowHigh' },
  { value: 'price-desc', labelKey: 'search.priceHighLow' },
  { value: 'rating', labelKey: 'search.bestRating' },
  { value: 'newest', labelKey: 'search.newest' },
];

export const StoreListingsToolbar: React.FC<StoreListingsToolbarProps> = ({
  filter,
  onFilterChange,
  totalCount,
  filteredCount,
  categories = [],
  onOpenMobileFilter,
  compact = false,
  productTitles = [],
  className,
}) => {
  const { t } = useI18n();
  const [localSearch, setLocalSearch] = useState(filter.search);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external filter.search → localSearch (e.g. when "Clear Filters" is clicked)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setLocalSearch(filter.search);
  }, [filter.search]);

  const debouncedSearchUpdate = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onFilterChange({ ...filter, search: value });
      }, DEBOUNCE_MS);
    },
    [filter, onFilterChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      setShowSuggestions(value.trim().length > 0);
      debouncedSearchUpdate(value);
    },
    [debouncedSearchUpdate]
  );

  const handleSuggestionClick = useCallback(
    (title: string) => {
      setLocalSearch(title);
      setShowSuggestions(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onFilterChange({ ...filter, search: title });
    },
    [filter, onFilterChange]
  );

  const handleClearSearch = useCallback(() => {
    setLocalSearch('');
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onFilterChange({ ...filter, search: '' });
  }, [filter, onFilterChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as HTMLElement)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (!localSearch.trim() || productTitles.length === 0) return [];
    const lower = localSearch.toLowerCase();
    return productTitles
      .filter(title => title.toLowerCase().includes(lower))
      .slice(0, MAX_SUGGESTIONS);
  }, [localSearch, productTitles]);

  const updateFilter = (updates: Partial<FilterState>) => {
    onFilterChange({ ...filter, ...updates });
  };

  const hasActiveFilters =
    filter.type !== 'all' ||
    filter.category !== 'all' ||
    filter.freeShipping ||
    filter.search.trim() !== '';

  const clearFilters = () => {
    setLocalSearch('');
    onFilterChange(defaultFilterState);
  };

  const displayCount = filteredCount !== undefined ? filteredCount : totalCount;

  const renderSearchInput = (inputClassName?: string) => (
    <div className="relative" ref={searchContainerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={t('filter.searchInStore')}
        value={localSearch}
        onChange={e => handleSearchChange(e.target.value)}
        onFocus={() => localSearch.trim() && setShowSuggestions(true)}
        className={cn('pl-9', inputClassName)}
      />
      {localSearch && (
        <button
          onClick={handleClearSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {suggestions.map((title, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent truncate"
              onMouseDown={e => {
                e.preventDefault();
                handleSuggestionClick(title);
              }}
            >
              {title}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* 桌面端紧凑布局（有侧边栏时）：搜索 + 数量 + 排序 */}
      {compact ? (
        <div className="hidden md:flex items-center gap-4">
          {/* 搜索框 */}
          <div className="flex-1 max-w-sm">{renderSearchInput('h-9')}</div>

          {/* 商品数量 */}
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {displayCount} {t('filter.resultsFound')}
          </span>

          {/* 排序下拉 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{t('search.sortBy')}</span>
            <Select
              value={filter.sortBy}
              onValueChange={(value: SortOption) => updateFilter({ sortBy: value })}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder={t('search.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <>
          {/* 桌面端完整布局（无侧边栏时） */}
          <div className="hidden md:flex items-center gap-4">
            {/* 搜索框 */}
            <div className="flex-1 max-w-xs">{renderSearchInput('h-9')}</div>

            {/* 类型筛选标签 */}
            <HStack gap="xs" className="flex-1">
              {productTypes.map(type => (
                <Badge
                  key={type.value}
                  variant={filter.type === type.value ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors px-3 py-1',
                    filter.type === type.value
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => updateFilter({ type: type.value })}
                >
                  {t(type.labelKey)}
                </Badge>
              ))}
            </HStack>

            {/* 排序下拉 */}
            <Select
              value={filter.sortBy}
              onValueChange={(value: SortOption) => updateFilter({ sortBy: value })}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder={t('search.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 桌面端第二行：分类 + 免运费 + 商品数量 */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 分类筛选 */}
              {categories.length > 0 && (
                <Select
                  value={filter.category}
                  onValueChange={(value: string) => updateFilter({ category: value })}
                >
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder={t('filter.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                        {cat.count !== undefined && (
                          <span className="ml-1 text-muted-foreground">({cat.count})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* 免运费开关 */}
              <div className="flex items-center gap-2">
                <Switch
                  id="free-shipping"
                  checked={filter.freeShipping}
                  onCheckedChange={checked => updateFilter({ freeShipping: checked })}
                />
                <Label htmlFor="free-shipping" className="text-sm cursor-pointer">
                  {t('filter.freeShippingOnly')}
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  {t('filter.clearFilters')}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                <Package className="h-4 w-4 inline mr-1" />
                {displayCount} {t('profile.listings')}
              </span>
            </div>
          </div>
        </>
      )}

      {/* 移动端布局 */}
      <div className="md:hidden space-y-3">
        {/* 搜索框 */}
        {renderSearchInput()}

        {/* 筛选和排序按钮 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenMobileFilter}
              className={cn('gap-1.5', hasActiveFilters && 'border-primary text-primary')}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('search.filters')}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  !
                </Badge>
              )}
            </Button>

            <Select
              value={filter.sortBy}
              onValueChange={(value: SortOption) => updateFilter({ sortBy: value })}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder={t('search.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {displayCount} {t('profile.listings')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StoreListingsToolbar;
