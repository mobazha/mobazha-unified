'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n, productDataService } from '@mobazha/core';
import type { Product, ContractType, ProductCondition, BlockchainNetwork } from '@mobazha/core';
import { CreateListingWizard } from '@/components/Listing';
import type { WizardFormData } from '@/components/Listing/wizard/types';

/**
 * 将商品数据转换为向导表单数据，用于克隆商品
 * 注意：会清除 rwaListingId 以确保克隆的商品会创建新的延迟 Listing
 */
function convertProductToFormData(product: Product): Partial<WizardFormData> {
  const item = product.item;
  const metadata = product.metadata;

  // 从 metadata 中提取 acceptedCurrencies（清除 rwaListingId）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadataAny = metadata as any;
  // 故意不复制 rwaListingId，确保克隆的商品会创建新的延迟 Listing
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { rwaListingId: _ignored, ...cleanMetadata } = metadataAny;

  return {
    // 商品类型
    contractType: cleanMetadata.contractType as ContractType,

    // RWA 相关
    blockchain: (item.blockchain as BlockchainNetwork) || 'ETH',
    tokenAddress: item.tokenAddress || '',
    tokenStandard: item.tokenStandard as WizardFormData['tokenStandard'],
    tokenId: '',
    slotId: '',
    cryptoListingCurrencyCode: item.cryptoListingCurrencyCode || '',
    acceptedCurrencies:
      cleanMetadata.acceptedCurrencies?.map((c: string | { code: string }) =>
        typeof c === 'string' ? c : c.code
      ) || [],
    minQuantity: item.minQuantity || 1,
    maxQuantity: item.maxQuantity || 100,
    rwaTradeMode: cleanMetadata.rwaTradeMode === 1 ? 'confirm_required' : 'instant',
    escrowTimeoutMinutes: Math.floor(
      (cleanMetadata.rwaEscrowTimeoutSeconds || cleanMetadata.escrowTimeoutSeconds || 86400) / 60
    ),

    // 基本信息
    title: item.title || '',
    description: item.description || '',
    price: item.price?.toString() || '',
    pricingCurrency: metadata.pricingCurrency?.code || 'USD',
    condition: (item.condition as ProductCondition) || 'NEW',
    grams: item.grams || 0,
    nsfw: item.nsfw || false,

    // 媒体
    images: item.images || [],
    introVideo: item.introVideo || '',

    // 物流
    shippingOptions: product.shippingOptions || [],

    // 标签和分类
    tags: item.tags || [],
    categories: item.categories || [],

    // 政策
    termsAndConditions: product.termsAndConditions || '',
    refundPolicy: product.refundPolicy || '',

    // 处理时间
    processingTime: item.processingTime || '',
  };
}

/**
 * 创建商品页面 - 向导式体验
 */
function CreateListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // 获取克隆参数（如果有）
  const cloneSlug = searchParams.get('clone');

  // 克隆数据状态
  const [cloneData, setCloneData] = useState<Partial<WizardFormData> | null>(null);
  const [isLoadingClone, setIsLoadingClone] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 加载克隆商品数据
  const loadCloneData = useCallback(async (slug: string) => {
    setIsLoadingClone(true);
    setLoadError(null);
    try {
      const product = await productDataService.getProduct(slug);
      if (product) {
        const formData = convertProductToFormData(product);
        setCloneData(formData);
      } else {
        setLoadError('商品不存在或无法访问');
      }
    } catch (error) {
      console.error('加载克隆商品失败:', error);
      setLoadError(error instanceof Error ? error.message : '加载商品失败');
    } finally {
      setIsLoadingClone(false);
    }
  }, []);

  // 当有 cloneSlug 时加载数据
  useEffect(() => {
    if (cloneSlug) {
      loadCloneData(cloneSlug);
    }
  }, [cloneSlug, loadCloneData]);

  const handleSuccess = useCallback(
    (slug: string) => {
      router.push(`/product/${slug}`);
    },
    [router]
  );

  // 合并初始数据
  const initialData = useMemo(() => {
    return cloneData || undefined;
  }, [cloneData]);

  // 如果正在加载克隆数据，显示加载状态
  if (cloneSlug && isLoadingClone) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-muted/30 py-8">
          <Container>
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                {t('listing.loadingCloneData') || '正在加载商品数据...'}
              </p>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  // 如果加载克隆数据失败，显示错误
  if (cloneSlug && loadError) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-muted/30 py-8">
          <Container>
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-destructive mb-4">{loadError}</p>
              <Link href="/settings/store">
                <Button variant="outline">{t('common.back') || '返回'}</Button>
              </Link>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

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
          <CreateListingWizard initialData={initialData} onSuccess={handleSuccess} />
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
