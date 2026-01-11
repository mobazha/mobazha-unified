'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { AccessRequestsContent } from '@/components/SettingsContent/AccessRequestsContent';

export default function AccessRequestsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container className="max-w-4xl">
          <AccessRequestsContent showBackButton onBack={() => router.back()} />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
