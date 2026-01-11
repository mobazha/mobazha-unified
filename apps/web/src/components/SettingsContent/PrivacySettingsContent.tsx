'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch, useToast } from '@/components/ui';
import { useI18n, useAccessControl, useUserStore } from '@mobazha/core';
import { Shield, Eye, EyeOff, UserCheck, Zap, Loader2 } from 'lucide-react';

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

/**
 * 隐私设置内容组件
 * 可在独立页面和 Modal 中复用
 *
 * 注意：isPrivateStore（私密店铺）值从 profile.private 获取，与老版移动端一致
 * 其他访问控制设置（allowAccessRequests, autoApproveRequests 等）从 store-access-settings 获取
 */
export const PrivacySettingsContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile, updateProfile } = useUserStore();
  const storePeerID = profile?.peerID || '';

  const {
    settings: privacySettings,
    settingsLoading: isLoadingPrivacy,
    updateSettings,
    loadSettings: refreshPrivacySettings,
  } = useAccessControl({ storePeerID });

  // Local state for form
  // 从 profile.private 获取私密店铺状态（与老版移动端一致）
  const [isPrivateStore, setIsPrivateStore] = useState(profile?.private ?? false);
  const [allowAccessRequests, setAllowAccessRequests] = useState(true);
  const [autoApproveRequests, setAutoApproveRequests] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 追踪初始值，用于判断是否有变更
  const initialPrivateRef = useRef(profile?.private ?? false);

  // 当 profile 更新时同步私密店铺状态
  useEffect(() => {
    const profilePrivate = profile?.private ?? false;
    setIsPrivateStore(profilePrivate);
    initialPrivateRef.current = profilePrivate;
  }, [profile?.private]);

  // Sync with fetched settings (access control settings only)
  useEffect(() => {
    if (privacySettings) {
      // 注意：不再从 privacySettings 获取 isPrivateStore，而是从 profile.private 获取
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
      // 1. 如果私密店铺状态有变化，通过 updateProfile 更新 profile.private
      const privateChanged = isPrivateStore !== initialPrivateRef.current;
      if (privateChanged) {
        const profileUpdateSuccess = await updateProfile({ private: isPrivateStore });
        if (!profileUpdateSuccess) {
          throw new Error('Failed to update profile');
        }
        // 更新初始值引用
        initialPrivateRef.current = isPrivateStore;
      }

      // 2. 更新访问控制设置（不包含 isPrivateStore）
      await updateSettings({
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

  // 检查是否有变更
  const hasChanges =
    isPrivateStore !== initialPrivateRef.current ||
    (privacySettings &&
      (allowAccessRequests !== (privacySettings.allowAccessRequests !== false) ||
        autoApproveRequests !== (privacySettings.autoApproveRequests || false) ||
        welcomeMessage.trim() !== (privacySettings.welcomeMessage || '')));

  if (isLoadingPrivacy) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 text-muted-foreground">
        <Shield className="w-5 h-5 mt-0.5 shrink-0" />
        <p className="text-sm">{t('settings.accessControl.privacyDescription')}</p>
      </div>

      {/* Privacy Settings */}
      <Card className="overflow-hidden">
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
        <Card className="p-4">
          <h3 className="font-medium text-sm mb-2">{t('settings.accessControl.welcomeMessage')}</h3>
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
      <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="w-full sm:w-auto">
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('common.saving')}
          </>
        ) : (
          t('common.save')
        )}
      </Button>
    </div>
  );
};

export default PrivacySettingsContent;
