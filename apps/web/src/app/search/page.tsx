'use client';

import React, { Suspense } from 'react';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { SearchMobile } from '@/components/Search/SearchMobile';
import { SearchDesktop } from '@/components/Search/SearchDesktop';
import { useBreakpoint } from '@mobazha/ui/hooks';

function SearchLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <Container size="xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

function SearchPageContent() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <SearchMobile />;
  }

  return <SearchDesktop />;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}
