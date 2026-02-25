'use client';

import React from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n } from '@mobazha/core';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Container size="sm">
          <VStack gap="lg" align="center" className="text-center">
            <div className="relative">
              <span className="text-[120px] sm:text-[160px] font-black text-muted-foreground/10 leading-none select-none">
                404
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Search className="w-10 h-10 text-primary" />
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {t('errors.notFound')}
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">{t('errors.notFoundDesc')}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button size="lg" asChild className="gap-2">
                <Link href="/">
                  <Home className="w-4 h-4" />
                  {t('nav.home')}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2">
                <Link href="/search">
                  <Search className="w-4 h-4" />
                  {t('nav.search')}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="gap-2"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.back')}
              </Button>
            </div>
          </VStack>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
