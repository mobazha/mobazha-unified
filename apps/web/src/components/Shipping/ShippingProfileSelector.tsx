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
  selectedProfileId?: string;
  onProfileChange: (profile: ShippingProfile | null) => void;
  error?: string;
  className?: string;
}

export function ShippingProfileSelector({
  selectedProfileId,
  onProfileChange,
  error,
  className = '',
}: ShippingProfileSelectorProps) {
  const { t } = useI18n();
  const { profiles, isLoading, defaultProfile } = useShippingProfiles();

  const selectedProfile = useMemo(() => {
    if (!selectedProfileId) return defaultProfile;
    return profiles.find(p => p.profileId === selectedProfileId) || defaultProfile;
  }, [selectedProfileId, profiles, defaultProfile]);

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

  if (profiles.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('listing.shippingProfile')}
            <span className="text-destructive ml-1">*</span>
          </h2>
        </div>

        <div className="p-6 border-2 border-dashed border-warning rounded-lg text-center bg-warning/5">
          <AlertTriangle className="w-10 h-10 mx-auto text-warning mb-3" />
          <h3 className="font-medium text-foreground mb-2">{t('listing.noShippingConfigured')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('listing.noShippingConfiguredDesc')}
          </p>
          <Button asChild>
            <Link href="/admin/settings/shipping">
              <Settings className="w-4 h-4 mr-2" />
              {t('listing.goToShippingSettings')}
            </Link>
          </Button>
        </div>

        {error && <p className="text-destructive text-sm mt-3">{error}</p>}
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('listing.shippingProfile')}
          <span className="text-destructive ml-1">*</span>
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings/shipping">
            <Settings className="w-4 h-4 mr-1" />
            {t('listing.manageProfiles')}
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{t('listing.selectShippingProfile')}</p>

      {error && <p className="text-destructive text-sm mb-3">{error}</p>}

      <div className="space-y-3" role="radiogroup" aria-label={t('listing.shippingProfile')}>
        {profiles.map(profile => {
          const isSelected = selectedProfile?.profileId === profile.profileId;
          const zones = getAllZones(profile);
          return (
            <div
              key={profile.profileId}
              role="radio"
              tabIndex={0}
              aria-checked={isSelected}
              aria-label={`${profile.name}${profile.isDefault ? `, ${t('common.default')}` : ''}`}
              className={cn(
                'p-4 border rounded-lg cursor-pointer transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              onClick={() => onProfileChange(profile)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onProfileChange(profile);
                }
              }}
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
                      {profile.listingCount != null && profile.listingCount > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          <Package className="w-3 h-3 inline mr-0.5" />
                          {t('shipping.listingsCount', { count: profile.listingCount })}
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
