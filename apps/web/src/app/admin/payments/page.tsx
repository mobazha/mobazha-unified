'use client';

import React, { useState, lazy, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, getAdminFinancePath, useFiatPaymentVisible } from '@mobazha/core';
import { ChevronDown, Wallet, CreditCard, Coins, ExternalLink } from 'lucide-react';
import { SettingsPageHeader, SettingsSection } from '@/components/SettingsLayout';

const CryptoReceivingSection = __OUTPOST__
  ? () => null
  : lazy(() =>
      import('./CryptoReceivingSection').then(m => ({ default: m.CryptoReceivingSection }))
    );

const PaymentProvidersSection = __OUTPOST__
  ? () => null
  : lazy(() =>
      import('./PaymentProvidersSection').then(m => ({ default: m.PaymentProvidersSection }))
    );

const GuestCheckoutPolicySection = lazy(() =>
  import('@/components/admin/policy/GuestCheckoutPolicySection').then(m => ({
    default: m.GuestCheckoutPolicySection,
  }))
);

const PaymentConfirmationSection = lazy(() =>
  import('@/components/admin/policy/PaymentConfirmationSection').then(m => ({
    default: m.PaymentConfirmationSection,
  }))
);

function PayoutInfoSection() {
  const { t } = useI18n();
  const fiatVisible = useFiatPaymentVisible();
  const [open, setOpen] = useState(false);

  const items = [
    ...(fiatVisible
      ? [
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
        ]
      : []),
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
        <span>{t('admin.payments.payoutInfoTitle')}</span>
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
  const fiatVisible = useFiatPaymentVisible();
  const router = useRouter();

  useEffect(() => {
    if (!__OUTPOST__) return;
    router.replace(getAdminFinancePath());
  }, [router]);

  if (__OUTPOST__) {
    return <div data-testid="admin-payments" className="min-h-[120px]" aria-busy="true" />;
  }

  const description = fiatVisible
    ? t('admin.payments.pageDesc')
    : t('admin.payments.pageDescCryptoOnly');

  return (
    <div data-testid="admin-payments">
      <SettingsPageHeader
        title={t('admin.nav.payments')}
        description={description}
        backHref="/admin"
      />

      <div className="divide-y divide-border">
        <Suspense fallback={<div className="h-40 animate-pulse bg-muted/30 rounded-xl" />}>
          <SettingsSection className="pb-6 md:pb-10">
            <CryptoReceivingSection />
          </SettingsSection>

          <SettingsSection
            className="py-6 md:py-10"
            title={t('admin.guestCheckout.title')}
            description={t('admin.guestCheckout.description')}
          >
            <GuestCheckoutPolicySection embedded />
          </SettingsSection>

          <SettingsSection
            className="py-6 md:py-10"
            title={t('admin.paymentPolicy.title')}
            description={t('admin.paymentPolicy.description')}
          >
            <PaymentConfirmationSection />
          </SettingsSection>

          {fiatVisible && (
            <SettingsSection className="py-6 md:py-10">
              <PaymentProvidersSection />
            </SettingsSection>
          )}

          <SettingsSection className="pt-6 md:pt-10">
            <PayoutInfoSection />
          </SettingsSection>
        </Suspense>
      </div>
    </div>
  );
}
