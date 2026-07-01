'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useI18n } from '@mobazha/core';
import { ChevronRight, Download, Upload, Terminal, Trash2, Smartphone } from 'lucide-react';
import { SettingsPageHeader, SettingsSection } from '@/components/SettingsLayout';
import { usePWAInstall } from '@/components/PWAInstall';

export default function AdvancedSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { canInstall, install } = usePWAInstall();

  const handleBackupWallet = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.backupComingSoon'),
    });
  };

  const handleBackupProfile = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.backupProfileComingSoon'),
    });
  };

  const handleRestoreConfirm = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.restoreComingSoon'),
    });
    setShowRestoreDialog(false);
  };

  const handleServerLogs = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.serverLogsDesc'),
    });
  };

  return (
    <div>
      <SettingsPageHeader title={t('settings.sidebar.advanced')} />

      <div className="divide-y divide-border">
        {/* Backup & Restore */}
        <SettingsSection
          className="py-5 md:py-8"
          title={t('settings.backup')}
          description={t('settingsExtended.backupWalletDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t('settingsExtended.backupWallet')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('settingsExtended.backupWalletDesc')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackupWallet}
                  className="flex items-center text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t('settingsExtended.backupProfile')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('settingsExtended.backupProfileDesc')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackupProfile}
                    className="flex items-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t('settingsExtended.restoreProfile')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('settingsExtended.restoreProfileDesc')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRestoreDialog(true)}
                    className="flex items-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </SettingsSection>

        {/* Install App */}
        {canInstall && (
          <SettingsSection
            className="py-5 md:py-8"
            title={t('settingsExtended.installApp', { defaultValue: 'Install App' })}
            description={t('settingsExtended.installAppDesc', {
              defaultValue: 'Add Mobazha to your home screen for faster access',
            })}
          >
            <Card className="p-4 md:p-6">
              <button
                type="button"
                onClick={install}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-success/10">
                  <Smartphone className="w-4 h-4 text-success" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-sm">
                    {t('settingsExtended.installApp', { defaultValue: 'Install App' })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settingsExtended.installAppDesc', {
                      defaultValue: 'Add Mobazha to your home screen for faster access',
                    })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </Card>
          </SettingsSection>
        )}

        {/* Developer Options */}
        <SettingsSection
          className="py-5 md:py-8"
          title={t('settingsExtended.developer')}
          description={t('settingsExtended.serverLogsDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t('settingsExtended.serverLogs')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('settingsExtended.serverLogsDesc')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleServerLogs}
                  className="flex items-center text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{t('settings.version')}</p>
                  <span className="text-muted-foreground text-sm">
                    {process.env.NEXT_PUBLIC_APP_VERSION || process.env.VITE_APP_VERSION || '0.1.0'}
                  </span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{t('settingsExtended.checkForUpdates')}</p>
                  <button
                    type="button"
                    onClick={() =>
                      toast({
                        title: t('settingsExtended.upToDate'),
                        description: t('settingsExtended.latestVersion'),
                      })
                    }
                    className="flex items-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection
          className="py-5 md:py-8"
          title={t('settingsExtended.dangerZone')}
          description={t('settingsExtended.deleteAccountDesc')}
        >
          <Card className="p-4 md:p-6">
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-destructive"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{t('settings.deleteAccount')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settingsExtended.deleteAccountDesc')}
                </p>
              </div>
            </button>
          </Card>
        </SettingsSection>
      </div>

      <ConfirmDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        title={t('settingsExtended.restoreConfirmTitle')}
        description={t('settingsExtended.restoreConfirmDesc')}
        confirmLabel={t('settingsExtended.continue')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleRestoreConfirm}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('settingsExtended.deleteConfirmTitle')}
        description={t('settingsExtended.deleteConfirmDesc')}
        confirmLabel={t('settings.deleteAccount')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={() => {
          toast({
            title: t('settingsExtended.comingSoon'),
            description: t('settingsExtended.deleteAccountDesc'),
          });
        }}
      />
    </div>
  );
}
