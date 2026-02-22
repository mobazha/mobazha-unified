'use client';

import React from 'react';
import { Header, Footer, AuthGuard } from '@/components';
import { SettingsSidebar } from '@/components/SettingsSidebar';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayoutShell({ children }: SettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 flex">
        <aside className="hidden lg:block w-64 border-r border-border bg-card shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <SettingsSidebar />
        </aside>

        <main className="flex-1 min-w-0">
          <div className="max-w-[960px] px-4 sm:px-6 lg:px-10 py-6 lg:py-8">{children}</div>
        </main>
      </div>

      <div className="lg:hidden">
        <Footer />
      </div>
    </div>
  );
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <AuthGuard>
      <SettingsLayoutShell>{children}</SettingsLayoutShell>
    </AuthGuard>
  );
}
