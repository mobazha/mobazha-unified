'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Loader2 } from 'lucide-react';
import { ModeratorDetailView } from '@/components/Moderators/ModeratorDetailView';

function ModeratorDetailPageContent() {
  const params = useParams();
  const peerID = typeof params.id === 'string' ? params.id : '';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <ModeratorDetailView peerID={peerID} />
      </main>
      <Footer />
    </div>
  );
}

export default function ModeratorDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ModeratorDetailPageContent />
    </Suspense>
  );
}
