'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useI18n, useUserStore, getImageUrl, EDITION_I18N_KEYS } from '@mobazha/core';
import { completeInitialSetup } from '@mobazha/core/services/api/system';
import { saveToken, getStoredToken } from '@mobazha/core/services/auth/token';
import { uploadAvatar } from '@mobazha/core/services/api/images';
import {
  createProfile as apiCreateProfile,
  setProfile as apiUpdateProfile,
} from '@mobazha/core/services/api/profile';
import { getGatewayUrl } from '@mobazha/core/services/api/config';
import {
  Lock,
  Store,
  Globe,
  Wallet,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Link2,
  Eye,
  EyeOff,
  CircleCheck,
  Palette,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import CountryCurrencySelector from './CountryCurrencySelector';
import type { SetupCompletedSteps } from '@mobazha/core/services/api/system';

const TOTAL_STEPS = 4;

function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  return (
    <div className="mb-8">
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

      <div className="hidden sm:flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <React.Fragment key={step}>
              {i > 0 && (
                <div
                  className={`h-0.5 w-10 transition-colors ${
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

interface StandaloneSetupWizardProps {
  initialCompletedSteps?: SetupCompletedSteps;
}

export default function StandaloneSetupWizard({
  initialCompletedSteps,
}: StandaloneSetupWizardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile, updateSettings } = useUserStore();

  const hasTokenOnMount = useMemo(() => !!getStoredToken(), []);

  const passwordAlreadySet = initialCompletedSteps?.password ?? false;
  const needsLogin = passwordAlreadySet && !hasTokenOnMount;

  const initialStep = useMemo(() => {
    if (!initialCompletedSteps) return 1;
    if (!initialCompletedSteps.password) return 1;
    if (needsLogin) return 1;
    if (!initialCompletedSteps.profile) return 2;
    if (!initialCompletedSteps.preferences) return 3;
    return 4;
  }, [initialCompletedSteps, needsLogin]);

  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);

  // Step 1: Password (create) or Login (existing)
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordDone, setPasswordDone] = useState(passwordAlreadySet && !needsLogin);
  const [loginMode, setLoginMode] = useState(needsLogin);

  // Step 2: Profile
  const [storeName, setStoreName] = useState(profile?.name || '');
  const [shortDescription, setShortDescription] = useState(profile?.shortDescription || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');

  // Step 3: Location & Currency
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');

  const stepLabels = [
    t('standalone.setup.stepPassword') || 'Password',
    t('standalone.setup.stepProfile') || 'Profile',
    t('standalone.setup.stepRegion') || 'Region',
    t('standalone.setup.stepComplete') || 'Done',
  ];

  const handleAvatarFileSelect = useCallback((file: File) => {
    setAvatarFile(file);
    setAvatarPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const saveBasicAuth = (username: string, pwd: string) => {
    const authHeader = btoa(`${username}:${pwd}`);
    const basicToken = `basic:${authHeader}`;
    saveToken(basicToken);
    useUserStore.setState({
      authMode: 'basic',
      token: basicToken,
      isAuthenticated: true,
      isStoreOwner: true,
    });
  };

  const handleLogin = async () => {
    if (!password.trim()) return;
    setSaving(true);
    try {
      const authHeader = `Basic ${btoa('admin:' + password)}`;
      const resp = await fetch(`${getGatewayUrl()}/config`, {
        headers: { Authorization: authHeader },
      });
      if (resp.status === 401) {
        toast({
          title: t('standalone.setup.invalidPassword') || 'Invalid password',
          variant: 'destructive',
        });
        return;
      }
      saveBasicAuth('admin', password);
      setPasswordDone(true);
      setLoginMode(false);
      setStep(2);
    } catch {
      toast({
        title: t('standalone.setup.loginFailed') || 'Failed to connect to server',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSetup = async () => {
    if (passwordDone) {
      setStep(2);
      return;
    }

    if (loginMode) {
      return handleLogin();
    }

    if (password.length < 8) {
      toast({
        title: t('standalone.setup.passwordTooShort') || 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }
    if (password !== passwordConfirm) {
      toast({
        title: t('standalone.setup.passwordMismatch') || 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await completeInitialSetup(password);
      saveBasicAuth(result.username, password);
      setPasswordDone(true);
      setStep(2);
    } catch (err) {
      toast({
        title:
          err instanceof Error
            ? err.message
            : t('standalone.setup.passwordFailed') || 'Failed to set password',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSave = async () => {
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
        visibility,
      };

      const createResult = await apiCreateProfile(profileData);
      if (!createResult.success) {
        const updateResult = await apiUpdateProfile(profileData);
        if (!updateResult.success) throw new Error(updateResult.error || 'Profile save failed');
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

      setStep(3);
    } catch {
      toast({
        title: t('admin.onboarding.saveFailed') || 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        localCurrency: currency,
        country: country || undefined,
      });
      setStep(4);
    } catch {
      toast({
        title: t('standalone.setup.preferencesFailed') || 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = (redirectPath = '/admin') => {
    window.location.href = redirectPath;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="standalone-setup-wizard">
      <div className="relative text-center mb-6">
        <div className="absolute right-0 top-0">
          <LanguageSwitcher compact />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('standalone.setup.title') || 'Configure Your Store'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('standalone.setup.subtitle') || 'Complete the initial setup to get started'}
        </p>
      </div>

      <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} labels={stepLabels} />

      {/* Step 1: Password (create) or Login (existing) */}
      {step === 1 && (
        <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {passwordDone ? (
                <CircleCheck className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {loginMode
                  ? t('standalone.setup.loginTitle') || 'Sign In'
                  : passwordDone
                    ? t('standalone.setup.passwordAlreadySet') || 'Password has been set'
                    : t('standalone.setup.passwordTitle') || 'Set Admin Password'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {loginMode
                  ? t('standalone.setup.loginDesc') || 'Enter your admin password to continue setup'
                  : passwordDone
                    ? t('standalone.setup.passwordAlreadySet') || 'Password has been set'
                    : t('standalone.setup.passwordDesc') ||
                      'This password protects your store admin panel'}
              </p>
            </div>
          </div>

          {loginMode && (
            <div className="space-y-4">
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium mb-1.5">
                  {t('standalone.setup.password') || 'Password'} *
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-lg border bg-background px-3 py-3 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('standalone.setup.loginPlaceholder') || 'Enter admin password'}
                    autoComplete="current-password"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && password.trim()) handleLogin();
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('standalone.setup.loginHint') ||
                  'Username is "admin". Use the password you set during initial setup.'}
              </p>
            </div>
          )}

          {!passwordDone && !loginMode && (
            <div className="space-y-4">
              <div>
                <label htmlFor="setup-password" className="block text-sm font-medium mb-1.5">
                  {t('standalone.setup.password') || 'Password'} *
                </label>
                <div className="relative">
                  <input
                    id="setup-password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-lg border bg-background px-3 py-3 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={
                      t('standalone.setup.passwordPlaceholder') || 'At least 8 characters'
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="setup-password-confirm"
                  className="block text-sm font-medium mb-1.5"
                >
                  {t('standalone.setup.confirmPassword') || 'Confirm Password'} *
                </label>
                <input
                  id="setup-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-lg border bg-background px-3 py-3 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  placeholder={
                    t('standalone.setup.confirmPasswordPlaceholder') || 'Re-enter password'
                  }
                  autoComplete="new-password"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {t('standalone.setup.passwordHint') ||
                  'Username is "admin". You can use this to log in after setup.'}
              </p>

              {password.length > 0 && (
                <div className="space-y-1">
                  {password.length < 8 && (
                    <p className="text-xs text-destructive">
                      {t('standalone.setup.passwordTooShort') ||
                        'Password must be at least 8 characters'}{' '}
                      ({password.length}/8)
                    </p>
                  )}
                  {passwordConfirm.length > 0 && password !== passwordConfirm && (
                    <p className="text-xs text-destructive">
                      {t('standalone.setup.passwordMismatch') || 'Passwords do not match'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handlePasswordSetup}
              disabled={
                saving ||
                (loginMode
                  ? !password.trim()
                  : !passwordDone && (password.length < 8 || password !== passwordConfirm))
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 sm:px-5 sm:py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px] sm:min-h-0"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {loginMode
                    ? t('standalone.setup.signIn') || 'Sign In'
                    : t('admin.onboarding.next') || 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Profile */}
      {step === 2 && (
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

          {/* Store Visibility */}
          <div className="border-t pt-3 sm:pt-4 space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-medium text-foreground">
              {t('admin.onboarding.storeVisibility')}
            </h3>
            <div className="space-y-2">
              {[
                {
                  value: 'public' as const,
                  icon: Globe,
                  titleKey: 'settings.visibility.public',
                  descKey: 'settings.visibility.publicDesc',
                },
                {
                  value: 'unlisted' as const,
                  icon: Link2,
                  titleKey: 'settings.visibility.unlisted',
                  descKey: 'settings.visibility.unlistedDesc',
                },
                {
                  value: 'private' as const,
                  icon: Lock,
                  titleKey: 'settings.visibility.private',
                  descKey: 'settings.visibility.privateDesc',
                },
              ].map(opt => {
                const Icon = opt.icon;
                const selected = visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={saving}
                    onClick={() => setVisibility(opt.value)}
                    className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border-2 transition-colors text-left w-full disabled:opacity-50 disabled:cursor-not-allowed ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t(opt.titleKey)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(opt.descKey)}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        selected ? 'border-primary' : 'border-muted-foreground/40'
                      }`}
                    >
                      {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.onboarding.visibilityNote')}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('admin.onboarding.back') || 'Back'}
            </button>
            <button
              onClick={handleProfileSave}
              disabled={saving || !storeName.trim()}
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

      {/* Step 3: Location & Currency */}
      {step === 3 && (
        <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {t('standalone.setup.regionTitle') || 'Location & Currency'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('standalone.setup.regionDesc') ||
                  'Set your country and preferred display currency'}
              </p>
            </div>
          </div>

          <CountryCurrencySelector
            country={country}
            currency={currency}
            onCountryChange={setCountry}
            onCurrencyChange={setCurrency}
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('admin.onboarding.back') || 'Back'}
            </button>
            <button
              onClick={handlePreferencesSave}
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

      {/* Step 4: Complete */}
      {step === 4 && (
        <div className="bg-card rounded-xl border p-5 sm:p-8 text-center space-y-5 sm:space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Rocket className="w-8 h-8 text-success" />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              {t('standalone.setup.completeTitle') || 'Your Store is Ready!'}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {t('standalone.setup.completeDesc') ||
                'Setup is complete. You can now manage your store from the admin panel.'}
            </p>
          </div>

          <div className="space-y-3 text-left">
            <button
              onClick={() => handleFinish('/admin/settings/payments')}
              className="w-full flex items-center gap-4 rounded-xl border p-4 text-left hover:bg-accent transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t('admin.onboarding.setupPayments') || 'Set up payment methods'}
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-foreground/70 mt-0.5 transition-colors">
                  {t(EDITION_I18N_KEYS.setupPaymentsDesc)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground/70 shrink-0 transition-colors" />
            </button>

            <button
              onClick={() => handleFinish('/admin/storefront')}
              className="w-full flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t('admin.onboarding.designWithAi') || 'Design your store with AI'}
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-foreground/70 mt-0.5 transition-colors">
                  {t('admin.onboarding.designWithAiDesc') ||
                    'Customize branding, colors, and layout with AI assistance'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground/70 shrink-0 transition-colors" />
            </button>
          </div>

          <button
            onClick={() => handleFinish()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 sm:py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px] sm:min-h-0"
          >
            {t('admin.onboarding.goToDashboard') || 'Go to Dashboard'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
