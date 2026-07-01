'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container } from '@/components/layouts';
import {
  EXCHANGE_USDT_PAYMENT_HELP_PATH,
  useI18n,
  isExchangeUsdtPaymentGuideLocale,
} from '@mobazha/core';
import { MessageCircle, FileText, ExternalLink, ChevronRight, Wallet } from 'lucide-react';

interface SupportItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

function SupportItem({ icon, title, description, href, external }: SupportItemProps) {
  const content = (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-0">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {external ? (
        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
      ) : (
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      )}
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
}

export default function SupportPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const showExchangeUsdtHelp = isExchangeUsdtPaymentGuideLocale(locale);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('me.support')} onBack={() => router.push('/me')} />

      <main className="py-4 sm:py-8">
        <Container size="md">
          <h1 className="text-2xl font-bold hidden lg:block mb-6">{t('me.support')}</h1>

          <div className="bg-card rounded-lg border overflow-hidden">
            {showExchangeUsdtHelp && (
              <SupportItem
                icon={<Wallet className="w-5 h-5" />}
                title={t('support.exchangeUsdtPayment')}
                description={t('support.exchangeUsdtPaymentDesc')}
                href={EXCHANGE_USDT_PAYMENT_HELP_PATH}
              />
            )}
            <SupportItem
              icon={<FileText className="w-5 h-5" />}
              title={t('support.documentation')}
              description={t('support.documentationDesc')}
              href="https://mobazha.org"
              external
            />
            <SupportItem
              icon={<MessageCircle className="w-5 h-5" />}
              title={t('support.community')}
              description={t('support.communityDesc')}
              href="https://t.me/OpenBazaarGroup"
              external
            />
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
