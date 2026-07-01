'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { getMyProfile } from '@mobazha/core/services/api/profile';
import {
  setAsModerator,
  unsetAsModerator,
  type SetModeratorRequest,
} from '@mobazha/core/services/api/moderators';
import type { ModeratorInfo } from '@mobazha/core/types/user';
import { Loader2 } from 'lucide-react';

type FeeType = 'FIXED' | 'PERCENTAGE' | 'FIXED_PLUS_PERCENTAGE';

interface FormState {
  enabled: boolean;
  description: string;
  termsAndConditions: string;
  languages: string[];
  acceptedCurrencies: string[];
  feeType: FeeType;
  percentage: number;
  fixedAmount: number;
  fixedCurrency: string;
}

const INITIAL_FORM: FormState = {
  enabled: false,
  description: '',
  termsAndConditions: '',
  languages: [],
  acceptedCurrencies: [],
  feeType: 'PERCENTAGE',
  percentage: 1,
  fixedAmount: 0,
  fixedCurrency: 'USD',
};

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ru', label: 'Русский' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
];

const AVAILABLE_CURRENCIES = ['BTC', 'ETH', 'LTC', 'BCH', 'USDC', 'USDT', 'SOL', 'BNB', 'MATIC'];

function TogglePill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent text-foreground border-border hover:border-primary/50'
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-10 py-8 border-b border-border last:border-0">
      <div className="lg:w-[240px] lg:flex-shrink-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-5 space-y-4">{children}</div>
  );
}

export default function ModeratorSettingsPage() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const savedRef = useRef<FormState>(INITIAL_FORM);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedRef.current);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const profile = await getMyProfile();
        if (profile?.moderator && profile.moderatorInfo) {
          const state = infoToForm(profile.moderatorInfo, true);
          setForm(state);
          savedRef.current = state;
        }
      } catch {
        // Profile may not be available yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function infoToForm(info: ModeratorInfo, enabled: boolean): FormState {
    const ft = (info.fee?.feeType || 'PERCENTAGE').toUpperCase() as FeeType;
    return {
      enabled,
      description: info.description || '',
      termsAndConditions: info.termsAndConditions || '',
      languages: info.languages || [],
      acceptedCurrencies: info.acceptedCurrencies || [],
      feeType: ft,
      percentage: info.fee?.percentage || 0,
      fixedAmount: info.fee?.fixedFee ? Number(info.fee.fixedFee.amount) || 0 : 0,
      fixedCurrency: info.fee?.fixedFee?.currencyCode || 'USD',
    };
  }

  function update(patch: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  function toggleInArray(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

  function discard() {
    setForm(savedRef.current);
  }

  async function handleSave() {
    if (!form.enabled) {
      setSaving(true);
      try {
        await unsetAsModerator();
        const newState = { ...INITIAL_FORM };
        setForm(newState);
        savedRef.current = newState;
        showToast('success', t('settingsExtended.moderatorSettingsSaved'));
      } catch {
        showToast('error', t('moderatorSettings.saveFailed'));
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const data: SetModeratorRequest = {
        description: form.description,
        termsAndConditions: form.termsAndConditions,
        languages: form.languages,
        acceptedCurrencies: form.acceptedCurrencies,
        fee: {
          feeType: form.feeType,
          percentage: form.percentage,
          ...(form.feeType !== 'PERCENTAGE' && {
            fixedFee: {
              amount: form.fixedAmount,
              currencyCode: form.fixedCurrency,
            },
          }),
        },
      };
      await setAsModerator(data);
      savedRef.current = { ...form };
      showToast('success', t('settingsExtended.moderatorSettingsSaved'));
    } catch {
      showToast('error', t('moderatorSettings.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const feeHint =
    form.feeType === 'PERCENTAGE' || form.feeType === 'FIXED_PLUS_PERCENTAGE'
      ? t('settingsExtended.percentageHint', { percentage: form.percentage })
      : undefined;

  return (
    <div className="pb-20">
      <SettingsPageHeader title={t('settings.sidebar.moderation')} />

      {toast && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            toast.type === 'success'
              ? 'bg-success/15 text-success'
              : 'bg-destructive/15 text-destructive'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Section 1: Enable */}
      <Section
        title={t('settingsExtended.enableModeration')}
        description={t('settingsExtended.enableModerationDesc')}
      >
        <FormCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{t('settingsExtended.enableModeration')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('settingsExtended.enableModerationHint')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.enabled}
              onClick={() => update({ enabled: !form.enabled })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                form.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </FormCard>
      </Section>

      {form.enabled && (
        <>
          {/* Section 2: Basic Info */}
          <Section
            title={t('settingsExtended.moderatorBasicInfo')}
            description={t('settingsExtended.moderatorBasicInfoDesc')}
          >
            <FormCard>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('settingsExtended.detailedDescription')}
                </label>
                <textarea
                  rows={5}
                  maxLength={5000}
                  value={form.description}
                  onChange={e => update({ description: e.target.value })}
                  placeholder={t('settingsExtended.detailedDescriptionPlaceholder')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">{form.description.length}/5000</p>
              </div>
            </FormCard>
          </Section>

          {/* Section 3: Fee Settings */}
          <Section
            title={t('settingsExtended.feeSettings')}
            description={t('settingsExtended.feeSettingsDesc')}
          >
            <FormCard>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('settingsExtended.feeType')}
                </label>
                <select
                  value={form.feeType}
                  onChange={e => update({ feeType: e.target.value as FeeType })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="PERCENTAGE">{t('settingsExtended.feePercentage')}</option>
                  <option value="FIXED">{t('settingsExtended.feeFixed')}</option>
                  <option value="FIXED_PLUS_PERCENTAGE">
                    {t('settingsExtended.feeFixedPlusPercentage')}
                  </option>
                </select>
              </div>

              {(form.feeType === 'PERCENTAGE' || form.feeType === 'FIXED_PLUS_PERCENTAGE') && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('settingsExtended.percentageLabel')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.percentage}
                    onChange={e => update({ percentage: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  {feeHint && <p className="text-xs text-muted-foreground mt-1">{feeHint}</p>}
                </div>
              )}

              {(form.feeType === 'FIXED' || form.feeType === 'FIXED_PLUS_PERCENTAGE') && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      {t('settingsExtended.fixedAmount')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.fixedAmount}
                      onChange={e => update({ fixedAmount: Number(e.target.value) })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-sm font-medium mb-1">
                      {t('settingsExtended.currency')}
                    </label>
                    <select
                      value={form.fixedCurrency}
                      onChange={e => update({ fixedCurrency: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="CNY">CNY</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                    </select>
                  </div>
                </div>
              )}
            </FormCard>
          </Section>

          {/* Section 4: Languages & Currencies */}
          <Section
            title={t('settingsExtended.languagesAndCurrencies')}
            description={t('settingsExtended.languagesAndCurrenciesDesc')}
          >
            <FormCard>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settingsExtended.supportedLanguages')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_LANGUAGES.map(lang => (
                    <TogglePill
                      key={lang.code}
                      label={lang.label}
                      selected={form.languages.includes(lang.code)}
                      onClick={() =>
                        update({ languages: toggleInArray(form.languages, lang.code) })
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium mb-2">
                  {t('moderatorSettings.acceptedCurrencies')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_CURRENCIES.map(cur => (
                    <TogglePill
                      key={cur}
                      label={cur}
                      selected={form.acceptedCurrencies.includes(cur)}
                      onClick={() =>
                        update({ acceptedCurrencies: toggleInArray(form.acceptedCurrencies, cur) })
                      }
                    />
                  ))}
                </div>
              </div>
            </FormCard>
          </Section>

          {/* Section 5: Terms */}
          <Section
            title={t('settingsExtended.moderatorTerms')}
            description={t('settingsExtended.moderatorTermsDesc')}
          >
            <FormCard>
              <textarea
                rows={5}
                value={form.termsAndConditions}
                onChange={e => update({ termsAndConditions: e.target.value })}
                placeholder={t('settingsExtended.moderatorTermsPlaceholder')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y"
              />
            </FormCard>
          </Section>
        </>
      )}

      {/* Sticky Save Bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('settingsExtended.unsavedChanges')}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                {t('common.discard')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
