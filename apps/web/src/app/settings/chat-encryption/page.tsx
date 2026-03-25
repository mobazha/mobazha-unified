'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { matrixClient, type InvitePolicy } from '@mobazha/core/services/matrix';
import { SettingsPageHeader, SettingsSection } from '@/components/SettingsLayout';
import { Copy, Shield, Share2, Laptop } from 'lucide-react';

const UI_TO_POLICY: Record<string, InvitePolicy> = {
  all: 'auto_all',
  mobazha: 'auto_mobazha',
  confirm: 'always_confirm',
};

const POLICY_TO_UI: Record<InvitePolicy, 'all' | 'mobazha' | 'confirm'> = {
  auto_all: 'all',
  auto_mobazha: 'mobazha',
  always_confirm: 'confirm',
};

export default function ChatEncryptionSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [invitePolicy, setInvitePolicyUI] = useState<'all' | 'mobazha' | 'confirm'>(() => {
    const currentPolicy = matrixClient.getInvitePolicy();
    return POLICY_TO_UI[currentPolicy] || 'mobazha';
  });

  const chatId = matrixClient.getUserId() || '';
  const deviceId = matrixClient.getDeviceId() || '';

  const handlePolicyChange = useCallback((uiValue: 'all' | 'mobazha' | 'confirm') => {
    setInvitePolicyUI(uiValue);
    const policy = UI_TO_POLICY[uiValue] as InvitePolicy;
    matrixClient.setInvitePolicy(policy);
  }, []);

  const handleCopy = async () => {
    if (!chatId) return;
    try {
      await navigator.clipboard.writeText(chatId);
      toast({
        title: t('common.copied'),
        description: t('settingsModal.chatIdCopied'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.copyFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: t('settingsModal.myChatId'),
        text: chatId,
      });
    } catch {
      handleCopy();
    }
  };

  return (
    <div>
      <SettingsPageHeader title={t('settings.sidebar.chatEncryption')} />

      <div className="divide-y divide-border">
        {/* Chat Identity section */}
        <SettingsSection
          className="pb-5 md:pb-8"
          title={t('settingsModal.myChatId')}
          description={t('settingsModal.myChatIdDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success bg-success/8 border border-success/20 rounded-lg p-3">
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{t('settingsModal.e2eAvailable')}</span>
              </div>
              <div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex-1 min-w-0 p-3 bg-muted rounded-lg font-mono text-xs break-all">
                    {chatId || t('settingsModal.notLoggedIn')}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={!chatId}>
                      <Copy className="w-4 h-4 mr-1" />
                      {t('common.copy')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare} disabled={!chatId}>
                      <Share2 className="w-4 h-4 mr-1" />
                      {t('common.share')}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settingsModal.chatIdNote')}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">{t('settingsModal.currentDevice')}</h4>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Laptop className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{t('settingsModal.browserDevice')}</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {t('settingsModal.deviceId')}: {deviceId || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </SettingsSection>

        {/* Invite Policy section */}
        <SettingsSection
          className="py-5 md:py-8"
          title={t('settingsModal.messageInvites')}
          description={t('settingsModal.messageInvitesDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-2">
              {[
                {
                  value: 'all' as const,
                  title: t('settingsModal.autoAcceptAll'),
                  desc: t('settingsModal.autoAcceptAllDesc'),
                },
                {
                  value: 'mobazha' as const,
                  title: t('settingsModal.autoAcceptMobazha'),
                  desc: t('settingsModal.autoAcceptMobazhaDesc'),
                },
                {
                  value: 'confirm' as const,
                  title: t('settingsModal.alwaysConfirm'),
                  desc: t('settingsModal.alwaysConfirmDesc'),
                },
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    invitePolicy === option.value
                      ? 'bg-primary/5 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="invitePolicy"
                    value={option.value}
                    checked={invitePolicy === option.value}
                    onChange={() => handlePolicyChange(option.value)}
                    className="mt-0.5 w-4 h-4 text-primary border-border focus:ring-primary"
                  />
                  <div>
                    <p className="font-medium text-sm">{option.title}</p>
                    <p className="text-xs text-muted-foreground">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>
        </SettingsSection>

        {/* Key backup is automatic — room keys and cross-signing secrets
            are synced to the user's Mobazha node every 5 minutes and after
            each message send, then auto-restored on new device login.
            No manual UI needed. */}
      </div>
    </div>
  );
}
