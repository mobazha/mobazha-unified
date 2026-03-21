'use client';

import React, { useState } from 'react';
import { useI18n } from '@mobazha/core';
import { ChevronDown, Wallet, CreditCard, Coins, ExternalLink } from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { CryptoReceivingSection } from './CryptoReceivingSection';
import { PaymentProvidersSection } from '../integrations/PaymentProvidersSection';

function PayoutInfoSection() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const items = [
    {
      icon: <CreditCard className="w-4 h-4 text-[#6772e5]" />,
      label: 'Stripe',
      text: t('fiat.payoutInfoStripe'),
      link: 'https://dashboard.stripe.com/settings/payouts',
    },
    {
      icon: <Wallet className="w-4 h-4 text-[#0070ba]" />,
      label: 'PayPal',
      text: t('fiat.payoutInfoPaypal'),
      link: 'https://www.paypal.com/myaccount/money/',
    },
    {
      icon: <Coins className="w-4 h-4 text-amber-500" />,
      label: 'Crypto',
      text: t('fiat.payoutInfoCrypto'),
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 rounded-xl transition-colors"
      >
        <span>{t('fiat.payoutInfoTitle')}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {items.map(item => (
            <div key={item.label} className="flex gap-3">
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.text}</p>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  >
                    {t('fiat.payoutInfoLearnMore')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPaymentsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-payments">
      <SettingsPageHeader
        title={t('admin.settings.payments')}
        description={t('admin.settings.paymentsDesc')}
        backHref="/admin/settings"
      />

      <div className="space-y-6 md:space-y-10">
        <CryptoReceivingSection />

        <div className="border-t border-border" />

        <PaymentProvidersSection />

        <PayoutInfoSection />
      </div>
    </div>
  );
}
