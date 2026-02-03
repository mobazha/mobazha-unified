'use client';

/**
 * RegionSelector - 多选国家/地区选择器
 * 支持选择多个配送地区，包括"全球"选项
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Check, ChevronDown, Globe, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useI18n, getAllCountries, getCountryName, POPULAR_COUNTRIES } from '@mobazha/core';

// 特殊地区代码
const WORLDWIDE_CODE = 'ALL';

interface RegionSelectorProps {
  value: string[];
  onChange: (regions: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  maxDisplay?: number;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder,
  maxDisplay = 3,
}) => {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 是否选择了全球
  const isWorldwide = value.includes(WORLDWIDE_CODE);

  // 获取国家列表（智能排序：热门国家优先）
  const countryOptions = useMemo(() => {
    const allCountries = getAllCountries(language);
    return allCountries.sort((a, b) => {
      const aIsPopular = POPULAR_COUNTRIES.includes(a.code);
      const bIsPopular = POPULAR_COUNTRIES.includes(b.code);
      if (aIsPopular && !bIsPopular) return -1;
      if (!aIsPopular && bIsPopular) return 1;
      if (aIsPopular && bIsPopular) {
        return POPULAR_COUNTRIES.indexOf(a.code) - POPULAR_COUNTRIES.indexOf(b.code);
      }
      return a.name.localeCompare(b.name, language);
    });
  }, [language]);

  // 过滤后的国家列表
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryOptions;
    const query = searchQuery.toLowerCase();
    return countryOptions.filter(
      c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
    );
  }, [countryOptions, searchQuery]);

  // 切换全球选择
  const toggleWorldwide = useCallback(() => {
    if (isWorldwide) {
      onChange([]);
    } else {
      onChange([WORLDWIDE_CODE]);
    }
  }, [isWorldwide, onChange]);

  // 切换单个国家选择
  const toggleCountry = useCallback(
    (code: string) => {
      if (isWorldwide) {
        // 如果当前是全球，切换到只选择这个国家
        onChange([code]);
      } else if (value.includes(code)) {
        // 取消选择
        onChange(value.filter(c => c !== code));
      } else {
        // 添加选择
        onChange([...value, code]);
      }
    },
    [value, isWorldwide, onChange]
  );

  // 移除单个地区
  const removeRegion = useCallback(
    (code: string) => {
      if (code === WORLDWIDE_CODE) {
        onChange([]);
      } else {
        onChange(value.filter(c => c !== code));
      }
    },
    [value, onChange]
  );

  // 获取地区显示名称
  const getRegionDisplayName = useCallback(
    (code: string) => {
      if (code === WORLDWIDE_CODE) {
        return t('shipping.worldwide') || 'Worldwide';
      }
      return getCountryName(code, language) || code;
    },
    [t, language]
  );

  // 显示的选中地区
  const displayRegions = useMemo(() => {
    if (isWorldwide) {
      return [{ code: WORLDWIDE_CODE, name: t('shipping.worldwide') || 'Worldwide' }];
    }
    return value.slice(0, maxDisplay).map(code => ({
      code,
      name: getRegionDisplayName(code),
    }));
  }, [value, isWorldwide, maxDisplay, t, getRegionDisplayName]);

  const remainingCount = isWorldwide ? 0 : Math.max(0, value.length - maxDisplay);

  return (
    <div className="space-y-2">
      {/* 已选择的地区标签 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayRegions.map(region => (
            <Badge key={region.code} variant="secondary" className="flex items-center gap-1 pr-1">
              {region.code === WORLDWIDE_CODE && <Globe className="w-3 h-3" />}
              <span>{region.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    removeRegion(region.code);
                  }}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
          {remainingCount > 0 && <Badge variant="outline">+{remainingCount}</Badge>}
        </div>
      )}

      {/* 选择器按钮和对话框 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={disabled} className="w-full justify-between">
            <span className="text-muted-foreground">
              {value.length === 0
                ? placeholder || t('shipping.selectRegions') || 'Select regions...'
                : `${value.length} ${t('shipping.regionsSelected') || 'region(s) selected'}`}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shipping.selectRegions') || 'Select Regions'}</DialogTitle>
          </DialogHeader>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search') || 'Search...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[350px] pr-4">
            {/* 全球选项 */}
            <button
              type="button"
              onClick={toggleWorldwide}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors mb-2',
                isWorldwide && 'bg-primary/10'
              )}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('shipping.worldwide') || 'Worldwide'}</span>
              </div>
              {isWorldwide && <Check className="w-4 h-4 text-primary" />}
            </button>

            <div className="border-t my-2" />

            {/* 热门国家 */}
            {!searchQuery && (
              <>
                <p className="text-xs text-muted-foreground px-3 py-2 font-medium">
                  {t('shipping.popularCountries') || 'Popular Countries'}
                </p>
                {POPULAR_COUNTRIES.slice(0, 8).map(code => {
                  const name = getCountryName(code, language) || code;
                  const isSelected = !isWorldwide && value.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleCountry(code)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors',
                        isSelected && 'bg-primary/10'
                      )}
                    >
                      <span>{name}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
                <div className="border-t my-2" />
                <p className="text-xs text-muted-foreground px-3 py-2 font-medium">
                  {t('shipping.allCountries') || 'All Countries'}
                </p>
              </>
            )}

            {/* 所有国家列表 */}
            {filteredCountries.map(country => {
              const isSelected = !isWorldwide && value.includes(country.code);
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => toggleCountry(country.code)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors',
                    isSelected && 'bg-primary/10'
                  )}
                >
                  <span>{country.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}

            {filteredCountries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t('common.noResults') || 'No results found'}
              </div>
            )}
          </ScrollArea>

          {/* 底部操作 */}
          <div className="flex justify-between pt-2 border-t">
            <Button variant="ghost" onClick={() => onChange([])} disabled={value.length === 0}>
              {t('common.clearAll') || 'Clear All'}
            </Button>
            <Button onClick={() => setOpen(false)}>{t('common.done') || 'Done'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegionSelector;
