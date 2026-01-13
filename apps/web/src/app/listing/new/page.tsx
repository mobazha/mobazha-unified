'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n } from '@mobazha/core';
import { CreateListingWizard } from '@/components/Listing';

/**
 * 创建商品页面 - 向导式体验
 */
function CreateListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // 获取克隆参数（如果有）
  const cloneSlug = searchParams.get('clone');

  const handleSuccess = (slug: string) => {
    router.push(`/product/${slug}`);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-8">
        <Container>
          {/* 页面标题栏 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/settings/store">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {cloneSlug
                    ? t('listing.cloneListing') || '克隆商品'
                    : t('listing.createListing') || '创建商品'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('listing.createListingDesc') || '添加新商品或服务到您的店铺'}
                </p>
              </div>
            </div>
          </div>

          {/* 向导式创建组件 */}
          <CreateListingWizard onSuccess={handleSuccess} />
        </Container>
      </main>
      <Footer />
    </>
  );
}

/**
 * 加载状态组件
 */
function LoadingState() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-8">
        <Container>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

/**
 * 创建商品页面
 */
export default function CreateListingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CreateListingContent />
    </Suspense>
  );
}
