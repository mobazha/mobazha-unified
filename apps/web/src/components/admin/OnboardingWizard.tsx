'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useI18n,
  useUserStore,
  isStandalone,
  getImageUrl,
  useReceivingAccounts,
} from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';
import { uploadAvatar } from '@mobazha/core/services/api/images';
import { createProfile as apiCreateProfile } from '@mobazha/core/services/api/profile';
import {
  Store,
  ShoppingBag,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  SkipForward,
  Layers,
  Truck,
  Wand2,
  Palette,
  Coins,
  Wallet,
  CircleCheck,
  ShieldCheck,
  Globe,
  Zap,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import CountryCurrencySelector from './CountryCurrencySelector';

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
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  return (
    <div className="mb-4 sm:mb-8">
      {/* Mobile: linear progress bar */}
      <div className="sm:hidden space-y-3">
        <div className="flex justify-between text-xs">
          {labels.map((label, i) => {
            const step = i + 1;
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            return (
              <span
                key={step}
                className={
                  isCompleted
                    ? 'text-primary font-medium'
                    : isActive
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                }
              >
                {label}
              </span>
            );
          })}
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Desktop: circle step indicator */}
      <div className="hidden sm:flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <React.Fragment key={step}>
              {i > 0 && (
                <div
                  className={`h-0.5 w-12 transition-colors ${
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
                  className={`text-xs ${
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
    </div>
  );
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.name && profile.avatarHashes?.small);
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, updateProfile, updateSettings } = useUserStore();

  const standaloneMode = useMemo(() => isStandalone(), []);

  const { data: receivingAccounts } = useReceivingAccounts();
  const hasPayment = useMemo(
    () => Array.isArray(receivingAccounts) && receivingAccounts.some(a => a.isActive !== false),
    [receivingAccounts]
  );

  const TOTAL_STEPS = 4;
  const profileAlreadyComplete = useMemo(() => isProfileComplete(profile), [profile]);
  const cameFromOnboarding = searchParams.get('onboarding') === 'complete';
  const isFirstTimeSetup = !standaloneMode && profile?.vendor !== true;

  const initialStep = useMemo(() => {
    if (cameFromOnboarding) return hasPayment ? 4 : 3;
    if (isFirstTimeSetup) return 0;
    if (profileAlreadyComplete) return 2;
    return 1;
  }, [cameFromOnboarding, hasPayment, isFirstTimeSetup, profileAlreadyComplete]);
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    if (cameFromOnboarding) {
      router.replace('/admin');
    }
  }, [cameFromOnboarding, router]);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [storeName, setStoreName] = useState(profile?.name || '');
  const [shortDescription, setShortDescription] = useState(profile?.shortDescription || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');

  const stepLabels = [
    t('admin.onboarding.step1Label') || 'Store',
    t('admin.onboarding.step2Label') || 'Product',
    t('admin.onboarding.step3Label') || 'Payments',
    t('admin.onboarding.step4Label') || 'Launch',
  ];

  const handleAvatarFileSelect = useCallback((file: File) => {
    setAvatarFile(file);
    setAvatarPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
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
      const profileData = {
        name: storeName.trim(),
        shortDescription: shortDescription.trim(),
        vendor: true,
      };

      const created = await apiCreateProfile(profileData);
      if (!created.success) {
        await updateProfile(profileData);
      }

      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile);
        if (!uploaded) {
          toast({
            title:
              t('admin.onboarding.avatarUploadFailed') ||
              'Avatar upload failed, you can update it later in settings',
            variant: 'destructive',
          });
        }
      }

      if (currency) {
        await updateSettings({
          localCurrency: currency,
          country: country || undefined,
        });
      }

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

  const handleCreateProduct = useCallback(() => {
    router.push('/listing/new?from=onboarding');
  }, [router]);

  const handleFinish = () => {
    dismissOnboarding();
    onComplete();
  };

  const storeUrl = profile?.peerID ? (standaloneMode ? '/' : `/store/${profile.peerID}`) : '/';

  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="seller-onboarding-landing">
        <div className="text-center mb-4 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Store className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">
            {t('admin.onboarding.landingTitle') || 'Start Your Online Store'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-md mx-auto">
            {t('admin.onboarding.landingSubtitle') ||
              'Join thousands of sellers on Mobazha. Set up in minutes, sell globally.'}
          </p>
        </div>

        <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-3 mb-4 sm:mb-8">
          {[
            {
              icon: <Coins className="w-5 h-5 text-primary" />,
              title: t('admin.onboarding.landingFeature1') || 'Zero Platform Fees',
              desc: t('admin.onboarding.landingFeature1Desc') || 'Keep 100% of your revenue',
            },
            {
              icon: <ShieldCheck className="w-5 h-5 text-primary" />,
              title: t('admin.onboarding.landingFeature2') || 'Buyer Protection',
              desc:
                t('admin.onboarding.landingFeature2Desc') ||
                'Built-in escrow for secure transactions',
            },
            {
              icon: <Globe className="w-5 h-5 text-primary" />,
              title: t('admin.onboarding.landingFeature3') || 'Sell Globally',
              desc:
                t('admin.onboarding.landingFeature3Desc') || 'Accept crypto & fiat from anywhere',
            },
          ].map((feat, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-card rounded-xl border px-4 py-3 sm:flex-col sm:text-center sm:p-4 sm:gap-0 sm:space-y-2"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 sm:mx-auto">
                {feat.icon}
              </div>
              <div className="sm:space-y-1">
                <h3 className="text-sm font-semibold text-foreground">{feat.title}</h3>
                <p className="text-xs text-muted-foreground">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl border p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-primary" />
            <span>
              {t('admin.onboarding.landingTimeEstimate') || 'Takes less than 5 minutes to set up'}
            </span>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-8 py-3 text-base font-medium hover:bg-primary/90 transition-colors"
            data-testid="start-selling-cta"
          >
            {t('admin.onboarding.landingCta') || 'Get Started'}
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => router.push('/')}
            className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('admin.onboarding.landingSkip') || 'Maybe later'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" data-testid="seller-onboarding">
      <div className="text-center mb-3 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">
          {t('admin.onboarding.title') || 'Set Up Your Store'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
          {t('admin.onboarding.subtitle') || 'Get your store ready in a few simple steps'}
        </p>
      </div>

      <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} labels={stepLabels} />

      {step === 1 && (
        <div className="bg-card rounded-xl border p-3 sm:p-6 space-y-3 sm:space-y-6">
          {/* Mobile: compact avatar + title only; Desktop: full header with subtitle */}
          <div className="flex items-center gap-2.5 sm:flex-col sm:items-stretch">
            <div className="sm:flex sm:items-center sm:gap-3 sm:mb-2 hidden">
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

            {/* Mobile: compact avatar + title (no subtitle — fields are self-explanatory) */}
            <div className="shrink-0 sm:hidden">
              <AvatarUpload
                src={
                  avatarPreview ||
                  (profile?.avatarHashes ? getImageUrl(profile.avatarHashes.small) : undefined)
                }
                name={storeName}
                onFileSelect={handleAvatarFileSelect}
                size="md"
                label={t('admin.onboarding.changeAvatar') || 'Change avatar'}
              />
            </div>
            <div className="sm:hidden">
              <h2 className="text-sm font-semibold">
                {t('admin.onboarding.step1Title') || 'Store Profile'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {t('admin.onboarding.clickToUpload') || 'Click to upload avatar'}
              </p>
            </div>

            {/* Desktop: centered avatar */}
            <div className="hidden sm:flex flex-col items-center gap-3">
              <AvatarUpload
                src={
                  avatarPreview ||
                  (profile?.avatarHashes ? getImageUrl(profile.avatarHashes.small) : undefined)
                }
                name={storeName}
                onFileSelect={handleAvatarFileSelect}
                size="xl"
                label={t('admin.onboarding.changeAvatar') || 'Change avatar'}
              />
              <span className="text-xs text-muted-foreground">
                {t('admin.onboarding.clickToUpload') || 'Click to upload avatar'}
              </span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label
                htmlFor="store-name"
                className="block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5"
              >
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
              <label
                htmlFor="store-desc"
                className="block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5"
              >
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
              <p className="text-xs text-muted-foreground mt-0.5 text-right">
                {shortDescription.length}/160
              </p>
            </div>
          </div>

          {/* Location & Currency */}
          <div className="border-t pt-3 sm:pt-4 space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-medium text-foreground">
              {t('admin.onboarding.locationCurrencyTitle') || 'Location & Currency'}
            </h3>
            <CountryCurrencySelector
              country={country}
              currency={currency}
              onCountryChange={setCountry}
              onCurrencyChange={setCurrency}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between pt-1 sm:pt-2">
            <button
              onClick={() => {
                dismissOnboarding();
                onSkip();
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 min-h-[44px] sm:min-h-0"
            >
              <SkipForward className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              {t('admin.onboarding.skip') || 'Skip setup'}
            </button>
            <button
              onClick={handleStep1Save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 sm:px-5 sm:py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px] sm:min-h-0"
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
        <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-5 sm:space-y-6">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: <Wand2 className="w-5 h-5 text-primary" />,
                text: t('admin.onboarding.featureAi') || 'AI-powered title & description',
              },
              {
                icon: <Layers className="w-5 h-5 text-primary" />,
                text: t('admin.onboarding.featureVariants') || 'Variants, pricing & inventory',
              },
              {
                icon: <Truck className="w-5 h-5 text-primary" />,
                text: t('admin.onboarding.featureShipping') || 'Shipping & delivery options',
              },
              {
                icon: <Coins className="w-5 h-5 text-primary" />,
                text: t('admin.onboarding.featurePricing') || 'Crypto & fiat pricing',
              },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                {feat.icon}
                <span className="text-sm text-foreground">{feat.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleCreateProduct}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 text-base sm:text-sm font-medium hover:bg-primary/90 transition-colors min-h-[48px] sm:min-h-0"
          >
            {t('admin.onboarding.createProduct') || 'Create Product'}
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between pt-2">
            {profileAlreadyComplete ? (
              <button
                onClick={() => {
                  dismissOnboarding();
                  onSkip();
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 min-h-[44px] sm:min-h-0"
              >
                <SkipForward className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                {t('admin.onboarding.skip') || 'Skip setup'}
              </button>
            ) : (
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('admin.onboarding.back') || 'Back'}
              </button>
            )}
            <button
              onClick={() => setStep(3)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
            >
              {t('admin.onboarding.skipStep') || 'Skip this step'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {t('admin.onboarding.step3Title') || 'Set Up Payments'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('admin.onboarding.step3Desc') || 'Choose how you want to get paid'}
              </p>
            </div>
          </div>

          {hasPayment && (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3">
              <CircleCheck className="w-5 h-5 text-success shrink-0" />
              <span className="text-sm text-success font-medium">
                {t('admin.onboarding.paymentConfigured') || 'Payment method configured'}
              </span>
            </div>
          )}

          <Link
            href="/admin/settings/payments"
            className="w-full flex items-center gap-4 rounded-xl border p-4 text-left hover:bg-accent/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('admin.onboarding.setupPayments') || 'Set up payment methods'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('admin.onboarding.setupPaymentsDesc') ||
                  'Add crypto wallets, connect Stripe or PayPal'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('admin.onboarding.back') || 'Back'}
            </button>
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 sm:px-5 sm:py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px] sm:min-h-0"
            >
              {hasPayment
                ? t('admin.onboarding.next') || 'Next'
                : t('admin.onboarding.skipStep') || 'Skip this step'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-card rounded-xl border p-5 sm:p-8 text-center space-y-5 sm:space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Rocket className="w-8 h-8 text-success" />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              {t('admin.onboarding.completeTitle') || 'Your Store is Ready!'}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {t('admin.onboarding.completeDesc') ||
                'Your store profile is set up. Add products anytime from the admin panel.'}
            </p>
          </div>

          <button
            onClick={() => {
              dismissOnboarding();
              onComplete();
              router.push('/admin/storefront');
            }}
            className="w-full flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('admin.onboarding.designWithAi') || 'Design your store with AI'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('admin.onboarding.designWithAiDesc') ||
                  'Customize branding, colors, and layout with AI assistance'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              onClick={() => router.push(storeUrl)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 sm:py-2.5 text-sm font-medium hover:bg-accent transition-colors min-h-[44px] sm:min-h-0"
            >
              {t('admin.onboarding.viewStore') || 'View Your Store'}
            </button>
            <button
              onClick={handleFinish}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 sm:py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px] sm:min-h-0"
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
