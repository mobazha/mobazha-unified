'use client';

import React, { useMemo } from 'react';
import { Package, Settings, AlertTriangle, Check } from 'lucide-react';
import Link from 'next/link';
import { useI18n, useShippingProfiles, getAllZones } from '@mobazha/core';
import type { ShippingProfile } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ShippingProfileSelectorProps {
  /** 当前选中的档案 ID */
  selectedProfileId?: string;
  /** 选中档案变化时的回调 */
  onProfileChange: (profile: ShippingProfile | null) => void;
  /** 错误信息 */
  error?: string;
  /** 自定义样式 */
  className?: string;
}

/**
 * 配送档案选择器组件
 *
 * 用于在商品创建/编辑时选择配送档案
 */
export function ShippingProfileSelector({
  selectedProfileId,
  onProfileChange,
  error,
  className = '',
}: ShippingProfileSelectorProps) {
  const { t } = useI18n();
  const { profiles, isLoading, isUsingProfiles, legacyOptions, defaultProfile } =
    useShippingProfiles();

  // 当前选中的档案
  const selectedProfile = useMemo(() => {
    if (!selectedProfileId) return defaultProfile;
    return profiles.find(p => p.profileId === selectedProfileId) || defaultProfile;
  }, [selectedProfileId, profiles, defaultProfile]);

  // 加载状态
  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="p-4 border border-border rounded-lg">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // 没有配送档案也没有传统运费选项 - 引导用户设置
  if (!isUsingProfiles && legacyOptions.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('listing.shippingOptions')}
            <span className="text-destructive ml-1">*</span>
          </h2>
        </div>

        <div className="p-6 border-2 border-dashed border-warning rounded-lg text-center bg-warning/5">
          <AlertTriangle className="w-10 h-10 mx-auto text-warning mb-3" />
          <h3 className="font-medium text-foreground mb-2">{t('listing.noShippingConfigured')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('listing.noShippingConfiguredDesc')}
          </p>
          <Link href="/settings/store/shipping">
            <Button>
              <Settings className="w-4 h-4 mr-2" />
              {t('listing.goToShippingSettings')}
            </Button>
          </Link>
        </div>

        {error && <p className="text-destructive text-sm mt-3">{error}</p>}
      </Card>
    );
  }

  // 使用传统运费选项模式（向后兼容）
  if (!isUsingProfiles && legacyOptions.length > 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('listing.shippingOptions')}
            <span className="text-destructive ml-1">*</span>
          </h2>
          <Link href="/settings/store/shipping">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              {t('listing.manageShipping')}
            </Button>
          </Link>
        </div>

        <div className="p-4 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <Package className="w-5 h-5 text-primary" />
            <span className="font-medium">{t('listing.storeShippingOptions')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('listing.usingStoreShippingOptions')}</p>
        </div>

        {error && <p className="text-destructive text-sm mt-3">{error}</p>}
      </Card>
    );
  }

  // 配送档案模式
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('listing.shippingProfile')}
          <span className="text-destructive ml-1">*</span>
        </h2>
        <Link href="/settings/store/shipping">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-1" />
            {t('listing.manageProfiles')}
          </Button>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{t('listing.selectShippingProfile')}</p>

      {error && <p className="text-destructive text-sm mb-3">{error}</p>}

      <div className="space-y-3">
        {profiles.map(profile => {
          const isSelected = selectedProfile?.profileId === profile.profileId;
          const zones = getAllZones(profile);
          return (
            <div
              key={profile.profileId}
              className={cn(
                'p-4 border rounded-lg cursor-pointer transition-colors',
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              )}
              onClick={() => onProfileChange(profile)}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground">{profile.name}</span>
                      {profile.isDefault && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {t('common.default')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {zones.length} {zones.length === 1 ? t('shipping.zone') : t('shipping.zones')}
                    </span>
                  </div>
                  {zones.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {zones
                        .map(zone => zone.name)
                        .slice(0, 3)
                        .join(', ')}
                      {zones.length > 3 && ` +${zones.length - 3}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default ShippingProfileSelector;
