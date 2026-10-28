// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';

import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';

/**
 * 中文帮助页的外壳。
 *
 * 与 `/help` 的 layout 保持同样的结构，但不使用需要 i18n 与平台上下文的
 * `MobilePageHeader`：中文页的语言由 URL 前缀决定，不应该受浏览器语言影响。
 */
export default function ZhHelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="zh-Hans" className="min-h-screen bg-background">
      <Header />
      <main className="py-8 sm:py-12 pb-24 sm:pb-12">
        <Container size="md">
          <article>{children}</article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
