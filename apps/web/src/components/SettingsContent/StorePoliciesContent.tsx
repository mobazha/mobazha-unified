'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { SettingsSection } from '@/components/SettingsLayout';
import { SaveBar } from '@/components/SettingsLayout/SaveBar';
import { ReturnPolicySelector } from '@/components/Listing/ReturnPolicySelector';
import { TermsPolicySelector } from '@/components/Listing/TermsPolicySelector';

interface StorePolicies {
  returnPolicy: string;
  termsAndConditions: string;
}

const initialPolicies: StorePolicies = {
  returnPolicy: '',
  termsAndConditions: '',
};

export function StorePoliciesContent() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [policies, setPolicies] = useState<StorePolicies>(initialPolicies);
  const [savedPolicies, setSavedPolicies] = useState<StorePolicies>(initialPolicies);

  const isDirty =
    policies.returnPolicy !== savedPolicies.returnPolicy ||
    policies.termsAndConditions !== savedPolicies.termsAndConditions;

  const handleSave = useCallback(() => {
    setSavedPolicies({ ...policies });
    toast({
      title: t('common.saved'),
      description: t('settingsExtended.storePoliciesSaved'),
    });
  }, [policies, toast, t]);

  const handleDiscard = useCallback(() => {
    setPolicies({ ...savedPolicies });
  }, [savedPolicies]);

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
              <ReturnPolicySelector
                value={policies.returnPolicy}
                onChange={value => setPolicies(prev => ({ ...prev, returnPolicy: value }))}
              />
            </div>
          </Card>
        </SettingsSection>

        <SettingsSection
          className="pt-5 md:pt-8"
          title={t('listing.termsAndConditions')}
          description={t('settingsExtended.termsDesc')}
        >
          <Card className="p-4 md:p-6">
            <TermsPolicySelector
              value={policies.termsAndConditions}
              onChange={value => setPolicies(prev => ({ ...prev, termsAndConditions: value }))}
            />
          </Card>
        </SettingsSection>
      </div>

      <SaveBar isDirty={isDirty} isLoading={false} onSave={handleSave} onDiscard={handleDiscard} />
    </>
  );
}
