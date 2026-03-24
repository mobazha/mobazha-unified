'use client';

import React from 'react';
import { Shield, Database, Coins, Zap } from 'lucide-react';
import { Container } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

const VALUE_PROPS = [
  { icon: Shield, key: 'buyerProtection' as const },
  { icon: Database, key: 'selfHosted' as const },
  { icon: Coins, key: 'lowFees' as const },
  { icon: Zap, key: 'cryptoNative' as const },
];

export const ValuePropsSection: React.FC = React.memo(() => {
  const { t } = useI18n();

  return (
    <section className="py-5 sm:py-12 lg:py-16 bg-muted/30">
      <Container size="xl">
        {/* Mobile: compact 2x2 */}
        <div className="grid grid-cols-2 gap-2.5 sm:hidden">
          {VALUE_PROPS.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-start gap-2.5 rounded-lg bg-card border border-border p-3"
            >
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-xs leading-tight">
                  {t(`saasHome.valueProps.${key}.title`)}
                </h3>
                <p className="text-muted-foreground text-[10px] leading-snug mt-0.5 line-clamp-2">
                  {t(`saasHome.valueProps.${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: full cards */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUE_PROPS.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="rounded-xl bg-card border border-border p-6 transition-colors hover:border-primary/30"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-base mb-1">
                {t(`saasHome.valueProps.${key}.title`)}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t(`saasHome.valueProps.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
});

ValuePropsSection.displayName = 'ValuePropsSection';
