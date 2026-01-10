'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@mobazha/core';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type FilterState,
  type ProductType,
  type SortOption,
  type CategoryItem,
  defaultFilterState,
} from './StoreListingsToolbar';

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  categories?: CategoryItem[];
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

// 单选项组件
const RadioOption: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-colors text-left',
      selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
    )}
  >
    <span className="text-sm">{label}</span>
    {selected && <Check className="h-4 w-4" />}
  </button>
);

export const FilterSheet: React.FC<FilterSheetProps> = ({
  open,
  onOpenChange,
  filter,
  onFilterChange,
  categories = [],
}) => {
  const { t } = useI18n();

  // 使用本地状态管理临时筛选，点击应用时才提交
  const [localFilter, setLocalFilter] = React.useState<FilterState>(filter);

  // 当 sheet 打开时，同步外部 filter 到本地
  React.useEffect(() => {
    if (open) {
      setLocalFilter(filter);
    }
  }, [open, filter]);

  const updateLocalFilter = (updates: Partial<FilterState>) => {
    setLocalFilter(prev => ({ ...prev, ...updates }));
  };

  const handleApply = () => {
    onFilterChange(localFilter);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalFilter(defaultFilterState);
  };

  const hasChanges =
    localFilter.type !== filter.type ||
    localFilter.category !== filter.category ||
    localFilter.sortBy !== filter.sortBy ||
    localFilter.freeShipping !== filter.freeShipping;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>{t('filter.filters') || '筛选'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {/* 分类筛选 */}
          {categories.length > 0 && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('filter.category') || '分类'}
                </h3>
                <div className="space-y-1">
                  <RadioOption
                    label={t('common.all') || '全部'}
                    selected={localFilter.category === 'all'}
                    onClick={() => updateLocalFilter({ category: 'all' })}
                  />
                  {categories.map(cat => (
                    <RadioOption
                      key={cat.value}
                      label={cat.count !== undefined ? `${cat.label} (${cat.count})` : cat.label}
                      selected={localFilter.category === cat.value}
                      onClick={() => updateLocalFilter({ category: cat.value })}
                    />
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* 商品类型 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('filter.productType') || '商品类型'}
            </h3>
            <div className="space-y-1">
              {productTypes.map(type => (
                <RadioOption
                  key={type.value}
                  label={t(type.labelKey)}
                  selected={localFilter.type === type.value}
                  onClick={() => updateLocalFilter({ type: type.value })}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* 排序方式 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('search.sortBy') || '排序方式'}
            </h3>
            <div className="space-y-1">
              {sortOptions.map(option => (
                <RadioOption
                  key={option.value}
                  label={t(option.labelKey)}
                  selected={localFilter.sortBy === option.value}
                  onClick={() => updateLocalFilter({ sortBy: option.value })}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* 免运费 */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="mobile-free-shipping" className="text-sm">
              {t('filter.freeShippingOnly') || '仅显示免运费'}
            </Label>
            <Switch
              id="mobile-free-shipping"
              checked={localFilter.freeShipping}
              onCheckedChange={checked => updateLocalFilter({ freeShipping: checked })}
            />
          </div>
        </div>

        <SheetFooter className="px-4 py-4 border-t gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            {t('filter.resetFilters') || '重置'}
          </Button>
          <Button onClick={handleApply} className="flex-1" disabled={!hasChanges}>
            {t('common.apply') || '应用'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FilterSheet;
