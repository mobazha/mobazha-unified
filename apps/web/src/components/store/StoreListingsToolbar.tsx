'use client';

import React from 'react';
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
  categories?: CategoryItem[]; // 可用的分类列表
  onOpenMobileFilter?: () => void;
  className?: string;
}

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
  className,
}) => {
  const { t } = useI18n();

  const updateFilter = (updates: Partial<FilterState>) => {
    onFilterChange({ ...filter, ...updates });
  };

  const hasActiveFilters =
    filter.type !== 'all' ||
    filter.category !== 'all' ||
    filter.freeShipping ||
    filter.search.trim() !== '';

  const clearFilters = () => {
    onFilterChange(defaultFilterState);
  };

  const displayCount = filteredCount !== undefined ? filteredCount : totalCount;

  return (
    <div className={cn('space-y-3', className)}>
      {/* 桌面端布局 */}
      <div className="hidden md:flex items-center gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('filter.searchInStore') || '搜索店铺商品...'}
            value={filter.search}
            onChange={e => updateFilter({ search: e.target.value })}
            className="pl-9 h-9"
          />
          {filter.search && (
            <button
              onClick={() => updateFilter({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

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
                <SelectValue placeholder={t('filter.category') || '分类'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || '全部'}</SelectItem>
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
              {t('filter.freeShippingOnly') || '仅显示免运费'}
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" />
              {t('filter.clearFilters') || '清除筛选'}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            <Package className="h-4 w-4 inline mr-1" />
            {displayCount} {t('profile.listings')}
          </span>
        </div>
      </div>

      {/* 移动端布局 */}
      <div className="md:hidden space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('filter.searchInStore') || '搜索店铺商品...'}
            value={filter.search}
            onChange={e => updateFilter({ search: e.target.value })}
            className="pl-9"
          />
          {filter.search && (
            <button
              onClick={() => updateFilter({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

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
