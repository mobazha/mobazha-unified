'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useI18n, useUserStore, isStandalone, getImageUrl } from '@mobazha/core';
import { uploadAvatar } from '@mobazha/core/services/api/images';
import { createListing } from '@mobazha/core/services/api/products';
import { uploadProductImages } from '@mobazha/core/services/api/images';
import type { Image } from '@mobazha/core';
import {
  Store,
  ShoppingBag,
  Rocket,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Loader2,
  SkipForward,
  Camera,
  ImageIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AvatarCompat } from '@/components/ui/avatar-compat';

const STORAGE_KEY = 'sellerOnboardingDismissed';

export function isOnboardingDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function dismissOnboarding(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div
                className={`h-0.5 w-8 sm:w-12 transition-colors ${
                  isCompleted ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step}
              </div>
              <span
                className={`text-xs hidden sm:block ${
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {labels[i]}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:image\/\w+;base64,/, ''));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

function isProfileComplete(profile: ReturnType<typeof useUserStore>['profile']): boolean {
  if (!profile) return false;
  return Boolean(profile.name && profile.avatarHashes?.small);
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile, updateProfile } = useUserStore();

  const profileAlreadyComplete = useMemo(() => isProfileComplete(profile), [profile]);
  const [step, setStep] = useState(profileAlreadyComplete ? 2 : 1);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [storeName, setStoreName] = useState(profile?.name || '');
  const [shortDescription, setShortDescription] = useState(profile?.shortDescription || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImages, setProductImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  const standaloneMode = useMemo(() => isStandalone(), []);

  const stepLabels = [
    t('admin.onboarding.step1Label') || 'Store',
    t('admin.onboarding.step2Label') || 'Product',
    t('admin.onboarding.step3Label') || 'Launch',
  ];

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleProductImageAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setProductImages(prev => [...prev, ...files].slice(0, 5));
    const urls = files.map(f => URL.createObjectURL(f));
    setImagePreviews(prev => [...prev, ...urls].slice(0, 5));
    if (e.target) e.target.value = '';
  }, []);

  const removeProductImage = useCallback((index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleStep1Save = async () => {
    if (!storeName.trim()) {
      toast({
        title: t('admin.onboarding.nameRequired') || 'Store name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const saves: Promise<unknown>[] = [];

      saves.push(
        updateProfile({
          name: storeName.trim(),
          shortDescription: shortDescription.trim(),
        })
      );

      if (avatarFile) {
        saves.push(uploadAvatar(avatarFile));
      }

      await Promise.all(saves);
      setStep(2);
    } catch {
      toast({
        title: t('admin.onboarding.saveFailed') || 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Save = async () => {
    if (!productTitle.trim()) {
      toast({
        title: t('admin.onboarding.productTitleRequired') || 'Product title is required',
        variant: 'destructive',
      });
      return;
    }

    const price = parseFloat(productPrice);
    if (!price || price <= 0) {
      toast({
        title: t('admin.onboarding.priceRequired') || 'Valid price is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      let images: Image[] = [];

      if (productImages.length > 0) {
        const imageDataArray = await Promise.all(
          productImages.map(async file => ({
            filename: file.name,
            image: await fileToBase64(file),
          }))
        );
        images = await uploadProductImages(imageDataArray);
      }

      const result = await createListing({
        item: {
          title: productTitle.trim(),
          description: productDescription.trim(),
          price: Math.round(price * 100),
          images,
          condition: 'NEW',
          categories: [],
          tags: [],
        },
        metadata: {
          contractType: 'PHYSICAL_GOOD',
          pricingCurrency: { code: 'USD', divisibility: 2 },
        },
      } as Record<string, unknown>);

      if ('error' in result) {
        throw new Error(result.error);
      }

      setCreatedSlug(result.slug);
      setStep(3);
    } catch (err) {
      toast({
        title: t('admin.onboarding.productCreateFailed') || 'Failed to create product',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkipStep2 = () => {
    setStep(3);
  };

  const handleFinish = () => {
    dismissOnboarding();
    onComplete();
  };

  const storeUrl = profile?.peerID ? (standaloneMode ? '/' : `/store/${profile.peerID}`) : '/';

  return (
    <div className="max-w-2xl mx-auto" data-testid="seller-onboarding">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('admin.onboarding.title') || 'Set Up Your Store'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.onboarding.subtitle') || 'Get your store ready in a few simple steps'}
        </p>
      </div>

      <StepIndicator currentStep={step} totalSteps={3} labels={stepLabels} />

      {step === 1 && (
        <div className="bg-card rounded-xl border p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {t('admin.onboarding.step1Title') || 'Store Profile'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('admin.onboarding.step1Desc') || 'Tell buyers about your store'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div
              className="relative group cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={t('admin.onboarding.changeAvatar') || 'Change avatar'}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') avatarInputRef.current?.click();
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Store avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <AvatarCompat
                  src={profile?.avatarHashes ? getImageUrl(profile.avatarHashes.small) : undefined}
                  name={storeName}
                  size="xl"
                />
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {t('admin.onboarding.clickToUpload') || 'Click to upload avatar'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="store-name" className="block text-sm font-medium mb-1.5">
                {t('admin.onboarding.storeName') || 'Store Name'} *
              </label>
              <input
                id="store-name"
                type="text"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder={t('admin.onboarding.storeNamePlaceholder') || 'My Awesome Store'}
                maxLength={40}
              />
            </div>

            <div>
              <label htmlFor="store-desc" className="block text-sm font-medium mb-1.5">
                {t('admin.onboarding.storeDescription') || 'Short Description'}
              </label>
              <textarea
                id="store-desc"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={3}
                value={shortDescription}
                onChange={e => setShortDescription(e.target.value)}
                placeholder={
                  t('admin.onboarding.storeDescPlaceholder') ||
                  'Describe your store in a few words...'
                }
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {shortDescription.length}/160
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                dismissOnboarding();
                onSkip();
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <SkipForward className="w-3.5 h-3.5" />
              {t('admin.onboarding.skip') || 'Skip setup'}
            </button>
            <button
              onClick={handleStep1Save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t('admin.onboarding.next') || 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-card rounded-xl border p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {t('admin.onboarding.step2Title') || 'Create Your First Product'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('admin.onboarding.step2Desc') || 'Add a product to get started selling'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="product-title" className="block text-sm font-medium mb-1.5">
                {t('admin.onboarding.productTitle') || 'Product Title'} *
              </label>
              <input
                id="product-title"
                type="text"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={productTitle}
                onChange={e => setProductTitle(e.target.value)}
                placeholder={
                  t('admin.onboarding.productTitlePlaceholder') || 'e.g. Handmade Leather Wallet'
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('admin.onboarding.productImages') || 'Product Images'}
              </label>
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((url, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border group"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeProductImage(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <button
                    onClick={() => productImageInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[10px]">{t('admin.onboarding.addImage') || 'Add'}</span>
                  </button>
                )}
                <input
                  ref={productImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleProductImageAdd}
                />
              </div>
            </div>

            <div>
              <label htmlFor="product-price" className="block text-sm font-medium mb-1.5">
                {t('admin.onboarding.productPrice') || 'Price (USD)'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border bg-background pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={productPrice}
                  onChange={e => setProductPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="product-desc" className="block text-sm font-medium mb-1.5">
                {t('admin.onboarding.productDescription') || 'Description'}
              </label>
              <textarea
                id="product-desc"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={4}
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                placeholder={
                  t('admin.onboarding.productDescPlaceholder') || 'Describe your product...'
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {profileAlreadyComplete ? (
              <button
                onClick={() => {
                  dismissOnboarding();
                  onSkip();
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <SkipForward className="w-3.5 h-3.5" />
                {t('admin.onboarding.skip') || 'Skip setup'}
              </button>
            ) : (
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('admin.onboarding.back') || 'Back'}
              </button>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkipStep2}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('admin.onboarding.skipStep') || 'Skip this step'}
              </button>
              <button
                onClick={handleStep2Save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {t('admin.onboarding.createProduct') || 'Create Product'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-card rounded-xl border p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Rocket className="w-8 h-8 text-success" />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              {t('admin.onboarding.completeTitle') || 'Your Store is Ready!'}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {createdSlug
                ? t('admin.onboarding.completeDescWithProduct') ||
                  'Your store profile is set and your first product is live. Share your store link to start selling!'
                : t('admin.onboarding.completeDesc') ||
                  'Your store profile is set up. Add products anytime from the admin panel.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              {t('admin.onboarding.viewStore') || 'View Your Store'}
            </a>
            <button
              onClick={handleFinish}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t('admin.onboarding.goToDashboard') || 'Go to Dashboard'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
