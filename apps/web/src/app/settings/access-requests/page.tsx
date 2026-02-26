'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AccessRequestsContent } from '@/components/SettingsContent/AccessRequestsContent';

export default function AccessRequestsPage() {
  const router = useRouter();

  return <AccessRequestsContent showBackButton onBack={() => router.back()} />;
}
