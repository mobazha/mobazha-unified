'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  X,
  Tag,
  FolderTree,
  Gift,
  FileText,
  Loader2,
  Trash2,
  Settings2,
  Image as ImageIcon,
  Truck,
  Download,
  Eye,
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useListingForm,
  useListing,
  useI18n,
  useCurrency,
  useStoreCategories,
  getGatewayUrl,
  productsApi,
  convertProductToFormData,
  DEFAULT_LOCAL_CURRENCY,
} from '@mobazha/core';
import type { ContractType, Image, ShippingProfile, Product } from '@mobazha/core';

import {
  ProductTypeSelector,
  BasicInfoSection,
  MediaSection,
  RwaTokenFields,
  PhysicalGoodFields,
  VariantOptionEditor,
  VariantInventoryTable,
  CouponEditor,
  DigitalFileSection,
  ProcessingTimeSelect,
  ReturnPolicySelector,
} from '@/components/Listing';
import { TokenInput } from '@/components/ui/TokenInput';

// 左侧导航标签
type TabKey =
  | 'general'
  | 'photos'
  | 'tags'
  | 'category'
  | 'shipping'
  | 'variants'
  | 'files'
  | 'policies'
  | 'coupons'
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
  { key: 'category', labelKey: 'listing.tabs.category', icon: <FolderTree className="w-4 h-4" /> },
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
    key: 'policies',
    labelKey: 'listing.tabs.policies',
    icon: <FileText className="w-4 h-4" />,
    showFor: ['PHYSICAL_GOOD', 'DIGITAL_GOOD', 'SERVICE'],
  },
  {
    key: 'coupons',
    labelKey: 'listing.tabs.coupons',
    icon: <Gift className="w-4 h-4" />,
    showFor: ['PHYSICAL_GOOD', 'DIGITAL_GOOD', 'SERVICE'],
  },
  {
    key: 'other',
    labelKey: 'listing.tabs.other',
    icon: <Settings2 className="w-4 h-4" />,
    showFor: ['PHYSICAL_GOOD', 'DIGITAL_GOOD', 'SERVICE'],
  },
];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();
  const { toast } = useToast();

  // 加载现有商品数据
  const { listing, isLoading: isLoadingListing, error: loadError } = useListing(slug);

  // 转换 listing 数据为表单数据
  const initialFormData = useMemo(() => {
    if (!listing) return undefined;
    return convertProductToFormData(listing as Product);
  }, [listing]);

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
    addCoupon,
    updateCoupon,
    removeCoupon,
    validate,
    submit,
    submitDraft,
    reset,
  } = useListingForm(initialFormData);

  // 当 listing 数据加载完成后重置表单
  useEffect(() => {
    if (initialFormData) {
      reset(initialFormData);
    }
  }, [initialFormData, reset]);

  // 当前激活的标签
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 店铺已有分类（用于自动补全建议）
  const { categories: storeCategories } = useStoreCategories();

  // Section refs for scroll navigation
  const sectionRefs = useRef<Record<TabKey, HTMLDivElement | null>>({
    general: null,
    photos: null,
    tags: null,
    category: null,
    shipping: null,
    variants: null,
    files: null,
    policies: null,
    coupons: null,
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

  // 标签规范化函数
  const normalizeTag = useCallback((input: string) => {
    return input
      .trim()
      .toLowerCase()
      .replace(/#/g, '')
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  // 标签变化处理
  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      const added = newTags.filter(t => !formData.tags.includes(t));
      const removed = formData.tags.filter(t => !newTags.includes(t));
      added.forEach(t => addTag(t));
      removed.forEach(t => removeTag(t));
    },
    [formData.tags, addTag, removeTag]
  );

  // 分类变化处理
  const handleCategoriesChange = useCallback(
    (newCategories: string[]) => {
      updateField('categories', newCategories);
    },
    [updateField]
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

  // 提交表单（发布/更新）
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!validate()) {
        toast({
          title: t('common.error'),
          description: t('listing.validationFailed'),
          variant: 'destructive',
        });
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
        toast({
          title: t('common.success'),
          description: t('listing.updateSuccess'),
        });
        router.push('/profile');
      }
    },
    [validate, submit, toast, t, router]
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
      router.push('/profile');
    }
  }, [submitDraft, toast, t, router]);

  // 删除商品
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await productsApi.deleteListing(slug);
      toast({
        title: t('common.success'),
        description: t('listing.deleteSuccess'),
      });
      router.push('/profile');
    } catch {
      toast({
        title: t('common.error'),
        description: t('listing.deleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [slug, toast, t, router]);

  // 获取图片URL用于预览
  const getPreviewImageUrl = useCallback((image: Image) => {
    const hash = image.small || image.medium || image.original;
    if (!hash) return '';
    return `${getGatewayUrl()}/media/images/${hash}`;
  }, []);

  // 加载中状态
  if (isLoadingListing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-20">
          <Container>
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  // 加载错误
  if (loadError || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-20">
          <Container>
            <div className="flex flex-col items-center justify-center">
              <p className="text-destructive">{loadError || t('listing.notFound')}</p>
              <Button className="mt-4" onClick={() => router.push('/profile')}>
                {t('common.goBack')}
              </Button>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="listing-form-edit">
      <Header />

      <main className="py-6">
        <Container size="xl">
          {/* 页面头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/profile" className="p-2 hover:bg-muted rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('listing.editListing')}</h1>
                <p className="text-sm text-muted-foreground">{formData.title || slug}</p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(`/product/${slug}`, '_blank')}
                disabled={isSubmitting}
                data-testid="listing-form-preview"
              >
                <Eye className="w-4 h-4 mr-1" />
                {t('listing.previewProduct')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting || isDeleting}
                className="text-destructive hover:text-destructive"
                data-testid="listing-form-delete"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('common.delete')}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                data-testid="listing-form-cancel"
              >
                <X className="w-4 h-4 mr-1" />
                {t('common.cancel')}
              </Button>
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
                {t('listing.saveDraft')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="listing-form-publish"
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

          {/* 主体布局 - 与创建页面相同 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 左侧导航 - 桌面端 */}
            <div className="hidden lg:block lg:col-span-2">
              <div className="sticky top-24 space-y-1">
                {visibleTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => scrollToSection(tab.key)}
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
                          {t('listing.noImage')}
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
                  onPackageLengthChange={v => updateField('packageLength', v)}
                  onPackageWidthChange={v => updateField('packageWidth', v)}
                  onPackageHeightChange={v => updateField('packageHeight', v)}
                  onDimensionUnitChange={v => updateField('dimensionUnit', v)}
                  onBrandChange={v => updateField('brand', v)}
                  onBarcodeChange={v => {
                    const newSkus = [...formData.skus];
                    if (newSkus[0]) {
                      newSkus[0] = { ...newSkus[0], barcode: v };
                      updateField('skus', newSkus);
                    }
                  }}
                  errors={errors}
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
                    acceptedCurrencies={formData.acceptedCurrencies || ['ETHUSDT']}
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

              {/* 标签 */}
              <Card
                className="p-6"
                ref={el => {
                  sectionRefs.current.tags = el;
                }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-2">{t('listing.tags')}</h2>
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

              {/* 分类 */}
              <Card
                className="p-6"
                ref={el => {
                  sectionRefs.current.category = el;
                }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  {t('listing.category')}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">{t('listing.categoryDesc')}</p>
                <TokenInput
                  tokens={formData.categories}
                  onTokensChange={handleCategoriesChange}
                  suggestions={storeCategories}
                  placeholder={t('listing.enterCategory')}
                  createLabel={t('listing.createCategory')}
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
                >
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    {t('listing.variants.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">{t('listing.variantsDesc')}</p>

                  <VariantOptionEditor options={formData.options} onChange={updateVariantOptions} />

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

              {/* 数字文件 - 仅数字商品 */}
              {formData.contractType === 'DIGITAL_GOOD' && (
                <Card
                  className="p-6"
                  ref={el => {
                    sectionRefs.current.files = el;
                  }}
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    {t('listing.tabs.files')}
                  </h2>
                  <DigitalFileSection
                    files={formData.digitalFiles || []}
                    onFilesChange={files => updateField('digitalFiles', files)}
                  />
                </Card>
              )}

              {/* 退货政策和条款 */}
              {formData.contractType !== 'RWA_TOKEN' &&
                formData.contractType !== 'CRYPTOCURRENCY' && (
                  <Card
                    className="p-6"
                    ref={el => {
                      sectionRefs.current.policies = el;
                    }}
                  >
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {t('listing.policies')}
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                          {t('listing.returnPolicy')}
                        </label>
                        <ReturnPolicySelector
                          value={formData.refundPolicy}
                          onChange={(val: string) => updateField('refundPolicy', val)}
                          placeholder={t('listing.returnPolicyPlaceholder')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                          {t('listing.termsAndConditions')}
                        </label>
                        <textarea
                          value={formData.termsAndConditions}
                          onChange={e => updateField('termsAndConditions', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          placeholder={t('listing.termsPlaceholder')}
                        />
                      </div>
                    </div>
                  </Card>
                )}

              {/* 优惠券 - Shopify 风格 */}
              {formData.contractType !== 'RWA_TOKEN' &&
                formData.contractType !== 'CRYPTOCURRENCY' && (
                  <Card
                    className="p-6"
                    ref={el => {
                      sectionRefs.current.coupons = el;
                    }}
                  >
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      {t('listing.coupons')}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">{t('listing.couponsDesc')}</p>

                    <CouponEditor
                      coupons={formData.coupons}
                      onAdd={addCoupon}
                      onUpdate={updateCoupon}
                      onRemove={removeCoupon}
                      pricingCurrency={formData.pricingCurrency}
                    />
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
              <div className="h-20 lg:hidden" />
            </div>
          </div>
        </Container>
      </main>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('listing.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('listing.deleteConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              data-testid="listing-form-delete-confirm"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
