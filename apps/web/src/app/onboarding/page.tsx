'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useUserStore,
  useI18n,
  getAllCountries,
  POPULAR_COUNTRIES,
  FIAT_CURRENCIES,
  getPopularCurrencies,
  getLoginRedirectPath,
} from '@mobazha/core';
import { parseJwtToken, getStoredToken } from '@mobazha/core';
import { uploadAvatar } from '@mobazha/core/services/api/images';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera } from 'lucide-react';

const ValueIcon = memo(function ValueIcon({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
});

export default function OnboardingPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { toast } = useToast();

  const profile = useUserStore(state => state.profile);
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const needsOnboarding = useUserStore(state => state.needsOnboarding);
  const createProfile = useUserStore(state => state.createProfile);
  const updateSettings = useUserStore(state => state.updateSettings);
  const isLoading = useUserStore(state => state.isLoading);

  const [displayName, setDisplayName] = useState('');
  const [shortBio, setShortBio] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Country / Currency state
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Country data
  const allCountries = useMemo(() => getAllCountries(locale), [locale]);
  const popularCountryCodes = useMemo(() => new Set(POPULAR_COUNTRIES), []);
  const popularCountries = useMemo(
    () => allCountries.filter(c => popularCountryCodes.has(c.code)),
    [allCountries, popularCountryCodes]
  );
  const otherCountries = useMemo(
    () => allCountries.filter(c => !popularCountryCodes.has(c.code)),
    [allCountries, popularCountryCodes]
  );

  // Currency data
  const popularCurrencies = useMemo(
    () => getPopularCurrencies().filter(c => c.type === 'fiat'),
    []
  );
  const otherFiatCurrencies = useMemo(() => {
    const popularCodes = new Set(popularCurrencies.map(c => c.code));
    return FIAT_CURRENCIES.filter(c => !popularCodes.has(c.code));
  }, [popularCurrencies]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (profile && !needsOnboarding) {
      router.replace('/');
    }
  }, [isAuthenticated, profile, needsOnboarding, router]);

  const avatarPreviewRef = useRef(avatarPreview);
  avatarPreviewRef.current = avatarPreview;
  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    };
  }, []);

  // Prefill from JWT claims
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const claims = parseJwtToken(token);
      if (claims) {
        const name = claims.name || claims.preferred_username || '';
        if (name && !displayName) {
          setDisplayName(name);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleNameBlur = useCallback(() => {
    if (!displayName.trim()) {
      setNameError(t('onboarding.displayNameRequired'));
    } else {
      setNameError('');
    }
  }, [displayName, t]);

  const handleNameChange = useCallback(
    (value: string) => {
      setDisplayName(value);
      if (nameError && value.trim()) {
        setNameError('');
      }
    },
    [nameError]
  );

  const handleSubmit = useCallback(async () => {
    if (!displayName.trim()) {
      setNameError(t('onboarding.displayNameRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const profileData: Record<string, string | boolean> = {
        name: displayName.trim(),
      };
      if (shortBio.trim()) {
        profileData.shortDescription = shortBio.trim();
      }

      // Create profile first
      const profileSuccess = await createProfile(profileData);
      if (!profileSuccess) {
        toast({
          title: t('common.error'),
          description: t('onboarding.createFailed'),
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Parallel: upload avatar + save settings (country/currency)
      const sideEffects: Promise<unknown>[] = [];

      if (avatarFile) {
        sideEffects.push(uploadAvatar(avatarFile).catch(() => {}));
      }

      const settingsUpdate: Record<string, string> = {};
      if (country) settingsUpdate.country = country;
      if (currency && currency !== 'USD') settingsUpdate.localCurrency = currency;
      if (Object.keys(settingsUpdate).length > 0) {
        sideEffects.push(updateSettings(settingsUpdate).catch(() => {}));
      }

      if (sideEffects.length > 0) {
        await Promise.all(sideEffects);
      }

      const savedRedirect = getLoginRedirectPath();
      router.replace(savedRedirect && savedRedirect !== '/' ? savedRedirect : '/');
    } catch {
      toast({
        title: t('common.error'),
        description: t('onboarding.createFailed'),
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  }, [
    displayName,
    shortBio,
    avatarFile,
    country,
    currency,
    createProfile,
    updateSettings,
    router,
    toast,
    t,
  ]);

  const isFormDisabled = isSubmitting || isLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Welcome section */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('onboarding.welcome')}
          </h1>
          <p className="text-muted-foreground text-lg">{t('onboarding.tagline')}</p>

          <div className="flex justify-center gap-8 pt-4">
            <ValueIcon
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                  />
                </svg>
              }
              label={t('onboarding.valueDecentralized')}
            />
            <ValueIcon
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              }
              label={t('onboarding.valuePrivacy')}
            />
            <ValueIcon
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              label={t('onboarding.valueMultiCurrency')}
            />
          </div>
        </div>

        {/* Profile setup card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">{t('onboarding.setupProfile')}</h2>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="relative group cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={t('onboarding.changeAvatar') || 'Change avatar'}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') avatarInputRef.current?.click();
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </div>
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
              {t('onboarding.avatarHint') || 'Click to upload'}
            </span>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
              {t('onboarding.displayName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={e => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              placeholder={t('onboarding.displayNamePlaceholder')}
              disabled={isFormDisabled}
              autoFocus
              className={nameError ? 'border-destructive' : ''}
              aria-label={t('onboarding.displayName')}
              data-testid="onboarding-display-name"
            />
            {nameError && (
              <p className="text-sm text-destructive" role="alert">
                {nameError}
              </p>
            )}
          </div>

          {/* Short Bio */}
          <div className="space-y-2">
            <Label htmlFor="shortBio" className="text-sm font-medium text-foreground">
              {t('onboarding.shortBio')}{' '}
              <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
            </Label>
            <Textarea
              id="shortBio"
              value={shortBio}
              onChange={e => setShortBio(e.target.value)}
              placeholder={t('onboarding.shortBioPlaceholder')}
              disabled={isFormDisabled}
              rows={2}
              className="resize-none"
              aria-label={t('onboarding.shortBio')}
              data-testid="onboarding-short-bio"
            />
          </div>

          {/* Country + Currency row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Country */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {t('onboarding.country')}
              </Label>
              <Select value={country} onValueChange={setCountry} disabled={isFormDisabled}>
                <SelectTrigger className="w-full" data-testid="onboarding-country">
                  <SelectValue placeholder={t('onboarding.countryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{t('onboarding.popularCountries') || 'Popular'}</SelectLabel>
                    {popularCountries.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>{t('onboarding.allCountries') || 'All Countries'}</SelectLabel>
                    {otherCountries.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {t('onboarding.currency') || 'Display Currency'}
              </Label>
              <Select value={currency} onValueChange={setCurrency} disabled={isFormDisabled}>
                <SelectTrigger className="w-full" data-testid="onboarding-currency">
                  <SelectValue placeholder={t('onboarding.currencyPlaceholder') || 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{t('onboarding.popularCountries') || 'Popular'}</SelectLabel>
                    {popularCurrencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>{t('onboarding.allCountries') || 'All'}</SelectLabel>
                    {otherFiatCurrencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isFormDisabled || !displayName.trim()}
            className="w-full h-12 text-base font-medium"
            data-testid="onboarding-submit"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                {t('onboarding.creating')}
              </span>
            ) : (
              t('onboarding.startExploring')
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t('onboarding.customizeLater')}
          </p>
        </div>
      </div>
    </div>
  );
}
