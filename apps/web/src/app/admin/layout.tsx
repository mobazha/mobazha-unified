'use client';

import React, { useState, useCallback } from 'react';
import { AuthGuard } from '@/components';
import { AdminSidebar, AdminHeader } from '@/components/admin';
import { AdminMobileBottomTabs } from '@/components/admin/AdminMobileBottomTabs';

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
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthGuard>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AuthGuard>
  );
}
