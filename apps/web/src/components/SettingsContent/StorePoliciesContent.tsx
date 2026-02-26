'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui';
import { useI18n, useUserStore } from '@mobazha/core';
import { SettingsSection } from '@/components/SettingsLayout';
import { SaveBar } from '@/components/SettingsLayout/SaveBar';
import { ReturnPolicySelector } from '@/components/Listing/ReturnPolicySelector';
import { TermsPolicySelector } from '@/components/Listing/TermsPolicySelector';

export function StorePoliciesContent() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { settings, fetchSettings, updateSettings } = useUserStore();

  const [returnPolicy, setReturnPolicy] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
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
    }
  }, [settings]);

  const isDirty =
    returnPolicy !== (settings?.refundPolicy || '') ||
    termsAndConditions !== (settings?.termsAndConditions || '');

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = await updateSettings({
        refundPolicy: returnPolicy,
        termsAndConditions,
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
  }, [returnPolicy, termsAndConditions, updateSettings, toast, t]);

  const handleDiscard = useCallback(() => {
    setReturnPolicy(settings?.refundPolicy || '');
    setTermsAndConditions(settings?.termsAndConditions || '');
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
