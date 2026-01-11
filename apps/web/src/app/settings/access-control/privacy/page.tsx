'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch, useToast } from '@/components/ui';
import { useI18n, useAccessControl, useUserStore } from '@mobazha/core';
import { ChevronLeft, Shield, Eye, EyeOff, UserCheck, Zap, Loader2 } from 'lucide-react';

interface SettingToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SettingToggle: React.FC<SettingToggleProps> = ({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}) => (
  <div className="flex items-start gap-4 p-4 border-b border-border last:border-0">
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  </div>
);

export default function PrivacySettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile } = useUserStore();
  const storePeerID = profile?.peerID || '';

  const {
    settings: privacySettings,
    settingsLoading: isLoadingPrivacy,
    updateSettings,
    loadSettings: refreshPrivacySettings,
  } = useAccessControl({ storePeerID });

  // Local state for form
  const [isPrivateStore, setIsPrivateStore] = useState(false);
  const [allowAccessRequests, setAllowAccessRequests] = useState(true);
  const [autoApproveRequests, setAutoApproveRequests] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync with fetched settings
  useEffect(() => {
    if (privacySettings) {
      setIsPrivateStore(privacySettings.isPrivateStore || false);
      setAllowAccessRequests(privacySettings.allowAccessRequests !== false);
      setAutoApproveRequests(privacySettings.autoApproveRequests || false);
      setWelcomeMessage(privacySettings.welcomeMessage || '');
    }
  }, [privacySettings]);

  // Refresh on mount
  useEffect(() => {
    refreshPrivacySettings();
  }, [refreshPrivacySettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        isPrivateStore,
        allowAccessRequests,
        autoApproveRequests,
        welcomeMessage: welcomeMessage.trim(),
      });
      toast({
        title: t('common.success'),
        description: t('settings.accessControl.settingsSaved'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('common.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    privacySettings &&
    (isPrivateStore !== (privacySettings.isPrivateStore || false) ||
      allowAccessRequests !== (privacySettings.allowAccessRequests !== false) ||
      autoApproveRequests !== (privacySettings.autoApproveRequests || false) ||
      welcomeMessage.trim() !== (privacySettings.welcomeMessage || ''));

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings/access-control"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-6">{t('settings.sidebar.privacy')}</h1>

      {isLoadingPrivacy ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Info Banner - 使用不同的样式明确这是说明文字 */}
          <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-muted/50 text-muted-foreground">
            <Shield className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">{t('settings.accessControl.privacyDescription')}</p>
          </div>

          {/* Privacy Settings */}
          <Card className="overflow-hidden mb-6">
            <SettingToggle
              icon={isPrivateStore ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              title={t('settings.accessControl.privateStore')}
              description={t('settings.accessControl.privateStoreDesc')}
              checked={isPrivateStore}
              onCheckedChange={setIsPrivateStore}
            />

            {isPrivateStore && (
              <>
                <SettingToggle
                  icon={<UserCheck className="w-5 h-5" />}
                  title={t('settings.accessControl.allowRequests')}
                  description={t('settings.accessControl.allowRequestsDesc')}
                  checked={allowAccessRequests}
                  onCheckedChange={setAllowAccessRequests}
                />

                {allowAccessRequests && (
                  <SettingToggle
                    icon={<Zap className="w-5 h-5" />}
                    title={t('settings.accessControl.autoApprove')}
                    description={t('settings.accessControl.autoApproveDesc')}
                    checked={autoApproveRequests}
                    onCheckedChange={setAutoApproveRequests}
                  />
                )}
              </>
            )}
          </Card>

          {/* Welcome Message */}
          {isPrivateStore && allowAccessRequests && (
            <Card className="p-4 mb-6">
              <h3 className="font-medium text-sm mb-2">
                {t('settings.accessControl.welcomeMessage')}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {t('settings.accessControl.welcomeMessageDesc')}
              </p>
              <Textarea
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                placeholder={t('settings.accessControl.welcomeMessagePlaceholder')}
                rows={4}
              />
            </Card>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </>
      )}
    </div>
  );
}
