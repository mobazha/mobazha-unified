'use client';

import React from 'react';
import { Palette, Globe, Sparkles, Users } from 'lucide-react';
import { Container } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

const AUDIENCES = [
  { icon: Palette, key: 'creators' as const },
  { icon: Globe, key: 'crossBorder' as const },
  { icon: Sparkles, key: 'digitalGoods' as const },
  { icon: Users, key: 'communityCommerce' as const },
];

export const AudienceSection: React.FC = React.memo(() => {
  const { t } = useI18n();

  return (
    <section className="py-6 sm:py-12 lg:py-16">
      <Container size="xl">
        <div className="text-center mb-4 sm:mb-10">
          <h2 className="text-base sm:text-2xl lg:text-3xl font-bold text-foreground">
            {t('saasHome.audience.title')}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-base mt-1 sm:mt-2">
            {t('saasHome.audience.subtitle')}
          </p>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:hidden -mx-4 px-4">
          {AUDIENCES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex-shrink-0 w-[200px] rounded-xl bg-card border border-border p-3.5"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-xs mb-0.5">
                {t(`saasHome.audience.${key}.title`)}
              </h3>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {t(`saasHome.audience.${key}.description`)}
              </p>
            </div>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AUDIENCES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-base mb-1">
                {t(`saasHome.audience.${key}.title`)}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t(`saasHome.audience.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
});

AudienceSection.displayName = 'AudienceSection';
