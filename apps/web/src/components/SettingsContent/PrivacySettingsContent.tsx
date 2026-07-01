'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch, useToast } from '@/components/ui';
import { useI18n, useAccessControl, useUserStore } from '@mobazha/core';
import { Globe, Link2, Lock, UserCheck, Zap, Loader2 } from 'lucide-react';
import { SettingsSection } from '@/components/SettingsLayout';

type StoreVisibility = 'public' | 'unlisted' | 'private';

interface VisibilityOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: StoreVisibility;
  selected: boolean;
  onSelect: (value: StoreVisibility) => void;
}

const VisibilityOption: React.FC<VisibilityOptionProps> = ({
  icon,
  title,
  description,
  value,
  selected,
  onSelect,
}) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-colors text-left w-full ${
      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
    }`}
  >
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
      }`}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
    <div
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
        selected ? 'border-primary' : 'border-muted-foreground/40'
      }`}
    >
      {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
    </div>
  </button>
);

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

  const [visibility, setVisibility] = useState<StoreVisibility>(profile?.visibility || 'public');
  const [allowAccessRequests, setAllowAccessRequests] = useState(true);
  const [autoApproveRequests, setAutoApproveRequests] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const initialVisibilityRef = useRef<StoreVisibility>(profile?.visibility || 'public');

  useEffect(() => {
    const vis = profile?.visibility || 'public';
    setVisibility(vis);
    initialVisibilityRef.current = vis;
  }, [profile?.visibility]);

  useEffect(() => {
    if (privacySettings) {
      setAllowAccessRequests(privacySettings.allowAccessRequests !== false);
      setAutoApproveRequests(privacySettings.autoApproveRequests || false);
      setWelcomeMessage(privacySettings.welcomeMessage || '');
    }
  }, [privacySettings]);

  useEffect(() => {
    refreshPrivacySettings();
  }, [refreshPrivacySettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const visibilityChanged = visibility !== initialVisibilityRef.current;
      if (visibilityChanged) {
        const profileUpdateSuccess = await updateProfile({ visibility });
        if (!profileUpdateSuccess) {
          throw new Error('Failed to update profile');
        }
        initialVisibilityRef.current = visibility;
      }

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

  const isPrivate = visibility === 'private';

  const hasChanges =
    visibility !== initialVisibilityRef.current ||
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
    <div className="divide-y divide-border">
      <SettingsSection
        className="pt-0 pb-5 md:pb-8"
        title={t('settings.visibility.title') || 'Store Visibility'}
        description={
          t('settings.visibility.description') ||
          'Control how your store is discovered and accessed'
        }
      >
        <Card className="p-4 md:p-6">
          <div className="space-y-3">
            <VisibilityOption
              icon={<Globe className="w-5 h-5" />}
              title={t('settings.visibility.public') || 'Public'}
              description={
                t('settings.visibility.publicDesc') ||
                'Visible in marketplace search and recommendations'
              }
              value="public"
              selected={visibility === 'public'}
              onSelect={setVisibility}
            />
            <VisibilityOption
              icon={<Link2 className="w-5 h-5" />}
              title={t('settings.visibility.unlisted') || 'Unlisted'}
              description={
                t('settings.visibility.unlistedDesc') ||
                'Hidden from search, accessible via direct link or custom domain'
              }
              value="unlisted"
              selected={visibility === 'unlisted'}
              onSelect={setVisibility}
            />
            <VisibilityOption
              icon={<Lock className="w-5 h-5" />}
              title={t('settings.visibility.private') || 'Private'}
              description={
                t('settings.visibility.privateDesc') ||
                'Only authorized users can access your store'
              }
              value="private"
              selected={visibility === 'private'}
              onSelect={setVisibility}
            />
          </div>

          {isPrivate && (
            <div className="mt-4 pt-4 border-t border-border space-y-0">
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
            </div>
          )}

          <div className="pt-4 border-t border-border mt-4">
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
          </div>
        </Card>
      </SettingsSection>

      {isPrivate && allowAccessRequests && (
        <SettingsSection
          className="py-5 md:py-8"
          title={t('settings.accessControl.welcomeMessage')}
          description={t('settings.accessControl.welcomeMessageDesc')}
        >
          <Card className="p-4 md:p-6">
            <Textarea
              value={welcomeMessage}
              onChange={e => setWelcomeMessage(e.target.value)}
              placeholder={t('settings.accessControl.welcomeMessagePlaceholder')}
              rows={4}
            />
          </Card>
        </SettingsSection>
      )}
    </div>
  );
};

export default PrivacySettingsContent;
