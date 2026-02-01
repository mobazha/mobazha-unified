'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioOption } from '@/components/ui/radio-option';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { type FilterState, type ProductType, type CategoryItem } from './StoreListingsToolbar';

interface FilterSidebarProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  categories?: CategoryItem[];
  className?: string;
}

// 商品类型配置（RWA 代币已有单独的标签页，不在此筛选）
const productTypes: { value: ProductType; labelKey: string }[] = [
  { value: 'all', labelKey: 'filter.allTypes' },
  { value: 'physical_good', labelKey: 'filter.physicalGoods' },
  { value: 'service', labelKey: 'filter.services' },
];

/**
 * 桌面端左侧筛选边栏
 * 参考原版 mobazha-desktop 的布局
 */
export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filter,
  onFilterChange,
  categories = [],
  className,
}) => {
  const { t } = useI18n();

  const updateFilter = (updates: Partial<FilterState>) => {
    onFilterChange({ ...filter, ...updates });
  };

  return (
    <aside className={cn('w-56 shrink-0 space-y-5', className)}>
      {/* 快递 - Shipping */}
      <div className="space-y-3">
        <h3 className="text-sm lg:text-base font-semibold text-foreground">
          {t('filter.shipping') || '快递'}
        </h3>
        <div className="space-y-2.5">
          {/* 发往国家选择（暂时禁用，后续可实现） */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('filter.shipTo') || '发往:'}</Label>
            <Select value="any" disabled>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t('filter.anyCountry') || '(任何国家)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t('filter.anyCountry') || '(任何国家)'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 免运费开关 */}
          <div className="flex items-center gap-2">
            <Switch
              id="sidebar-free-shipping"
              checked={filter.freeShipping}
              onCheckedChange={checked => updateFilter({ freeShipping: checked })}
              className="scale-90"
            />
            <Label htmlFor="sidebar-free-shipping" className="text-sm cursor-pointer">
              {t('filter.freeShipping') || '免运费'}
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* 类别 - Category */}
      {categories.length > 0 && (
        <>
          <div className="space-y-2">
            <h3 className="text-sm lg:text-base font-semibold text-foreground">
              {t('filter.category') || '类别'}
            </h3>
            <div className="space-y-0.5">
              <RadioOption
                label={t('common.all') || '全部'}
                selected={filter.category === 'all'}
                onClick={() => updateFilter({ category: 'all' })}
              />
              {categories.map(cat => (
                <RadioOption
                  key={cat.value}
                  label={cat.count !== undefined ? `${cat.label} (${cat.count})` : cat.label}
                  selected={filter.category === cat.value}
                  onClick={() => updateFilter({ category: cat.value })}
                />
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* 类型 - Type */}
      <div className="space-y-2">
        <h3 className="text-sm lg:text-base font-semibold text-foreground">
          {t('filter.type') || '类型'}
        </h3>
        <div className="space-y-0.5">
          {productTypes.map(type => (
            <RadioOption
              key={type.value}
              label={t(type.labelKey)}
              selected={filter.type === type.value}
              onClick={() => updateFilter({ type: type.value })}
            />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
