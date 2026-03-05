'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  Tags,
} from 'lucide-react';
import { useI18n, useCurrency, getGatewayUrl, DEFAULT_LOCAL_CURRENCY } from '@mobazha/core';
import type { ContractType, Image, ShippingProfile, Coupon } from '@mobazha/core';
import type { ListingFormData, FormErrors, VariantOption, SkuItem } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  AiImageGeneratePanel,
  AiSetupPrompt,
} from '@/components/Listing';
import { TokenInput } from '@/components/ui/TokenInput';
import { cn } from '@/lib/utils';

type WizardStep = 'essentials' | 'media' | 'details' | 'review';

const STEPS: WizardStep[] = ['essentials', 'media', 'details', 'review'];

interface MobileListingWizardProps {
  formData: ListingFormData;
  errors: FormErrors;
  isSubmitting: boolean;
  isEditMode?: boolean;

  updateField: <K extends keyof ListingFormData>(key: K, value: ListingFormData[K]) => void;
  changeContractType: (type: ContractType) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  updateVariantOptions: (options: VariantOption[]) => void;
  updateSkus: (skus: SkuItem[]) => void;
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (index: number, coupon: Coupon) => void;
  removeCoupon: (index: number) => void;
  validate: () => boolean;

  onSubmit: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onPreview?: () => void;

  aiLoadingAction?: string | null;
  onAiImproveTitle?: () => void;
  onAiPolishDescription?: () => void;
  onAiSuggestTags?: () => void;
  aiImageUrls?: string[];
  aiNotConfigured?: boolean;
  onAiApplyAll?: (result: import('@mobazha/core').AiGenerateResponse) => void;
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = React.useId();

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={`accordion-${id}`}
        className="w-full flex items-center justify-between px-4 py-3 bg-card text-left"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div id={`accordion-${id}`} role="region" className="px-4 pb-4 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function MobileListingWizard({
  formData,
  errors,
  isSubmitting,
  isEditMode = false,
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
  onSubmit,
  onSaveDraft,
  onCancel,
  onDelete,
  onPreview,
  aiLoadingAction,
  onAiImproveTitle,
  onAiPolishDescription,
  onAiSuggestTags,
  aiImageUrls,
  aiNotConfigured,
  onAiApplyAll,
}: MobileListingWizardProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const [currentStep, setCurrentStep] = useState<WizardStep>('essentials');

  const currentIndex = STEPS.indexOf(currentStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === STEPS.length - 1;

  const stepLabels: Record<WizardStep, string> = useMemo(
    () => ({
      essentials: t('listing.mobile.stepEssentials'),
      media: t('listing.mobile.stepMedia'),
      details: t('listing.mobile.stepDetails'),
      review: t('listing.mobile.stepReview'),
    }),
    [t]
  );

  const validateStep = useCallback((): boolean => {
    if (currentStep === 'essentials') {
      if (!formData.title.trim()) {
        validate();
        return false;
      }
      if (formData.contractType !== 'RWA_TOKEN' && !formData.price) {
        validate();
        return false;
      }
    }
    return true;
  }, [currentStep, formData.title, formData.price, formData.contractType, validate]);

  const goNext = useCallback(() => {
    if (!isLastStep && validateStep()) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  }, [currentIndex, isLastStep, validateStep]);

  const goPrev = useCallback(() => {
    if (!isFirstStep) setCurrentStep(STEPS[currentIndex - 1]);
  }, [currentIndex, isFirstStep]);

  const handleSubmit = useCallback(() => {
    if (!validate()) {
      const stepForError: [keyof FormErrors, WizardStep][] = [
        ['title', 'essentials'],
        ['price', 'essentials'],
        ['images', 'media'],
        ['shipping', 'details'],
      ];
      const firstErrorStep = stepForError.find(([key]) => errors[key])?.[1] || 'essentials';
      setCurrentStep(firstErrorStep);
      return;
    }
    onSubmit();
  }, [validate, onSubmit, errors]);

  const normalizeTag = useCallback((input: string) => {
    return input
      .trim()
      .toLowerCase()
      .replace(/#/g, '')
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      const added = newTags.filter(tg => !formData.tags.includes(tg));
      const removed = formData.tags.filter(tg => !newTags.includes(tg));
      added.forEach(tg => addTag(tg));
      removed.forEach(tg => removeTag(tg));
    },
    [formData.tags, addTag, removeTag]
  );

  const handleImagesChange = useCallback(
    (images: Image[]) => updateField('images', images),
    [updateField]
  );
  const handleVideoChange = useCallback(
    (video: string) => updateField('introVideo', video),
    [updateField]
  );
  const handleAltVideoLinksChange = useCallback(
    (links: string[]) => updateField('altIntroVideoLinks', links),
    [updateField]
  );
  const handleShippingProfileChange = useCallback(
    (profile: ShippingProfile | null) => updateField('shippingProfile', profile || undefined),
    [updateField]
  );

  const getPreviewImageUrl = useCallback((image: Image) => {
    const hash = image.small || image.medium || image.original;
    if (!hash) return '';
    return `${getGatewayUrl()}/media/images/${hash}`;
  }, []);

  const reviewChecklist = useMemo(() => {
    const items: { label: string; done: boolean }[] = [
      { label: t('listing.title'), done: formData.title.trim().length > 0 },
      { label: t('listing.price'), done: formData.price !== '' && formData.price !== '0' },
      { label: t('listing.photos'), done: formData.images.length > 0 },
      { label: t('listing.tags'), done: formData.tags.length > 0 },
      { label: t('listing.productType'), done: !!formData.productType },
    ];
    if (formData.contractType === 'PHYSICAL_GOOD') {
      items.push({
        label: t('listing.tabs.shipping'),
        done: !!formData.shippingProfile,
      });
    }
    if (formData.contractType === 'RWA_TOKEN') {
      items.push(
        {
          label: t('listing.tokenAddress', { defaultValue: 'Token Address' }),
          done: !!formData.tokenAddress?.trim(),
        },
        {
          label: t('listing.blockchain', { defaultValue: 'Blockchain' }),
          done: !!formData.blockchain,
        }
      );
    }
    return items;
  }, [formData, t]);

  return (
    <div
      className="fixed inset-0 bg-muted/30 flex flex-col z-50"
      data-testid="mobile-listing-wizard"
    >
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <button
            type="button"
            onClick={isFirstStep ? onCancel : goPrev}
            className="flex items-center gap-1 text-sm text-muted-foreground min-w-[44px] min-h-[44px] justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            {isFirstStep ? t('common.cancel') : t('common.back')}
          </button>

          <span className="text-sm font-medium text-foreground">
            {isEditMode ? t('listing.editListing') : t('listing.createListing')}
          </span>

          <div className="min-w-[44px]">
            {isEditMode && onPreview && (
              <button
                type="button"
                onClick={onPreview}
                aria-label={t('listing.preview', { defaultValue: 'Preview listing' })}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`${stepLabels[currentStep]} (${currentIndex + 1}/${STEPS.length})`}
          className="flex gap-1 px-4 pb-2"
        >
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= currentIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
        <div className="px-4 pb-2">
          <span className="text-xs text-muted-foreground">
            {t('listing.mobile.stepOf', {
              current: currentIndex + 1,
              total: STEPS.length,
            })}{' '}
            &middot; {stepLabels[currentStep]}
          </span>
        </div>
      </header>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Step 1: Essentials */}
        {currentStep === 'essentials' && (
          <>
            <Card className="p-4">
              <h2 className="text-base font-semibold text-foreground mb-3">
                {t('listing.productType')}
              </h2>
              <ProductTypeSelector
                value={formData.contractType}
                onChange={changeContractType}
                disabled={isSubmitting}
              />
            </Card>

            {formData.contractType !== 'RWA_TOKEN' ? (
              <>
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
                  onAiImproveTitle={onAiImproveTitle}
                  onAiPolishDescription={onAiPolishDescription}
                  aiLoadingAction={aiLoadingAction}
                />
              </>
            ) : (
              <>
                <Card className="p-4">
                  <h2 className="text-base font-semibold text-foreground mb-3">
                    {t('listing.basicInfo')}
                  </h2>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        {t('listing.title')} <span className="text-destructive">*</span>
                      </label>
                      <input
                        value={formData.title}
                        onChange={e => updateField('title', e.target.value)}
                        placeholder={t('listing.titlePlaceholder')}
                        maxLength={140}
                        className={cn(
                          'w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm',
                          errors.title ? 'border-destructive' : 'border-border'
                        )}
                      />
                      {errors.title && (
                        <p className="text-destructive text-xs mt-1">{errors.title}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        {t('listing.description')}
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={e => updateField('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm resize-none"
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
          </>
        )}

        {/* Step 2: Media */}
        {currentStep === 'media' && (
          <div className="space-y-4">
            <MediaSection
              images={formData.images}
              introVideo={formData.introVideo}
              altIntroVideoLinks={formData.altIntroVideoLinks}
              onImagesChange={handleImagesChange}
              onVideoChange={handleVideoChange}
              onAltVideoLinksChange={handleAltVideoLinksChange}
              errors={errors}
            />

            {aiNotConfigured && <AiSetupPrompt />}

            {aiImageUrls && aiImageUrls.length > 0 && !aiNotConfigured && onAiApplyAll && (
              <AiImageGeneratePanel
                imageUrls={aiImageUrls}
                contractType={formData.contractType}
                onApply={onAiApplyAll}
              />
            )}
          </div>
        )}

        {/* Step 3: Details (accordion sections) */}
        {currentStep === 'details' && (
          <div className="space-y-3">
            <AccordionItem title={t('listing.tags')} defaultOpen>
              <TokenInput
                tokens={formData.tags}
                onTokensChange={handleTagsChange}
                placeholder={t('listing.enterTag')}
                prefix="#"
                normalize={normalizeTag}
                tokenClassName="bg-primary/10 text-primary"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{t('listing.tagsHelper')}</p>
                {onAiSuggestTags && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-sm h-11 px-3 sm:text-xs sm:h-7 sm:px-2"
                    onClick={onAiSuggestTags}
                    disabled={aiLoadingAction === 'suggest_tags'}
                  >
                    {aiLoadingAction === 'suggest_tags' ? (
                      <Loader2 className="w-4 h-4 sm:w-3 sm:h-3 mr-1 animate-spin" />
                    ) : (
                      <Tags className="w-4 h-4 sm:w-3 sm:h-3 mr-1 text-purple-500" />
                    )}
                    {t('ai.suggestTags', { defaultValue: 'AI Suggest' })}
                  </Button>
                )}
              </div>
            </AccordionItem>

            <AccordionItem title={t('listing.productType')}>
              <Input
                value={formData.productType}
                onChange={e => updateField('productType', e.target.value)}
                placeholder={t('listing.productTypePlaceholder')}
              />
            </AccordionItem>

            {formData.contractType === 'PHYSICAL_GOOD' && (
              <AccordionItem title={t('listing.tabs.shipping')}>
                <PhysicalGoodFields
                  shippingProfile={formData.shippingProfile}
                  onShippingProfileChange={handleShippingProfileChange}
                />
              </AccordionItem>
            )}

            {formData.contractType === 'PHYSICAL_GOOD' && (
              <AccordionItem title={t('listing.tabs.variants')}>
                <VariantOptionEditor options={formData.options} onChange={updateVariantOptions} />
                {formData.options.length > 0 && (
                  <div className="mt-3">
                    <VariantInventoryTable
                      skus={formData.skus}
                      onChange={updateSkus}
                      pricingCurrency={formData.pricingCurrency}
                      basePrice={formData.price}
                      productImages={formData.images}
                    />
                  </div>
                )}
              </AccordionItem>
            )}

            {formData.contractType === 'DIGITAL_GOOD' && (
              <AccordionItem title={t('listing.tabs.files')}>
                <DigitalFileSection
                  files={formData.digitalFiles}
                  onFilesChange={files => updateField('digitalFiles', files)}
                />
              </AccordionItem>
            )}

            {formData.contractType !== 'RWA_TOKEN' &&
              formData.contractType !== 'CRYPTOCURRENCY' && (
                <>
                  <AccordionItem title={t('listing.tabs.coupons')}>
                    <CouponEditor
                      coupons={formData.coupons}
                      onAdd={addCoupon}
                      onUpdate={updateCoupon}
                      onRemove={removeCoupon}
                      pricingCurrency={formData.pricingCurrency}
                    />
                  </AccordionItem>

                  <AccordionItem title={t('listing.tabs.other')}>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        {t('listing.processingTime')}
                      </label>
                      <ProcessingTimeSelect
                        value={formData.processingTime}
                        onChange={val => updateField('processingTime', val)}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
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
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          formData.inventoryPolicy === 'continue' ? 'bg-primary' : 'bg-muted'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            formData.inventoryPolicy === 'continue'
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  </AccordionItem>
                </>
              )}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div className="space-y-4">
            {/* Preview card */}
            <Card className="overflow-hidden">
              <div className="aspect-[16/10] bg-muted relative">
                {formData.images[0] ? (
                  <img
                    src={getPreviewImageUrl(formData.images[0])}
                    alt={
                      formData.title || t('listing.productImage', { defaultValue: 'Product image' })
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Eye className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground text-lg line-clamp-2">
                  {formData.title || t('listing.productTitle')}
                </h3>
                <p className="text-primary font-bold text-xl mt-1">
                  {formData.price
                    ? formatPrice(
                        Number(formData.price),
                        formData.pricingCurrency || DEFAULT_LOCAL_CURRENCY
                      )
                    : formatPrice(0, formData.pricingCurrency || DEFAULT_LOCAL_CURRENCY)}
                </p>
                {formData.shortDescription && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {formData.shortDescription}
                  </p>
                )}
              </div>
            </Card>

            {/* Checklist */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {t('listing.mobile.readinessCheck')}
              </h3>
              <div className="space-y-2">
                {reviewChecklist.map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span
                      className={cn(
                        'text-sm',
                        item.done ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Edit mode: delete */}
            {isEditMode && onDelete && (
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={onDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('listing.deleteListing')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 bg-background border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {isLastStep ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onSaveDraft}
              disabled={isSubmitting}
            >
              {t('listing.saveDraft')}
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              {isEditMode ? t('listing.save') : t('listing.publish')}
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onSaveDraft}
              disabled={isSubmitting}
            >
              {t('listing.saveDraft')}
            </Button>
            <Button className="flex-1" onClick={goNext}>
              {t('common.next')}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileListingWizard;
