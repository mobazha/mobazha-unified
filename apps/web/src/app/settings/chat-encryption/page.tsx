'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useToast,
} from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { ChevronLeft, Key, Copy, RefreshCw, Shield, AlertTriangle } from 'lucide-react';

export default function ChatEncryptionSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Mock key data
  const keyFingerprint = 'A1B2 C3D4 E5F6 7890 1234 5678 9ABC DEF0';
  const keyCreated = '2025-01-01';

  const handleCopyFingerprint = () => {
    navigator.clipboard.writeText(keyFingerprint.replace(/\s/g, ''));
    toast({
      title: t('common.success'),
      description: t('settingsModal.fingerprintCopied'),
    });
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    // Simulate regeneration
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRegenerating(false);
    setShowRegenerateDialog(false);
    toast({
      title: t('common.success'),
      description: t('settingsModal.keysRegenerated'),
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

      <h1 className="text-xl font-semibold mb-6">{t('settings.sidebar.chatEncryption')}</h1>

      {/* Info Card */}
      <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-sm">{t('settingsModal.e2eEncryption')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settingsModal.e2eEncryptionDesc')}
            </p>
          </div>
        </div>
      </Card>

      {/* Key Info */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium">{t('settingsModal.yourEncryptionKey')}</p>
            <p className="text-xs text-muted-foreground">
              {t('settingsModal.created')}: {keyCreated}
            </p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-3 mb-4">
          <p className="text-xs text-muted-foreground mb-1">{t('settingsModal.keyFingerprint')}</p>
          <p className="font-mono text-sm break-all">{keyFingerprint}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyFingerprint}>
            <Copy className="w-4 h-4 mr-2" />
            {t('common.copy')}
          </Button>
        </div>
      </Card>

      {/* Regenerate Section */}
      <Card className="p-4 border-destructive/20">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-sm">{t('settingsModal.regenerateKeys')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settingsModal.regenerateKeysWarning')}
            </p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowRegenerateDialog(true)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('settingsModal.regenerate')}
        </Button>
      </Card>

      {/* Regenerate Confirmation */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsModal.regenerateConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsModal.regenerateConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRegenerating ? t('common.loading') : t('settingsModal.regenerate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
