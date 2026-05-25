'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Shield, Loader2, ChevronLeft } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { ModeratorDirectoryView } from '@/components/Moderators/ModeratorDirectoryView';
import { resolveModeratorBackNav } from '@/lib/routes/moderators';

function ModeratorsPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const fromStoreFlow = searchParams.get('intent') === 'add-to-store';
  const backNav = resolveModeratorBackNav(searchParams);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {fromStoreFlow && (
            <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={backNav.href}
                    className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t(backNav.labelKey)}
                  </Link>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t('moderator.addToStoreBanner')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">{t('moderator.title')}</h1>
            </div>
            <p className="text-muted-foreground max-w-3xl">{t('moderator.subtitle')}</p>
          </div>
        </Container>

        <ModeratorDirectoryView />
      </main>

      <Footer />
    </div>
  );
}

export default function ModeratorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ModeratorsPageContent />
    </Suspense>
  );
}
