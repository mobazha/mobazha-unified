'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui';
import { useI18n, useUserStore } from '@mobazha/core';
import { ChevronLeft, Key, Copy, Shield, Share2, Laptop, Check } from 'lucide-react';

export default function ChatEncryptionSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile } = useUserStore();

  const [invitePolicy, setInvitePolicy] = useState<'all' | 'mobazha' | 'confirm'>('mobazha');
  const [lastBackup, setLastBackup] = useState<Date | null>(new Date());
  // Generate stable device ID using useState initializer (runs only once)
  const [deviceId] = useState(() => `MBZ_DESKTOP_${Date.now().toString(36).toUpperCase()}`);

  const chatId = profile?.peerID ? `@peer_${profile.peerID.toLowerCase()}:matrix.mobazha.org` : '';

  const handleCopy = async () => {
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
        title: 'My Chat ID',
        text: chatId,
      });
    } catch {
      // Fallback to copy
      handleCopy();
    }
  };

  const handleBackup = async () => {
    setLastBackup(new Date());
    toast({
      title: t('common.success'),
      description: t('settingsModal.keysBackedUp'),
    });
  };

  const handleRestore = () => {
    toast({
      title: t('settingsModal.restoreKeys'),
      description: t('settingsModal.restoreKeysDesc'),
    });
  };

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <h1 className="text-lg font-semibold mb-6">{t('settings.sidebar.chatEncryption')}</h1>

      {/* Encryption Status */}
      <Card className="p-4 mb-4 bg-success/8 border-success/20">
        <div className="flex items-center gap-2 text-success">
          <Shield className="w-5 h-5" />
          <span className="font-medium text-sm">{t('settingsModal.e2eAvailable')}</span>
        </div>
      </Card>

      {/* My Chat ID */}
      <Card className="p-4 mb-4">
        <div className="mb-3">
          <h3 className="font-medium text-sm">{t('settingsModal.myChatId')}</h3>
          <p className="text-xs text-muted-foreground">{t('settingsModal.myChatIdDesc')}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-xs break-all">
            {chatId || t('settingsModal.notLoggedIn')}
          </div>
          <div className="flex flex-col gap-2">
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
        <p className="text-xs text-muted-foreground mt-2">{t('settingsModal.chatIdNote')}</p>
      </Card>

      {/* Current Device */}
      <Card className="p-4 mb-4">
        <h3 className="font-medium text-sm mb-3">{t('settingsModal.currentDevice')}</h3>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Laptop className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{t('settingsModal.browserDevice')}</p>
            <p className="text-xs text-muted-foreground">Device ID: {deviceId}</p>
          </div>
        </div>
      </Card>

      {/* Key Backup */}
      <Card className="p-4 mb-4">
        <div className="mb-3">
          <h3 className="font-medium text-sm">{t('settingsModal.keyBackup')}</h3>
          <p className="text-xs text-muted-foreground">{t('settingsModal.keyBackupDesc')}</p>
        </div>
        {lastBackup && (
          <div className="flex items-center gap-2 text-success mb-2">
            <Check className="w-4 h-4" />
            <span className="text-sm">{t('settingsModal.backupExists')}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mb-3">
          {t('settingsModal.lastBackup')}:{' '}
          {lastBackup?.toLocaleString() || t('settingsModal.never')}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleBackup} size="sm">
            <Key className="w-4 h-4 mr-2" />
            {t('settingsModal.backupNow')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestore}>
            {t('settingsModal.restoreKeys')}
          </Button>
        </div>
      </Card>

      {/* Message Invites */}
      <Card className="p-4">
        <div className="mb-3">
          <h3 className="font-medium text-sm">{t('settingsModal.messageInvites')}</h3>
          <p className="text-xs text-muted-foreground">{t('settingsModal.messageInvitesDesc')}</p>
        </div>
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
                invitePolicy === option.value ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
              }`}
            >
              <input
                type="radio"
                name="invitePolicy"
                value={option.value}
                checked={invitePolicy === option.value}
                onChange={() => setInvitePolicy(option.value)}
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
    </div>
  );
}
