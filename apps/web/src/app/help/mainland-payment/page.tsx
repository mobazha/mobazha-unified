'use client';

import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { getExchangeC2CGuideUrls, useI18n } from '@mobazha/core';
import { VStack } from '@/components/layouts';

const NETWORK_ROW_KEYS = ['bsc', 'sol', 'base', 'matic', 'eth'] as const;

export default function MainlandPaymentHelpPage() {
  const { t, locale } = useI18n();
  const exchangeUrls = getExchangeC2CGuideUrls(locale);

  const exchangeLinks = [
    { key: 'okx' as const, href: exchangeUrls.okx },
    { key: 'binance' as const, href: exchangeUrls.binance },
    { key: 'htx' as const, href: exchangeUrls.htx },
  ];

  const faqKeys = ['trc20', 'okxBsc', 'kyc', 'refund'] as const;

  return (
    <VStack gap="lg">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('help.mainlandPayment.title')}
        </h1>
        <p className="text-muted-foreground">{t('help.mainlandPayment.intro')}</p>
      </div>

      <ol className="space-y-6 list-none m-0 p-0">
        {[1, 2, 3].map(step => (
          <li key={step} className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground m-0">
              {t(`help.mainlandPayment.step${step}Title`)}
            </h2>
            <p className="text-sm text-muted-foreground m-0">
              {t(`help.mainlandPayment.step${step}Desc`)}
            </p>
            {step === 2 && (
              <div
                className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-100/80 dark:bg-amber-900/30 dark:border-amber-700/60 p-3"
                role="note"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-800 dark:text-amber-200 mt-0.5" />
                <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed m-0">
                  {t('help.mainlandPayment.trc20Warning')}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground m-0">
          {t('help.mainlandPayment.networkTableTitle')}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left font-medium p-3">
                  {t('help.mainlandPayment.networkTableHeaders.mobazha')}
                </th>
                <th className="text-left font-medium p-3">
                  {t('help.mainlandPayment.networkTableHeaders.okx')}
                </th>
                <th className="text-left font-medium p-3">
                  {t('help.mainlandPayment.networkTableHeaders.binance')}
                </th>
                <th className="text-left font-medium p-3">
                  {t('help.mainlandPayment.networkTableHeaders.htx')}
                </th>
              </tr>
            </thead>
            <tbody>
              {NETWORK_ROW_KEYS.map(rowKey => (
                <tr key={rowKey} className="border-b border-border last:border-0">
                  <td className="p-3 align-top">
                    {t(`help.mainlandPayment.networkRows.${rowKey}.mobazha`)}
                  </td>
                  <td className="p-3 align-top text-muted-foreground">
                    {t(`help.mainlandPayment.networkRows.${rowKey}.okx`)}
                  </td>
                  <td className="p-3 align-top text-muted-foreground">
                    {t(`help.mainlandPayment.networkRows.${rowKey}.binance`)}
                  </td>
                  <td className="p-3 align-top text-muted-foreground">
                    {t(`help.mainlandPayment.networkRows.${rowKey}.htx`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground m-0">
          {t('help.mainlandPayment.exchangeGuidesTitle')}
        </h2>
        <div className="flex flex-col gap-2">
          {exchangeLinks.map(link => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline min-h-[44px]"
            >
              {t(`help.mainlandPayment.links.${link.key}`)}
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground m-0">
          {t('help.mainlandPayment.faqTitle')}
        </h2>
        <dl className="space-y-4 m-0">
          {faqKeys.map(key => (
            <div key={key}>
              <dt className="font-medium text-foreground text-sm">
                {t(`help.mainlandPayment.faq.${key}Q`)}
              </dt>
              <dd className="text-sm text-muted-foreground mt-1 m-0">
                {t(`help.mainlandPayment.faq.${key}A`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
        <h2 className="text-base font-semibold text-foreground m-0">
          {t('help.mainlandPayment.custodialTitle')}
        </h2>
        <p className="text-sm text-muted-foreground m-0">
          {t('help.mainlandPayment.custodialDesc')}
        </p>
      </section>

      <p className="text-xs text-muted-foreground leading-relaxed m-0">
        {t('help.mainlandPayment.disclaimer')}
      </p>
    </VStack>
  );
}
