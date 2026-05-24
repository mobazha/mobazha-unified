'use client';

import React, { Suspense } from 'react';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Shield, Loader2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { ModeratorDirectoryView } from '@/components/Moderators/ModeratorDirectoryView';

function ModeratorsPageContent() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">{t('moderator.title')}</h1>
            </div>
            <p className="text-muted-foreground ml-13">{t('moderator.subtitle')}</p>
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
