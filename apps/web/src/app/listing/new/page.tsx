'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  X,
  Eye,
  Tag,
  FolderTree,
  Gift,
  FileText,
  Loader2,
  Image as ImageIcon,
  Settings2,
  Truck,
  Download,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  LayoutList,
} from 'lucide-react';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useListingForm,
  useI18n,
  useCurrency,
  getImageUrl,
  productDataService,
  convertProductToFormData,
  DEFAULT_LOCAL_CURRENCY,
} from '@mobazha/core';
import type { ContractType, Image, ShippingProfile, ListingFormData } from '@mobazha/core';

import {
  ProductTypeSelector,
  BasicInfoSection,
  MediaSection,
  RwaTokenFields,
  PhysicalGoodFields,
  VariantOptionEditor,
  VariantInventoryTable,
  ProcessingTimeSelect,
  AiImageGeneratePanel,
  AiAssistButton,
  AiSetupPrompt,
  useListingAiIntegration,
  MobileListingWizard,
} from '@/components/Listing';
import { TokenInput } from '@/components/ui/TokenInput';
import { useIsMobile } from '@/hooks/useMediaQuery';

// ─── 左侧导航标签定义 ───────────────────────────

type TabKey =
  | 'general'
  | 'photos'
  | 'tags'
  | 'productType'
  | 'shipping'
  | 'variants'
  | 'files'
  | 'other';

interface TabItem {
  key: TabKey;
  labelKey: string;
  icon: React.ReactNode;
  showFor?: ContractType[];
}

const tabs: TabItem[] = [
  { key: 'general', labelKey: 'listing.tabs.general', icon: <FileText className="w-4 h-4" /> },
  { key: 'photos', labelKey: 'listing.tabs.photos', icon: <ImageIcon className="w-4 h-4" /> },
  { key: 'tags', labelKey: 'listing.tabs.tags', icon: <Tag className="w-4 h-4" /> },
  {
    key: 'productType',
    labelKey: 'listing.tabs.productType',
    icon: <FolderTree className="w-4 h-4" />,
  },
  {
    key: 'shipping',
    labelKey: 'listing.tabs.shipping',
    icon: <Truck className="w-4 h-4" />,
    showFor: ['PHYSICAL_GOOD'],
  },
  {
    key: 'variants',
    labelKey: 'listing.tabs.variants',
    icon: <Gift className="w-4 h-4" />,
    showFor: ['PHYSICAL_GOOD'],
  },
  {
    key: 'files',
    labelKey: 'listing.tabs.files',
    icon: <Download className="w-4 h-4" />,
    showFor: ['DIGITAL_GOOD'],
  },
  {
    key: 'other',
    labelKey: 'listing.tabs.other',
    icon: <Settings2 className="w-4 h-4" />,
    showFor: ['PHYSICAL_GOOD', 'DIGITAL_GOOD', 'SERVICE'],
  },
];

// ─── 主要内容组件 ─────────────────────────────────

function CreateListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const { toast } = useToast();

  // URL 参数
  const cloneSlug = searchParams.get('clone');
  const fromParam = searchParams.get('from');
  const fromOnboarding = fromParam === 'onboarding';
  const fromAdmin = fromParam === 'admin';
  const returnToDashboard = fromOnboarding || fromAdmin;

  // 克隆数据加载状态
  const [cloneData, setCloneData] = useState<Partial<ListingFormData> | null>(null);
  const [isLoadingClone, setIsLoadingClone] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 发布成功状态
  const [publishSuccessSlug, setPublishSuccessSlug] = useState<string | null>(null);

  // 加载克隆商品数据
  const loadCloneData = useCallback(
    async (slug: string) => {
      setIsLoadingClone(true);
      setLoadError(null);
      try {
        const product = await productDataService.getProduct(slug);
        if (product) {
          const formData = convertProductToFormData(product, { isClone: true });
          setCloneData(formData);
        } else {
          setLoadError(t('listing.cloneNotFound'));
        }
      } catch (error) {
        console.error('Failed to load clone data:', error);
        setLoadError(error instanceof Error ? error.message : t('listing.cloneFailed'));
      } finally {
        setIsLoadingClone(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (cloneSlug) {
      loadCloneData(cloneSlug);
    }
  }, [cloneSlug, loadCloneData]);

  // 初始表单数据
  const initialData = useMemo(() => cloneData || undefined, [cloneData]);

  // 使用 useListingForm hook
  const {
    formData,
    errors,
    isSubmitting,
    updateField,
    changeContractType,
    addTag,
    removeTag,
    updateVariantOptions,
    updateSkus,
    validate,
    submit,
    submitDraft,
    reset,
  } = useListingForm(initialData);

  // 当克隆数据加载完成后重置表单
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // 当前激活的标签
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  // 移动端检测
  const isMobile = useIsMobile();

  // AI 助手
  const {
    aiLoadingAction,
    aiNotConfigured,
    aiImageUrls,
    handleAiImproveTitle,
    handleAiPolishDescription,
    handleAiSuggestTags,
    handleAiApplyAll,
  } = useListingAiIntegration({ formData, updateField, addTag });

  // Section refs for scroll navigation
  const sectionRefs = useRef<Record<TabKey, HTMLDivElement | null>>({
    general: null,
    photos: null,
    tags: null,
    productType: null,
    shipping: null,
    variants: null,
    files: null,
    other: null,
  });

  // 根据商品类型过滤显示的标签
  const visibleTabs = useMemo(() => {
    return tabs.filter(tab => {
      if (!tab.showFor) return true;
      return tab.showFor.includes(formData.contractType);
    });
  }, [formData.contractType]);

  // 滚动到指定区域
  const scrollToSection = useCallback((key: TabKey) => {
    setActiveTab(key);
    const ref = sectionRefs.current[key];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // 标签规范化函数（小写、空格转连字符、去除 #）
  const normalizeTag = useCallback((input: string) => {
    return input
      .trim()
      .toLowerCase()
      .replace(/#/g, '')
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  // 标签变化处理（通过 addTag/removeTag 保持与 useListingForm 同步）
  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      // 找出新增的标签
      const added = newTags.filter(t => !formData.tags.includes(t));
      // 找出被移除的标签
      const removed = formData.tags.filter(t => !newTags.includes(t));
      added.forEach(t => addTag(t));
      removed.forEach(t => removeTag(t));
    },
    [formData.tags, addTag, removeTag]
  );

  // 处理图片变化
  const handleImagesChange = useCallback(
    (images: Image[]) => {
      updateField('images', images);
    },
    [updateField]
  );

  // 处理视频变化
  const handleVideoChange = useCallback(
    (video: string) => {
      updateField('introVideo', video);
    },
    [updateField]
  );

  // 处理外部视频链接变化
  const handleAltVideoLinksChange = useCallback(
    (links: string[]) => {
      updateField('altIntroVideoLinks', links);
    },
    [updateField]
  );

  // 处理配送档案变化
  const handleShippingProfileChange = useCallback(
    (profile: ShippingProfile | null) => {
      updateField('shippingProfile', profile || undefined);
    },
    [updateField]
  );

  // 提交表单（发布）
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      // Phase 1.0: digital products require a draft first so the seller can
      // attach files / links / license keys via the edit page (which has a
      // listingSlug). Direct publish from /listing/new would create an empty
      // shell with no deliverables.
      if (formData.contractType === 'DIGITAL_GOOD') {
        toast({
          title: t('listing.digital.saveFirstTitle'),
          description: t('listing.digital.publishBlockedToast'),
          variant: 'destructive',
        });
        return;
      }

      if (!validate()) {
        toast({
          title: t('common.error'),
          description: t('listing.validationFailed'),
          variant: 'destructive',
        });
        // 滚动到第一个错误字段
        return;
      }

      const result = await submit();

      if ('error' in result) {
        toast({
          title: t('common.error'),
          description: result.error,
          variant: 'destructive',
        });
      } else {
        if (fromOnboarding) {
          toast({
            title: t('common.success'),
            description: t('listing.createSuccess'),
          });
          router.push('/admin?onboarding=complete');
        } else {
          setPublishSuccessSlug(result.slug);
        }
      }
    },
    [validate, submit, toast, t, router, returnToDashboard, formData.contractType]
  );

  // 保存草稿
  const handleSaveDraft = useCallback(async () => {
    const result = await submitDraft();

    if ('error' in result) {
      toast({
        title: t('common.error'),
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('listing.draftSaved'),
      });
      router.push(returnToDashboard ? '/admin' : '/admin/products');
    }
  }, [submitDraft, toast, t, router, returnToDashboard]);

  // 获取图片URL用于预览（支持外部 CDN URL 和内部 hash）
  const getPreviewImageUrl = useCallback((image: Image) => {
    const hash = image.small || image.medium || image.original;
    if (!hash) return '';
    return getImageUrl(hash) || '';
  }, []);

  // ─── 加载状态 ─────────────────────────────────

  if (cloneSlug && isLoadingClone) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-muted/30 py-8">
          <Container>
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{t('listing.loadingCloneData')}</p>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  if (cloneSlug && loadError) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-muted/30 py-8">
          <Container>
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-destructive mb-4">{loadError}</p>
              <Link href="/admin/products">
                <Button variant="outline">{t('common.back')}</Button>
              </Link>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  // ─── 移动端分步向导 ─────────────────────────────

  if (isMobile) {
    return (
      <>
        <MobileListingWizard
          formData={formData}
          errors={errors}
          isSubmitting={isSubmitting}
          updateField={updateField}
          changeContractType={changeContractType}
          addTag={addTag}
          removeTag={removeTag}
          updateVariantOptions={updateVariantOptions}
          updateSkus={updateSkus}
          validate={validate}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onCancel={() => (returnToDashboard ? router.push('/admin') : router.back())}
          aiLoadingAction={aiLoadingAction}
          onAiImproveTitle={handleAiImproveTitle}
          onAiPolishDescription={handleAiPolishDescription}
          onAiSuggestTags={handleAiSuggestTags}
          aiImageUrls={aiImageUrls}
          aiNotConfigured={aiNotConfigured}
          onAiApplyAll={handleAiApplyAll}
        />
        <Dialog open={!!publishSuccessSlug} onOpenChange={() => setPublishSuccessSlug(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center items-center">
              <CheckCircle2 className="w-12 h-12 text-success mb-2" />
              <DialogTitle>{t('listing.publishSuccess.title')}</DialogTitle>
              <DialogDescription>{t('listing.publishSuccess.description')}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={() => {
                  router.push(`/product/${publishSuccessSlug}`);
                  setPublishSuccessSlug(null);
                }}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('listing.publishSuccess.viewProduct')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPublishSuccessSlug(null);
                  reset();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {t('listing.publishSuccess.createAnother')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  router.push(returnToDashboard ? '/admin' : '/admin/products');
                  setPublishSuccessSlug(null);
                }}
                className="w-full"
              >
                <LayoutList className="w-4 h-4 mr-2" />
                {returnToDashboard
                  ? t('listing.publishSuccess.backToDashboard')
                  : t('admin.products.title')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ─── 桌面端主要渲染 ─────────────────────────────

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-6" data-testid="listing-form-new">
        <Container size="xl">
          {/* 页面头部 */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div className="flex items-center gap-2 lg:gap-3">
              <Link
                href={returnToDashboard ? '/admin' : '/admin/products'}
                className="p-2 hover:bg-muted rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold text-foreground">
                  {cloneSlug ? t('listing.cloneListing') : t('listing.createListing')}
                </h1>
                <p className="text-sm text-muted-foreground hidden lg:block">
                  {t('listing.createListingDesc')}
                </p>
              </div>
            </div>

            {/* Desktop action buttons - hidden on mobile (mobile has fixed bottom bar) */}
            <div className="hidden lg:flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                data-testid="listing-form-cancel"
              >
                <X className="w-4 h-4 mr-1" />
                {t('common.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                data-testid="listing-form-save-draft"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {t('listing.saveDraft')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || formData.contractType === 'DIGITAL_GOOD'}
                data-testid="listing-form-publish"
                title={
                  formData.contractType === 'DIGITAL_GOOD'
                    ? t('listing.digital.publishBlockedToast')
                    : undefined
                }
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {t('listing.publish')}
              </Button>
            </div>
          </div>

          {/* 主体布局 - 左侧导航 + 右侧表单 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 左侧导航 - 桌面端 */}
            <div className="hidden lg:block lg:col-span-2">
              <div className="sticky top-24 space-y-1">
                {visibleTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => scrollToSection(tab.key)}
                    data-testid={`listing-form-tab-${tab.key}`}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                      ${
                        activeTab === tab.key
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                    `}
                  >
                    {tab.icon}
                    {t(tab.labelKey)}
                  </button>
                ))}

                {/* 预览卡片 */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    {t('listing.preview')}
                  </h3>
                  <Card className="overflow-hidden">
                    <div className="aspect-square bg-muted">
                      {formData.images[0] ? (
                        <img
                          src={getPreviewImageUrl(formData.images[0])}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          <Eye className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-foreground text-sm line-clamp-2">
                        {formData.title || t('listing.productTitle')}
                      </h4>
                      <p className="text-primary font-bold mt-1">
                        {formData.price
                          ? formatCurrencyPrice(
                              formData.price,
                              formData.pricingCurrency || DEFAULT_LOCAL_CURRENCY
                            )
                          : formatCurrencyPrice(
                              0,
                              formData.pricingCurrency || DEFAULT_LOCAL_CURRENCY
                            )}
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* 主内容区域 */}
            <div className="lg:col-span-10 space-y-6">
              {/* 商品类型选择 */}
              <Card
                className="p-6"
                ref={el => {
                  sectionRefs.current.general = el;
                }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {t('listing.productType')}
                </h2>
                <ProductTypeSelector
                  value={formData.contractType}
                  onChange={changeContractType}
                  disabled={isSubmitting}
                  data-testid="listing-form-type-selector"
                />
              </Card>

              {/* 基础信息 - 非 RWA Token */}
              {formData.contractType !== 'RWA_TOKEN' && (
                <BasicInfoSection
                  title={formData.title}
                  shortDescription={formData.shortDescription}
                  description={formData.description}
                  price={formData.price}
                  compareAtPrice={formData.compareAtPrice}
                  pricingCurrency={formData.pricingCurrency}
                  contractType={formData.contractType}
                  condition={formData.condition}
                  grams={formData.grams}
                  weightUnit={formData.weightUnit}
                  barcode={formData.skus[0]?.barcode}
                  onTitleChange={v => updateField('title', v)}
                  onShortDescriptionChange={v => updateField('shortDescription', v)}
                  onDescriptionChange={v => updateField('description', v)}
                  onPriceChange={v => updateField('price', v)}
                  onCompareAtPriceChange={v => updateField('compareAtPrice', v)}
                  onCurrencyChange={v => updateField('pricingCurrency', v)}
                  onConditionChange={v => updateField('condition', v)}
                  onGramsChange={v => updateField('grams', v)}
                  onWeightUnitChange={v => updateField('weightUnit', v)}
                  packageLength={formData.packageLength}
                  packageWidth={formData.packageWidth}
                  packageHeight={formData.packageHeight}
                  dimensionUnit={formData.dimensionUnit}
                  brand={formData.brand}
                  productType={formData.productType}
                  onPackageLengthChange={v => updateField('packageLength', v)}
                  onPackageWidthChange={v => updateField('packageWidth', v)}
                  onPackageHeightChange={v => updateField('packageHeight', v)}
                  onDimensionUnitChange={v => updateField('dimensionUnit', v)}
                  onBrandChange={v => updateField('brand', v)}
                  onProductTypeChange={v => updateField('productType', v)}
                  onBarcodeChange={v => {
                    const newSkus = [...formData.skus];
                    if (newSkus[0]) {
                      newSkus[0] = { ...newSkus[0], barcode: v };
                      updateField('skus', newSkus);
                    }
                  }}
                  errors={errors}
                  onAiImproveTitle={handleAiImproveTitle}
                  onAiPolishDescription={handleAiPolishDescription}
                  aiLoadingAction={aiLoadingAction}
                />
              )}

              {/* RWA Token 专用字段 */}
              {formData.contractType === 'RWA_TOKEN' && (
                <>
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {t('listing.basicInfo')}
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                          {t('listing.title')} <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={formData.title}
                          onChange={e => updateField('title', e.target.value)}
                          placeholder={t('listing.titlePlaceholder')}
                          maxLength={140}
                          className={errors.title ? 'border-destructive' : ''}
                        />
                        {errors.title && (
                          <p className="text-destructive text-sm mt-1">{errors.title}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                          {t('listing.description')}
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={e => updateField('description', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          placeholder={t('listing.descriptionPlaceholder')}
                        />
                      </div>
                    </div>
                  </Card>

                  <RwaTokenFields
                    blockchain={formData.blockchain || 'ETH'}
                    tokenAddress={formData.tokenAddress}
                    cryptoListingCurrencyCode={formData.cryptoListingCurrencyCode}
                    price={formData.price}
                    pricingCurrency={formData.pricingCurrency}
                    minQuantity={formData.minQuantity || 1}
                    maxQuantity={formData.maxQuantity || 100}
                    acceptedCurrencies={formData.acceptedCurrencies || []}
                    onBlockchainChange={v => updateField('blockchain', v)}
                    onTokenAddressChange={v => updateField('tokenAddress', v)}
                    onCryptoListingCurrencyCodeChange={v =>
                      updateField('cryptoListingCurrencyCode', v)
                    }
                    onPriceChange={v => updateField('price', v)}
                    onPricingCurrencyChange={v => updateField('pricingCurrency', v)}
                    onMinQuantityChange={v => updateField('minQuantity', v)}
                    onMaxQuantityChange={v => updateField('maxQuantity', v)}
                    onAcceptedCurrenciesChange={v => updateField('acceptedCurrencies', v)}
                    errors={errors}
                  />
                </>
              )}

              {/* 图片/视频上传 */}
              <div
                ref={el => {
                  sectionRefs.current.photos = el;
                }}
              >
                <MediaSection
                  images={formData.images}
                  introVideo={formData.introVideo}
                  altIntroVideoLinks={formData.altIntroVideoLinks}
                  onImagesChange={handleImagesChange}
                  onVideoChange={handleVideoChange}
                  onAltVideoLinksChange={handleAltVideoLinksChange}
                  errors={errors}
                />
              </div>

              {/* AI 未配置引导 */}
              {aiNotConfigured && <AiSetupPrompt />}

              {/* AI 从图片生成 */}
              {aiImageUrls.length > 0 && !aiNotConfigured && (
                <AiImageGeneratePanel
                  imageUrls={aiImageUrls}
                  contractType={formData.contractType}
                  onApply={handleAiApplyAll}
                />
              )}

              {/* 标签 */}
              <Card
                className="p-6"
                ref={el => {
                  sectionRefs.current.tags = el;
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-foreground">{t('listing.tags')}</h2>
                  {formData.title.length > 0 && (
                    <AiAssistButton
                      onClick={handleAiSuggestTags}
                      isLoading={aiLoadingAction === 'suggest_tags'}
                      label={t('ai.suggestTags', { defaultValue: 'AI Suggest' })}
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{t('listing.tagsDesc')}</p>
                <TokenInput
                  tokens={formData.tags}
                  onTokensChange={handleTagsChange}
                  placeholder={t('listing.enterTag')}
                  prefix="#"
                  normalize={normalizeTag}
                  tokenClassName="bg-primary/10 text-primary"
                />
                <p className="text-xs text-muted-foreground mt-2">{t('listing.tagsHelper')}</p>
              </Card>

              {/* Product Type */}
              <Card
                className="p-6"
                ref={el => {
                  sectionRefs.current.productType = el;
                }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  {t('listing.productType')}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('listing.productTypeHelper')}
                </p>
                <Input
                  value={formData.productType}
                  onChange={e => updateField('productType', e.target.value)}
                  placeholder={t('listing.productTypePlaceholder')}
                />
              </Card>

              {/* 物流选项 - 仅物理商品 */}
              {formData.contractType === 'PHYSICAL_GOOD' && (
                <div
                  ref={el => {
                    sectionRefs.current.shipping = el;
                  }}
                >
                  <PhysicalGoodFields
                    shippingProfile={formData.shippingProfile}
                    onShippingProfileChange={handleShippingProfileChange}
                    errors={errors}
                  />
                </div>
              )}

              {/* 变体管理 - 仅物理商品 */}
              {formData.contractType === 'PHYSICAL_GOOD' && (
                <Card
                  className="p-6"
                  ref={el => {
                    sectionRefs.current.variants = el;
                  }}
                  data-testid="variants-section"
                >
                  <h2
                    className="text-lg font-semibold text-foreground mb-1"
                    data-testid="variants-title"
                  >
                    {t('listing.variants.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">{t('listing.variantsDesc')}</p>

                  {/* 变体选项编辑器 */}
                  <VariantOptionEditor options={formData.options} onChange={updateVariantOptions} />

                  {/* 变体库存表格 - 有 SKU 时显示 */}
                  {formData.skus.length > 0 && formData.skus[0]?.selections?.length > 0 && (
                    <VariantInventoryTable
                      skus={formData.skus}
                      onChange={updateSkus}
                      pricingCurrency={formData.pricingCurrency}
                      basePrice={formData.price}
                      productImages={formData.images}
                      className="mt-6"
                    />
                  )}
                </Card>
              )}

              {/* 数字商品 — 在新建页只展示流程提示，资产挂载发生在编辑页 (Phase 1.0)。
                  在没有 listingSlug 之前，DigitalAssetsManagerSection 无法挂载真实资产，
                  避免发布"空壳"商品。*/}
              {formData.contractType === 'DIGITAL_GOOD' && (
                <Card
                  className="p-6"
                  ref={el => {
                    sectionRefs.current.files = el;
                  }}
                >
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    {t('listing.digital.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('listing.digital.description')}
                  </p>
                  <div
                    className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-foreground"
                    role="note"
                    data-testid="listing-digital-save-first-hint"
                  >
                    <p className="font-medium mb-1">{t('listing.digital.saveFirstTitle')}</p>
                    <p className="text-muted-foreground">{t('listing.digital.saveFirst')}</p>
                  </div>
                </Card>
              )}

              {/* 其他设置 - 处理时间 */}
              {formData.contractType !== 'RWA_TOKEN' &&
                formData.contractType !== 'CRYPTOCURRENCY' && (
                  <Card
                    className="p-6"
                    ref={el => {
                      sectionRefs.current.other = el;
                    }}
                  >
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {t('listing.tabs.other')}
                    </h2>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                        {t('listing.processingTime')}
                      </label>
                      <ProcessingTimeSelect
                        value={formData.processingTime}
                        onChange={(val: string) => updateField('processingTime', val)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('listing.processingTimeHelper')}
                      </p>
                    </div>
                    {/* 库存策略 */}
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          {t('listing.inventoryPolicy.label')}
                        </label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('listing.inventoryPolicy.helper')}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.inventoryPolicy === 'continue'}
                        onClick={() =>
                          updateField(
                            'inventoryPolicy',
                            formData.inventoryPolicy === 'continue' ? 'deny' : 'continue'
                          )
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.inventoryPolicy === 'continue' ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.inventoryPolicy === 'continue'
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </Card>
                )}

              {/* 底部间距 */}
              <div className="h-6" />
            </div>
          </div>
        </Container>
      </main>
      <Footer />

      {/* Publish Success Dialog */}
      <Dialog open={!!publishSuccessSlug} onOpenChange={() => setPublishSuccessSlug(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center">
            <CheckCircle2 className="w-12 h-12 text-success mb-2" />
            <DialogTitle>{t('listing.publishSuccess.title')}</DialogTitle>
            <DialogDescription>{t('listing.publishSuccess.description')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => {
                router.push(`/product/${publishSuccessSlug}`);
                setPublishSuccessSlug(null);
              }}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('listing.publishSuccess.viewProduct')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPublishSuccessSlug(null);
                reset();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {t('listing.publishSuccess.createAnother')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                router.push(returnToDashboard ? '/admin' : '/admin/products');
                setPublishSuccessSlug(null);
              }}
              className="w-full"
            >
              <LayoutList className="w-4 h-4 mr-2" />
              {returnToDashboard
                ? t('listing.publishSuccess.backToDashboard')
                : t('admin.products.title')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 加载状态组件 ───────────────────────────────────

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

// ─── 页面入口 ──────────────────────────────────────

export default function CreateListingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CreateListingContent />
    </Suspense>
  );
}
