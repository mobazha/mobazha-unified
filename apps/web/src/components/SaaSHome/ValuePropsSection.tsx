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
    <section className="py-8 sm:py-12 lg:py-16 bg-muted/30">
      <Container size="xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {VALUE_PROPS.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="rounded-xl bg-card border border-border p-4 sm:p-6 transition-colors hover:border-primary/30"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">
                {t(`saasHome.valueProps.${key}.title`)}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
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
