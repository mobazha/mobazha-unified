'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AuthGuard } from '@/components';
import { AdminSidebar, AdminHeader } from '@/components/admin';
import { AdminMobileBottomTabs } from '@/components/admin/AdminMobileBottomTabs';
import { AIChatPanel } from '@/components/AIChatPanel';
import { isStandalone } from '@mobazha/core';
import { getSetupStatus } from '@mobazha/core/services/api/system';

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayoutShell({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = useCallback(() => setCollapsed(prev => !prev), []);

  return (
    <div className="fixed inset-0 z-30 flex bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex shrink-0">
        <AdminSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader />

        <main className="flex-1 overflow-y-auto" role="main">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <AdminMobileBottomTabs />

      {/* AI Assistant floating panel */}
      <AIChatPanel />
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const standaloneMode = useMemo(() => isStandalone(), []);

  // Standalone first-run: bypass AuthGuard + AdminLayoutShell when setup is incomplete.
  // The StandaloneSetupWizard renders its own full-page layout.
  const [setupBypass, setSetupBypass] = useState<boolean | null>(standaloneMode ? null : false);

  useEffect(() => {
    if (!standaloneMode) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await getSetupStatus();
        if (!cancelled) setSetupBypass(!status.setupComplete);
      } catch {
        if (!cancelled) setSetupBypass(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [standaloneMode]);

  if (setupBypass === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (setupBypass) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AuthGuard>
  );
}
