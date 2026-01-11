'use client';

import React from 'react';
import { Header, Footer, AuthGuard } from '@/components';
import { SettingsSidebar } from '@/components/SettingsSidebar';
import { Container } from '@/components/layouts';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <div className="flex-1 flex">
          {/* 桌面端侧边栏 */}
          <aside className="hidden lg:block w-64 border-r border-border bg-card shrink-0 sticky top-0 h-screen overflow-y-auto">
            <SettingsSidebar />
          </aside>

          {/* 内容区 */}
          <main className="flex-1 min-w-0">
            <Container size="lg" className="py-6 lg:py-8">
              {children}
            </Container>
          </main>
        </div>

        {/* 移动端显示 Footer */}
        <div className="lg:hidden">
          <Footer />
        </div>
      </div>
    </AuthGuard>
  );
}
