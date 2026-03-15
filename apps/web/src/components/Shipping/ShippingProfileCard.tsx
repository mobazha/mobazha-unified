'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n, fromMinimalUnit, formatPrice, getAllZones, getAllRates } from '@mobazha/core';
import type { ShippingProfile } from '@mobazha/core';
import {
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Trash2,
  Check,
  Globe,
  MapPin,
  Package,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import { VStack, HStack } from '@/components/layouts';
import { cn } from '@/lib/utils';

export interface ShippingProfileCardProps {
  profile: ShippingProfile;
  onRename: (newName: string) => Promise<boolean>;
  onDelete: () => void;
  onSetDefault: () => void;
  disabled?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * 配送档案卡片组件 - Shopify 风格
 * 支持展开/折叠、显示价格范围、地区覆盖摘要、内联编辑名称
 */
export function ShippingProfileCard({
  profile,
  onRename,
  onDelete,
  onSetDefault,
  disabled = false,
  expanded = false,
  onToggleExpand,
}: ShippingProfileCardProps) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取所有区域和费率
  const zones = useMemo(() => getAllZones(profile), [profile]);
  const rates = useMemo(() => getAllRates(profile), [profile]);

  // 开始编辑
  const startEditing = useCallback(() => {
    setEditName(profile.name);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [profile.name]);

  // 保存编辑
  const saveEdit = useCallback(async () => {
    if (!editName.trim() || editName.trim() === profile.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      const success = await onRename(editName.trim());
      if (success) {
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [editName, profile.name, onRename]);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditName(profile.name);
    setIsEditing(false);
  }, [profile.name]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  // 计算价格范围
  const priceRange = useMemo(() => {
    if (rates.length === 0) return null;

    // 收集所有价格和货币
    const pricesByCurrency: Record<string, number[]> = {};

    rates.forEach(rate => {
      const currency = rate.currency || 'USD';
      if (!pricesByCurrency[currency]) {
        pricesByCurrency[currency] = [];
      }
      const price = fromMinimalUnit(rate.price || '0', currency);
      if (price > 0) pricesByCurrency[currency].push(price);
    });

    const currencies = Object.keys(pricesByCurrency);
    if (currencies.length === 0) return null;

    // 如果只有一种货币，直接显示
    if (currencies.length === 1) {
      const currency = currencies[0];
      const prices = pricesByCurrency[currency];
      if (prices.length === 0) return null;

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) {
        return formatPrice(minPrice, currency, { showSymbol: true, showCode: true });
      }
      const minFormatted = formatPrice(minPrice, currency, { showSymbol: false });
      const maxFormatted = formatPrice(maxPrice, currency, { showSymbol: true, showCode: true });
      return `${minFormatted} - ${maxFormatted}`;
    }

    // 多种货币
    return t('shipping.multipleCurrencies');
  }, [rates, t]);

  // 计算地区覆盖摘要
  const regionsSummary = useMemo(() => {
    if (zones.length === 0) {
      return { isWorldwide: false, count: 0, display: t('shipping.noRegions') };
    }

    // 统计所有唯一地区
    const allRegions = new Set<string>();
    let hasExplicitAll = false;

    zones.forEach(zone => {
      zone.regions?.forEach(region => {
        if (region === 'ALL') {
          hasExplicitAll = true;
        } else {
          allRegions.add(region);
        }
      });
    });

    // 判断是否为全球配送
    const WORLDWIDE_THRESHOLD = 240;
    const isWorldwide = hasExplicitAll || allRegions.size >= WORLDWIDE_THRESHOLD;

    if (isWorldwide) {
      return {
        isWorldwide: true,
        count: allRegions.size,
        display: t('shipping.worldwide'),
      };
    }

    const count = allRegions.size;
    return {
      isWorldwide: false,
      count,
      display:
        count === 0
          ? t('shipping.noRegions')
          : `${count} ${count === 1 ? t('shipping.region') : t('shipping.regions')}`,
    };
  }, [zones, t]);

  return (
    <Card className={cn('overflow-hidden', disabled && 'opacity-60')}>
      {/* 头部区域 */}
      <div className="p-4">
        <HStack justify="between" align="start">
          <VStack gap="sm" className="flex-1">
            {/* 档案名称和标签 */}
            <HStack gap="sm" align="center">
              <FolderOpen className="w-5 h-5 text-primary" />
              {isEditing ? (
                <Input
                  ref={inputRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={saveEdit}
                  className="h-7 text-base font-semibold w-48"
                  disabled={isSaving}
                />
              ) : (
                <button
                  onClick={startEditing}
                  className="font-semibold text-foreground text-base hover:text-primary transition-colors text-left"
                  disabled={disabled}
                  title={t('common.clickToEdit')}
                >
                  {profile.name}
                </button>
              )}
              {profile.isDefault && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {t('common.default')}
                </span>
              )}
            </HStack>

            {/* 摘要信息 */}
            <HStack gap="md" className="flex-wrap">
              {/* 区域数量 */}
              <HStack gap="xs" className="text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>
                  {zones.length} {zones.length === 1 ? t('shipping.zone') : t('shipping.zones')}
                </span>
              </HStack>

              {/* 地区覆盖 */}
              <HStack gap="xs" className="text-sm text-muted-foreground">
                {regionsSummary.isWorldwide ? (
                  <Globe className="w-4 h-4 text-primary" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                <span className={cn(regionsSummary.isWorldwide && 'text-primary font-medium')}>
                  {regionsSummary.display}
                </span>
              </HStack>

              {/* 价格范围 */}
              {priceRange && (
                <HStack gap="xs" className="text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-primary">{priceRange}</span>
                </HStack>
              )}

              {/* 关联商品数 */}
              {typeof profile.listingCount === 'number' && profile.listingCount > 0 && (
                <HStack gap="xs" className="text-sm text-muted-foreground">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t('shipping.listingsCount', { count: profile.listingCount })}</span>
                </HStack>
              )}
            </HStack>
          </VStack>

          {/* 操作按钮 */}
          <HStack gap="xs">
            {!profile.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSetDefault}
                disabled={disabled}
                title={t('shipping.setAsDefault')}
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(profile.isDefault && 'cursor-not-allowed')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDelete}
                      disabled={disabled || profile.isDefault}
                      className={cn(profile.isDefault && 'pointer-events-none')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {profile.isDefault ? t('shipping.cannotDeleteDefault') : t('common.delete')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </HStack>
        </HStack>
      </div>

      {/* 展开/折叠按钮 - 始终显示以允许编辑 */}
      {onToggleExpand && (
        <button
          onClick={onToggleExpand}
          className="w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 border-t flex items-center justify-center gap-1 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              {t('common.collapse')}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {zones.length > 0 ? t('shipping.viewZones') : t('shipping.addZone')}
            </>
          )}
        </button>
      )}
    </Card>
  );
}
