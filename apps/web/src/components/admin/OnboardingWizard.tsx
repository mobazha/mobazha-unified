'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n, useUserStore, isStandalone, getImageUrl } from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';
import { uploadAvatar } from '@mobazha/core/services/api/images';
import {
  Store,
  ShoppingBag,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  SkipForward,
  Camera,
  Layers,
  Truck,
  Wand2,
  Palette,
  Coins,
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
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  return (
    <div className="mb-8">
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
  const { profile, updateProfile } = useUserStore();

  const profileAlreadyComplete = useMemo(() => isProfileComplete(profile), [profile]);
  const cameFromOnboarding = searchParams.get('onboarding') === 'complete';
  const [step, setStep] = useState(cameFromOnboarding ? 3 : profileAlreadyComplete ? 2 : 1);

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
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const handleCreateProduct = useCallback(() => {
    router.push('/listing/new?from=onboarding');
  }, [router]);

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
        <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-5 sm:space-y-6">
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
                capture="user"
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
                className="w-full rounded-lg border bg-background px-3 py-3 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                className="w-full rounded-lg border bg-background px-3 py-3 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
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
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 sm:py-2.5 text-sm font-medium hover:bg-accent transition-colors min-h-[44px] sm:min-h-0"
            >
              {t('admin.onboarding.viewStore') || 'View Your Store'}
            </a>
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
