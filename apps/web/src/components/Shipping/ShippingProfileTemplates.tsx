'use client';

import React, { useMemo } from 'react';
import { Package, Globe, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  useI18n,
  generateId,
  createEmptyProfile,
  inferCountryFromCurrency,
  type ShippingProfile,
  type ShippingZone,
} from '@mobazha/core';

function makeZone(
  name: string,
  regions: string[],
  rates: { name: string; price: string; currency: string; estimatedDelivery: string }[]
): ShippingZone {
  return {
    id: generateId(),
    name,
    regions,
    rates: rates.map(r => ({ id: generateId(), ...r })),
  };
}

interface ShippingProfileTemplatesProps {
  currency: string;
  sellerCountry?: string;
  onSelect: (profile: ShippingProfile) => void;
  className?: string;
}

export function ShippingProfileTemplates({
  currency,
  sellerCountry,
  onSelect,
  className,
}: ShippingProfileTemplatesProps) {
  const { t } = useI18n();

  const domesticCountry = useMemo(
    () => sellerCountry || inferCountryFromCurrency(currency),
    [sellerCountry, currency],
  );

  const templates = useMemo(
    () => [
      {
        id: 'domestic',
        icon: Package,
        labelKey: 'shippingTemplates.profileDomestic' as const,
        descKey: 'shippingTemplates.profileDomesticDesc' as const,
        create: (): ShippingProfile => {
          const profile = createEmptyProfile(true);
          profile.name = t('shippingTemplates.profileDomestic');
          profile.locationGroups[0].zones = [
            makeZone(t('shippingTemplates.tplDomesticZone'), [domesticCountry], [
              {
                name: t('shippingTemplates.tplStandard'),
                price: '500',
                currency,
                estimatedDelivery: t('shippingTemplates.tplDelivery3to5'),
              },
              {
                name: t('shippingTemplates.tplExpress'),
                price: '1500',
                currency,
                estimatedDelivery: t('shippingTemplates.tplDelivery1to2'),
              },
            ]),
          ];
          return profile;
        },
      },
      {
        id: 'international',
        icon: Globe,
        labelKey: 'shippingTemplates.profileInternational' as const,
        descKey: 'shippingTemplates.profileInternationalDesc' as const,
        create: (): ShippingProfile => {
          const profile = createEmptyProfile(true);
          profile.name = t('shippingTemplates.profileInternational');
          profile.locationGroups[0].zones = [
            makeZone(t('shippingTemplates.tplDomesticZone'), [domesticCountry], [
              {
                name: t('shippingTemplates.tplStandard'),
                price: '500',
                currency,
                estimatedDelivery: t('shippingTemplates.tplDelivery3to5'),
              },
            ]),
            makeZone(t('shippingTemplates.tplInternationalZone'), ['ALL'], [
              {
                name: t('shippingTemplates.tplInternationalRate'),
                price: '1500',
                currency,
                estimatedDelivery: t('shippingTemplates.tplDelivery7to14'),
              },
            ]),
          ];
          return profile;
        },
      },
      {
        id: 'free_shipping',
        icon: Gift,
        labelKey: 'shippingTemplates.profileFreeShipping' as const,
        descKey: 'shippingTemplates.profileFreeShippingDesc' as const,
        create: (): ShippingProfile => {
          const profile = createEmptyProfile(true);
          profile.name = t('shippingTemplates.profileFreeShipping');
          profile.locationGroups[0].zones = [
            makeZone(t('shippingTemplates.tplWorldwideZone'), ['ALL'], [
              {
                name: t('shippingTemplates.tplFreeRate'),
                price: '0',
                currency,
                estimatedDelivery: t('shippingTemplates.tplDelivery5to10'),
              },
            ]),
          ];
          return profile;
        },
      },
    ],
    [currency, domesticCountry, t]
  );

  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">
          {t('shippingTemplates.profileQuickStart')}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('shippingTemplates.profileQuickStartDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {templates.map(template => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(template.create())}
              data-testid={`profile-template-${template.id}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{t(template.labelKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(template.descKey)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ShippingProfileTemplates;
