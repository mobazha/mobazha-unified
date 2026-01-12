'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Trash2,
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
import { useListingForm, useListing, useI18n, getGatewayUrl, productsApi } from '@mobazha/core';
import type {
  ContractType,
  BlockchainNetwork,
  Image,
  ShippingOption,
  ListingFormData,
} from '@mobazha/core';

import {
  ProductTypeSelector,
  BasicInfoSection,
  MediaSection,
  RwaTokenFields,
  PhysicalGoodFields,
} from '@/components/Listing';

// 左侧导航标签
type TabKey =
  | 'general'
  | 'photos'
  | 'tags'
  | 'category'
  | 'shipping'
  | 'variants'
  | 'policies'
  | 'coupons';

interface TabItem {
  key: TabKey;
  labelKey: string;
  icon: React.ReactNode;
  showFor?: ContractType[];
}

const tabs: TabItem[] = [
  { key: 'general', labelKey: 'listing.tabs.general', icon: <FileText className="w-4 h-4" /> },
  { key: 'photos', labelKey: 'listing.tabs.photos', icon: <Eye className="w-4 h-4" /> },
  { key: 'tags', labelKey: 'listing.tabs.tags', icon: <Tag className="w-4 h-4" /> },
  { key: 'category', labelKey: 'listing.tabs.category', icon: <FolderTree className="w-4 h-4" /> },
  {
    key: 'shipping',
    labelKey: 'listing.tabs.shipping',
    icon: <Gift className="w-4 h-4" />,
    showFor: ['PHYSICAL_GOOD'],
  },
  {
    key: 'variants',
    labelKey: 'listing.tabs.variants',
    icon: <Gift className="w-4 h-4" />,
    showFor: ['PHYSICAL_GOOD'],
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
];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useI18n();
  const { toast } = useToast();

  // 加载现有商品数据
  const { listing, isLoading: isLoadingListing, error: loadError } = useListing(slug);

  // 转换 listing 数据为表单数据
  const initialFormData = useMemo(() => {
    if (!listing) return undefined;

    return {
      slug: listing.slug,
      title: listing.item.title,
      description: listing.item.description,
      price: listing.item.price?.toString() || '',
      pricingCurrency: listing.metadata.pricingCurrency?.code || 'USD',
      contractType: listing.metadata.contractType,
      condition: listing.item.condition,
      grams: listing.item.grams,
      blockchain: listing.item.blockchain as BlockchainNetwork,
      tokenAddress: listing.item.tokenAddress,
      cryptoListingCurrencyCode: listing.item.cryptoListingCurrencyCode,
      minQuantity: listing.item.minQuantity,
      maxQuantity: listing.item.maxQuantity,
      acceptedCurrencies: listing.metadata.acceptedCurrencies,
      images: listing.item.images || [],
      introVideo: listing.item.introVideo,
      altIntroVideoLinks: listing.item.altIntroVideoLinks,
      tags: listing.item.tags || [],
      categories: listing.item.categories || [],
      shippingOptions: listing.shippingOptions || [],
      termsAndConditions: listing.termsAndConditions || '',
      refundPolicy: listing.refundPolicy || '',
      nsfw: listing.item.nsfw || false,
      processingTime: listing.item.processingTime || '',
    } as Partial<ListingFormData>;
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
    validate,
    submit,
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
  const [currentTag, setCurrentTag] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Section refs for scroll navigation
  const sectionRefs = useRef<Record<TabKey, HTMLDivElement | null>>({
    general: null,
    photos: null,
    tags: null,
    category: null,
    shipping: null,
    variants: null,
    policies: null,
    coupons: null,
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

  // 处理标签添加
  const handleAddTag = useCallback(() => {
    if (currentTag.trim()) {
      addTag(currentTag.trim());
      setCurrentTag('');
    }
  }, [currentTag, addTag]);

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

  // 处理物流选项变化
  const handleShippingOptionsChange = useCallback(
    (options: ShippingOption[]) => {
      updateField('shippingOptions', options);
    },
    [updateField]
  );

  // 处理选中的物流选项变化
  const handleSelectedShippingOptionsChange = useCallback(
    (selected: string[]) => {
      updateField('selectedShippingOptions', selected);
    },
    [updateField]
  );

  // 提交表单
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        toast({
          title: t('common.error') || 'Error',
          description: t('listing.validationFailed') || 'Please fix the errors before submitting',
          variant: 'destructive',
        });
        return;
      }

      const result = await submit();

      if ('error' in result) {
        toast({
          title: t('common.error') || 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('common.success') || 'Success',
          description: t('listing.updateSuccess') || 'Listing updated successfully!',
        });
        router.push('/profile');
      }
    },
    [validate, submit, toast, t, router]
  );

  // 删除商品
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await productsApi.deleteListing(slug);
      toast({
        title: t('common.success') || 'Success',
        description: t('listing.deleteSuccess') || 'Listing deleted successfully!',
      });
      router.push('/profile');
    } catch {
      toast({
        title: t('common.error') || 'Error',
        description: t('listing.deleteFailed') || 'Failed to delete listing',
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
    return `${getGatewayUrl()}/ob/images/${hash}`;
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
              <p className="mt-4 text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
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
              <p className="text-destructive">
                {loadError || t('listing.notFound') || 'Listing not found'}
              </p>
              <Button className="mt-4" onClick={() => router.push('/profile')}>
                {t('common.goBack') || 'Go Back'}
              </Button>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                <h1 className="text-2xl font-bold text-foreground">
                  {t('listing.editListing') || 'Edit Listing'}
                </h1>
                <p className="text-sm text-muted-foreground">{formData.title || slug}</p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting || isDeleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('common.delete') || 'Delete'}
              </Button>
              <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                <X className="w-4 h-4 mr-1" />
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {t('common.save') || 'Save'}
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
                    {t(tab.labelKey) || tab.key}
                  </button>
                ))}

                {/* 预览卡片 */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    {t('listing.preview') || 'Preview'}
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
                          {t('listing.noImage') || 'No image'}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-foreground text-sm line-clamp-2">
                        {formData.title || t('listing.productTitle') || 'Product Title'}
                      </h4>
                      <p className="text-primary font-bold mt-1">
                        {formData.price
                          ? `${formData.pricingCurrency === 'USD' ? '$' : formData.pricingCurrency + ' '}${formData.price}`
                          : '$0.00'}
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
                  {t('listing.productType') || 'Product Type'}
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
                  description={formData.description}
                  price={formData.price}
                  pricingCurrency={formData.pricingCurrency}
                  contractType={formData.contractType}
                  condition={formData.condition}
                  grams={formData.grams}
                  nsfw={formData.nsfw}
                  onTitleChange={v => updateField('title', v)}
                  onDescriptionChange={v => updateField('description', v)}
                  onPriceChange={v => updateField('price', v)}
                  onCurrencyChange={v => updateField('pricingCurrency', v)}
                  onConditionChange={v => updateField('condition', v)}
                  onGramsChange={v => updateField('grams', v)}
                  onNsfwChange={v => updateField('nsfw', v)}
                  errors={errors}
                />
              )}

              {/* RWA Token 专用字段 */}
              {formData.contractType === 'RWA_TOKEN' && (
                <>
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {t('listing.basicInfo') || 'Basic Information'}
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                          {t('listing.title') || 'Title'}{' '}
                          <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={formData.title}
                          onChange={e => updateField('title', e.target.value)}
                          placeholder={t('listing.titlePlaceholder') || 'Enter a descriptive title'}
                          maxLength={140}
                          className={errors.title ? 'border-destructive' : ''}
                        />
                        {errors.title && (
                          <p className="text-destructive text-sm mt-1">{errors.title}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                          {t('listing.description') || 'Description'}
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={e => updateField('description', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          placeholder={
                            t('listing.descriptionPlaceholder') || 'Describe your listing...'
                          }
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
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {t('listing.tags') || 'Tags'}
                </h2>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={currentTag}
                    onChange={e => setCurrentTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder={t('listing.enterTag') || 'Enter #tags...'}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    {t('common.add') || 'Add'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </Card>

              {/* 分类 */}
              <Card
                className="p-6"
                ref={el => {
                  sectionRefs.current.category = el;
                }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {t('listing.category') || 'Category'}
                </h2>
                <Input
                  value={formData.categories[0] || ''}
                  onChange={e => updateField('categories', e.target.value ? [e.target.value] : [])}
                  placeholder={t('listing.enterCategory') || 'Enter a category...'}
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
                    shippingOptions={formData.shippingOptions}
                    selectedShippingOptions={formData.selectedShippingOptions || []}
                    onShippingOptionsChange={handleShippingOptionsChange}
                    onSelectedShippingOptionsChange={handleSelectedShippingOptionsChange}
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
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    {t('listing.variants') || 'Variants'}
                  </h2>
                  <Button type="button" variant="outline">
                    {t('listing.addVariant') || 'Add Variant'}
                  </Button>
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
                      {t('listing.policies') || 'Return Policy & Terms'}
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                          {t('listing.returnPolicy') || 'Return Policy'}
                        </label>
                        <textarea
                          value={formData.refundPolicy}
                          onChange={e => updateField('refundPolicy', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          placeholder={
                            t('listing.returnPolicyPlaceholder') || 'Enter your return policy...'
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                          {t('listing.termsAndConditions') || 'Terms and Conditions'}
                        </label>
                        <textarea
                          value={formData.termsAndConditions}
                          onChange={e => updateField('termsAndConditions', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          placeholder={
                            t('listing.termsPlaceholder') || 'Enter terms and conditions...'
                          }
                        />
                      </div>
                    </div>
                  </Card>
                )}

              {/* 优惠券 */}
              {formData.contractType !== 'RWA_TOKEN' &&
                formData.contractType !== 'CRYPTOCURRENCY' && (
                  <Card
                    className="p-6"
                    ref={el => {
                      sectionRefs.current.coupons = el;
                    }}
                  >
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {t('listing.coupons') || 'Coupons'}
                    </h2>
                    <Button type="button" variant="outline">
                      {t('listing.addCoupon') || 'Add Coupon'}
                    </Button>
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
            <DialogTitle>{t('listing.deleteConfirmTitle') || 'Delete Listing?'}</DialogTitle>
            <DialogDescription>
              {t('listing.deleteConfirmDesc') ||
                'This action cannot be undone. This will permanently delete your listing.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              {t('common.delete') || 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
