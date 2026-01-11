'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import {
  Switch,
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
import { useI18n, useUserStore } from '@mobazha/core';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Download,
  Upload,
  Terminal,
  Trash2,
} from 'lucide-react';

interface SettingItemProps {
  title: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
  icon?: React.ReactNode;
}

const SettingItem = ({
  title,
  description,
  value,
  onClick,
  toggle,
  toggleValue,
  onToggle,
  danger,
  icon,
}: SettingItemProps) => {
  const content = (
    <>
      {icon && (
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${danger ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 text-left min-w-0">
        <p className={`font-medium text-sm ${danger ? 'text-destructive' : ''}`}>{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        )}
      </div>
      {toggle ? (
        <Switch
          checked={toggleValue}
          onCheckedChange={val => onToggle?.(val)}
          className="ml-3 flex-shrink-0"
        />
      ) : value ? (
        <span className="text-muted-foreground text-sm ml-3 flex-shrink-0">{value}</span>
      ) : onClick ? (
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0" />
      ) : null}
    </>
  );

  const baseClassName =
    'w-full flex items-center p-3 hover:bg-surface-hover/50 transition-colors border-b border-border last:border-0';

  if (toggle || !onClick) {
    return <div className={baseClassName}>{content}</div>;
  }

  return (
    <button onClick={onClick} className={`${baseClassName} active:bg-muted`}>
      {content}
    </button>
  );
};

interface SettingGroupProps {
  title?: string;
  children: React.ReactNode;
}

const SettingGroup = ({ title, children }: SettingGroupProps) => (
  <div className="mb-6">
    {title && (
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {title}
      </h3>
    )}
    <Card className="overflow-hidden">{children}</Card>
  </div>
);

export default function AdvancedSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { logout } = useUserStore();

  const [analytics, setAnalytics] = useState(true);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleBackup = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.backupComingSoon'),
    });
  };

  const handleRestoreConfirm = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.restoreComingSoon'),
    });
    setShowRestoreDialog(false);
  };

  const handleLogoutConfirm = () => {
    logout();
    router.push('/');
  };

  const handleResync = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: 'Transaction resync coming soon',
    });
  };

  const handleServerLogs = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: 'Server logs coming soon',
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

      <h1 className="text-lg font-semibold mb-6">{t('settings.sidebar.advanced')}</h1>

      {/* Privacy */}
      <SettingGroup title={t('settings.privacy')}>
        <SettingItem
          title={t('settingsExtended.analytics')}
          description={t('settingsExtended.analyticsDesc')}
          toggle
          toggleValue={analytics}
          onToggle={setAnalytics}
        />
      </SettingGroup>

      {/* Backup & Restore */}
      <SettingGroup title={t('settings.backup')}>
        <SettingItem
          title={t('settingsExtended.backupWallet')}
          description={t('settingsExtended.backupWalletDesc')}
          icon={<Download className="w-4 h-4" />}
          onClick={handleBackup}
        />
        <SettingItem
          title={t('settingsExtended.backupProfile')}
          description={t('settingsExtended.backupProfileDesc')}
          icon={<Download className="w-4 h-4" />}
          onClick={handleBackup}
        />
        <SettingItem
          title={t('settingsExtended.restoreProfile')}
          description={t('settingsExtended.restoreProfileDesc')}
          icon={<Upload className="w-4 h-4" />}
          onClick={() => setShowRestoreDialog(true)}
        />
      </SettingGroup>

      {/* Developer */}
      <SettingGroup title={t('settingsExtended.developer')}>
        <SettingItem
          title={t('settingsExtended.resyncTransactions')}
          description={t('settingsExtended.resyncDesc')}
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={handleResync}
        />
        <SettingItem
          title={t('settingsExtended.serverLogs')}
          description={t('settingsExtended.serverLogsDesc')}
          icon={<Terminal className="w-4 h-4" />}
          onClick={handleServerLogs}
        />
      </SettingGroup>

      {/* About */}
      <SettingGroup title={t('settings.about')}>
        <SettingItem title={t('settings.version')} value="1.0.0 (Build 123)" />
        <SettingItem
          title={t('settingsExtended.checkForUpdates')}
          onClick={() =>
            toast({
              title: t('settingsExtended.upToDate'),
              description: t('settingsExtended.latestVersion'),
            })
          }
        />
      </SettingGroup>

      {/* Danger Zone */}
      <SettingGroup title={t('settingsExtended.dangerZone')}>
        <SettingItem
          title={t('settings.logout')}
          danger
          icon={<LogOut className="w-4 h-4" />}
          onClick={() => setShowLogoutDialog(true)}
        />
        <SettingItem
          title={t('settings.deleteAccount')}
          description={t('settingsExtended.deleteAccountDesc')}
          danger
          icon={<Trash2 className="w-4 h-4" />}
          onClick={() => setShowDeleteDialog(true)}
        />
      </SettingGroup>

      {/* Restore Confirmation */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsExtended.restoreConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.restoreConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              {t('settingsExtended.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirmation */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsExtended.logoutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.logoutConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm}>
              {t('settings.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsExtended.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('settings.deleteAccount')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
