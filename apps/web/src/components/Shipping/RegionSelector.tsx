'use client';

/**
 * RegionSelector - 多选国家/地区选择器
 * 支持选择多个配送地区，包括"全球"选项
 *
 * UX 改进:
 * - 使用复选框显示选中状态，更直观
 * - 在弹窗顶部显示选择摘要
 * - 添加"全选"功能
 * - 已选地区用勾选标记清晰展示
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Check, ChevronDown, Globe, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

  // 全选所有国家
  const selectAllCountries = useCallback(() => {
    const allCodes = countryOptions.map(c => c.code);
    onChange(allCodes);
  }, [countryOptions, onChange]);

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
        return t('shipping.worldwide');
      }
      return getCountryName(code, language) || code;
    },
    [t, language]
  );

  // 显示的选中地区
  const displayRegions = useMemo(() => {
    if (isWorldwide) {
      return [{ code: WORLDWIDE_CODE, name: t('shipping.worldwide') }];
    }
    return value.slice(0, maxDisplay).map(code => ({
      code,
      name: getRegionDisplayName(code),
    }));
  }, [value, isWorldwide, maxDisplay, t, getRegionDisplayName]);

  const remainingCount = isWorldwide ? 0 : Math.max(0, value.length - maxDisplay);

  // 计算选中的国家数量（不包含 ALL）
  const selectedCountryCount = isWorldwide
    ? countryOptions.length
    : value.filter(c => c !== WORLDWIDE_CODE).length;
  const totalCountryCount = countryOptions.length;
  const isAllSelected = !isWorldwide && value.length === totalCountryCount;

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
                ? placeholder || t('shipping.selectRegions')
                : `${selectedCountryCount} ${t('shipping.regionsSelected')}`}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('shipping.selectRegions')}</DialogTitle>
          </DialogHeader>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="min-h-[200px] h-[50dvh] sm:h-[350px] flex-1 pr-4">
            {/* 全球选项 */}
            <div
              role="button"
              tabIndex={0}
              onClick={toggleWorldwide}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleWorldwide();
                }
              }}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors mb-2 cursor-pointer',
                isWorldwide && 'bg-primary/10'
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isWorldwide}
                  onCheckedChange={toggleWorldwide}
                  onClick={e => e.stopPropagation()}
                />
                <Globe className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('shipping.worldwide')}</span>
              </div>
              {isWorldwide && <Check className="w-4 h-4 text-primary" />}
            </div>

            <div className="border-t my-2" />

            {/* 热门国家 */}
            {!searchQuery && (
              <>
                <p className="text-xs text-muted-foreground px-3 py-2 font-medium">
                  {t('shipping.popularCountries')}
                </p>
                {POPULAR_COUNTRIES.slice(0, 5).map(code => {
                  const name = getCountryName(code, language) || code;
                  const isSelected = !isWorldwide && value.includes(code);
                  return (
                    <div
                      key={`popular-${code}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCountry(code)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCountry(code);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer',
                        isSelected && 'bg-primary/10'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected || isWorldwide}
                          disabled={isWorldwide}
                          onCheckedChange={() => toggleCountry(code)}
                          onClick={e => e.stopPropagation()}
                        />
                        <span>{name}</span>
                      </div>
                      {(isSelected || isWorldwide) && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  );
                })}
                <div className="border-t my-2" />
                <p className="text-xs text-muted-foreground px-3 py-2 font-medium">
                  {t('shipping.allCountries')}
                </p>
              </>
            )}

            {/* 所有国家列表 */}
            {filteredCountries.map(country => {
              const isSelected = !isWorldwide && value.includes(country.code);
              return (
                <div
                  key={country.code}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCountry(country.code)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleCountry(country.code);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer',
                    isSelected && 'bg-primary/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected || isWorldwide}
                      disabled={isWorldwide}
                      onCheckedChange={() => toggleCountry(country.code)}
                      onClick={e => e.stopPropagation()}
                    />
                    <span>{country.name}</span>
                  </div>
                  {(isSelected || isWorldwide) && <Check className="w-4 h-4 text-primary" />}
                </div>
              );
            })}

            {filteredCountries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">{t('common.noResults')}</div>
            )}
          </ScrollArea>

          {/* 底部操作 - 显示选择统计和操作按钮 */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                disabled={value.length === 0}
              >
                {t('common.clearAll')}
              </Button>
              {!isWorldwide && !isAllSelected && (
                <Button variant="ghost" size="sm" onClick={selectAllCountries}>
                  {t('common.selectAll')}
                </Button>
              )}
            </div>
            <Button onClick={() => setOpen(false)}>{t('common.done')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegionSelector;
