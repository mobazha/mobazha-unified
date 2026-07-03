'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui';
import { useI18n, useUserStore } from '@mobazha/core';
import { SettingsSection } from '@/components/SettingsLayout';
import { SaveBar } from '@/components/SettingsLayout/SaveBar';
import { ReturnPolicySelector } from '@/components/Listing/ReturnPolicySelector';
import { TermsPolicySelector } from '@/components/Listing/TermsPolicySelector';

// DG-1.11: protocol-defined ceiling for the digital-good review window override.
// Server enforces the same bound (models.MaxDigitalGoodReviewWindowDays = 7).
const DIGITAL_REVIEW_WINDOW_MAX = 7;
// Default review window for DIGITAL_GOOD orders when override is unset (=0).
// Backend `DefaultProtectionPolicy(DIGITAL_GOOD).AutoCompleteAfterShipDays`.
const DIGITAL_REVIEW_WINDOW_DEFAULT = 3;

export function StorePoliciesContent() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { settings, fetchSettings, updateSettings } = useUserStore();

  const [returnPolicy, setReturnPolicy] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [digitalReviewWindow, setDigitalReviewWindow] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings) {
      setReturnPolicy(settings.refundPolicy || '');
      setTermsAndConditions(settings.termsAndConditions || '');
      // 0 / undefined → blank input → backend interprets as default.
      const win = settings.digitalGoodReviewWindowDays;
      setDigitalReviewWindow(win && win > 0 ? String(win) : '');
    }
  }, [settings]);

  // Parse the input as integer; empty / NaN / out-of-range -> 0 (use default).
  const parsedReviewWindow = (() => {
    const trimmed = digitalReviewWindow.trim();
    if (!trimmed) return 0;
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n) || n < 0) return 0;
    if (n > DIGITAL_REVIEW_WINDOW_MAX) return DIGITAL_REVIEW_WINDOW_MAX;
    return n;
  })();

  const reviewWindowInvalid = (() => {
    const trimmed = digitalReviewWindow.trim();
    if (!trimmed) return false;
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) || n < 0 || n > DIGITAL_REVIEW_WINDOW_MAX;
  })();

  const isDirty =
    returnPolicy !== (settings?.refundPolicy || '') ||
    termsAndConditions !== (settings?.termsAndConditions || '') ||
    parsedReviewWindow !== (settings?.digitalGoodReviewWindowDays || 0);

  const handleSave = useCallback(async () => {
    if (reviewWindowInvalid) {
      toast({
        title: t('common.error'),
        description: t('settingsExtended.digitalReviewWindowInvalid', {
          max: DIGITAL_REVIEW_WINDOW_MAX,
        }),
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    try {
      const success = await updateSettings({
        refundPolicy: returnPolicy,
        termsAndConditions,
        digitalGoodReviewWindowDays: parsedReviewWindow,
      });

      if (success) {
        toast({
          title: t('common.saved'),
          description: t('settingsExtended.storePoliciesSaved'),
        });
      } else {
        toast({
          title: t('common.error'),
          description: t('settingsModal.saveFailed'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    returnPolicy,
    termsAndConditions,
    parsedReviewWindow,
    reviewWindowInvalid,
    updateSettings,
    toast,
    t,
  ]);

  const handleDiscard = useCallback(() => {
    setReturnPolicy(settings?.refundPolicy || '');
    setTermsAndConditions(settings?.termsAndConditions || '');
    const win = settings?.digitalGoodReviewWindowDays;
    setDigitalReviewWindow(win && win > 0 ? String(win) : '');
  }, [settings]);

  return (
    <>
      <div className="divide-y divide-border">
        <SettingsSection
          className="pb-5 md:pb-8"
          title={t('listing.returnPolicy')}
          description={t('listing.returnPolicyHelper')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-4">
              <ReturnPolicySelector value={returnPolicy} onChange={setReturnPolicy} />
            </div>
          </Card>
        </SettingsSection>

        <SettingsSection
          className="pt-5 md:pt-8"
          title={t('listing.termsAndConditions')}
          description={t('settingsExtended.termsDesc')}
        >
          <Card className="p-4 md:p-6">
            <TermsPolicySelector value={termsAndConditions} onChange={setTermsAndConditions} />
          </Card>
        </SettingsSection>

        {/* DG-1.11: digital-good buyer-protection window override.
            Only the *extension* of the protocol default (3d) is honoured by the
            backend — shorter values are silently clamped to 3d so buyers always
            get the baseline protection. */}
        <SettingsSection
          className="pt-5 md:pt-8"
          title={t('settingsExtended.digitalReviewWindowTitle')}
          description={t('settingsExtended.digitalReviewWindowDesc', {
            default: DIGITAL_REVIEW_WINDOW_DEFAULT,
            max: DIGITAL_REVIEW_WINDOW_MAX,
          })}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-2">
              <label
                htmlFor="digital-review-window"
                className="text-sm font-medium text-foreground"
              >
                {t('settingsExtended.digitalReviewWindowLabel')}
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="digital-review-window"
                  type="number"
                  min={0}
                  max={DIGITAL_REVIEW_WINDOW_MAX}
                  step={1}
                  inputMode="numeric"
                  placeholder={String(DIGITAL_REVIEW_WINDOW_DEFAULT)}
                  value={digitalReviewWindow}
                  onChange={e => setDigitalReviewWindow(e.target.value)}
                  className="w-28"
                  data-testid="digital-review-window-input"
                  aria-invalid={reviewWindowInvalid}
                />
                <span className="text-sm text-muted-foreground">
                  {t('settingsExtended.digitalReviewWindowUnit')}
                </span>
              </div>
              {reviewWindowInvalid && (
                <p className="text-xs text-destructive">
                  {t('settingsExtended.digitalReviewWindowInvalid', {
                    max: DIGITAL_REVIEW_WINDOW_MAX,
                  })}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('settingsExtended.digitalReviewWindowHelper', {
                  default: DIGITAL_REVIEW_WINDOW_DEFAULT,
                })}
              </p>
            </div>
          </Card>
        </SettingsSection>
      </div>

      <SaveBar
        isDirty={isDirty}
        isLoading={isSaving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
