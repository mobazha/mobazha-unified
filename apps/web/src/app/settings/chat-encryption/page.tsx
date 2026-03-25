'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui';
import { useI18n, useUserStore } from '@mobazha/core';
import { matrixClient, matrixCrypto, type InvitePolicy } from '@mobazha/core/services/matrix';
import type { KeyBackupResult, NodeBackupInfo } from '@mobazha/core/services/matrix';
import { SettingsPageHeader, SettingsSection } from '@/components/SettingsLayout';
import { Key, Copy, Shield, Share2, Laptop, Check, Loader2, AlertCircle } from 'lucide-react';

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
  const { profile } = useUserStore();

  const [invitePolicy, setInvitePolicyUI] = useState<'all' | 'mobazha' | 'confirm'>('mobazha');
  const [backupInfo, setBackupInfo] = useState<NodeBackupInfo | null>(null);
  const [isLoadingBackup, setIsLoadingBackup] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const chatId = matrixClient.getUserId() || '';
  const deviceId = matrixClient.getDeviceId() || '';

  // Load saved policy from matrixClient on mount
  useEffect(() => {
    const currentPolicy = matrixClient.getInvitePolicy();
    setInvitePolicyUI(POLICY_TO_UI[currentPolicy] || 'mobazha');
  }, []);

  // Load real backup info on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await matrixCrypto.getKeyBackupInfo();
        if (!cancelled) setBackupInfo(info);
      } catch {
        // No backup available
      } finally {
        if (!cancelled) setIsLoadingBackup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result: KeyBackupResult = await matrixCrypto.backupRoomKeys();
      if (result.success) {
        const info = await matrixCrypto.getKeyBackupInfo();
        setBackupInfo(info);
        toast({
          title: t('common.success'),
          description: t('settingsModal.keysBackedUp'),
        });
      } else {
        toast({
          title: t('common.error'),
          description: result.error || result.reason || t('settingsModal.backupFailed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('settingsModal.backupFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result: KeyBackupResult = await matrixCrypto.restoreRoomKeys();
      if (result.success) {
        toast({
          title: t('common.success'),
          description: t('settingsModal.keysRestored'),
        });
      } else {
        toast({
          title: t('common.error'),
          description: result.error || result.reason || t('settingsModal.restoreFailed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('settingsModal.restoreFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
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

        {/* Key Backup section */}
        <SettingsSection
          className="pt-5 md:pt-8"
          title={t('settingsModal.keyBackup')}
          description={t('settingsModal.keyBackupDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-3">
              {isLoadingBackup ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('common.loading')}</span>
                </div>
              ) : backupInfo ? (
                <>
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">{t('settingsModal.backupExists')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsModal.lastBackup')}:{' '}
                    {new Date(backupInfo.updatedAt).toLocaleString()}
                    {backupInfo.keyCount > 0 && ` (${backupInfo.keyCount} keys)`}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{t('settingsModal.noBackup')}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleBackup} size="sm" disabled={isBackingUp || !chatId}>
                  {isBackingUp ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  {t('settingsModal.backupNow')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestore}
                  disabled={isRestoring || !chatId}
                >
                  {isRestoring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('settingsModal.restoreKeys')}
                </Button>
              </div>
            </div>
          </Card>
        </SettingsSection>
      </div>
    </div>
  );
}
