'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { SettingsSection } from '@/components/SettingsLayout';
import { Users, Package, ChevronRight, Check, X, Loader2, ShieldCheck } from 'lucide-react';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';

interface PrivacySettings {
  isPrivate: boolean;
  requireApproval: boolean;
  welcomeMessage: string;
}

interface AccessRequest {
  id: string;
  name: string;
  avatar: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const mockSettings: PrivacySettings = {
  isPrivate: false,
  requireApproval: false,
  welcomeMessage: 'Welcome to my store! Browse our exclusive products.',
};

const mockRequests: AccessRequest[] = [
  {
    id: 'req1',
    name: 'CryptoEnthusiast',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=crypto',
    message: 'I would love to access your exclusive products!',
    createdAt: '2024-01-20T10:00:00',
    status: 'pending',
  },
  {
    id: 'req2',
    name: 'TechBuyer2024',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    message: 'Interested in your VIP collection.',
    createdAt: '2024-01-19T15:30:00',
    status: 'pending',
  },
];

export default function PrivacySettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrivacySettings>(mockSettings);
  const [requests, setRequests] = useState(mockRequests);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: t('common.success'), description: t('settingsModal.settingsSaved') });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsExtended.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewRequest = (requestId: string, approved: boolean) => {
    setRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, status: approved ? 'approved' : 'rejected' } : req
      )
    );
    toast({
      title: approved ? t('settingsExtended.accessGranted') : t('settingsExtended.accessDenied'),
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.privacy')}
        description={t('settingsExtended.privacyDesc')}
        backHref="/settings"
      />

      <div className="space-y-6">
        {/* Store Privacy Settings */}
        <SettingsSection
          title={t('settingsExtended.storePrivacySection')}
          description={t('settingsExtended.storePrivacySectionDesc')}
        >
          <Card className="p-4 md:p-6 space-y-5">
            {/* Private Store Toggle */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t('settingsExtended.privateStoreToggle')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settingsExtended.privateStoreToggleDesc')}
                </p>
              </div>
              <Switch
                checked={settings.isPrivate}
                onCheckedChange={checked => setSettings(prev => ({ ...prev, isPrivate: checked }))}
              />
            </div>

            {/* Require Approval */}
            {settings.isPrivate && (
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t('settingsExtended.requireApproval')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settingsExtended.requireApprovalDesc')}
                  </p>
                </div>
                <Switch
                  checked={settings.requireApproval}
                  onCheckedChange={checked =>
                    setSettings(prev => ({ ...prev, requireApproval: checked }))
                  }
                />
              </div>
            )}

            {/* Welcome Message */}
            {settings.isPrivate && (
              <div className="pt-4 border-t border-border">
                <label className="block text-sm font-medium mb-1.5">
                  {t('settingsExtended.welcomeMessage')}
                </label>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={e => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t('common.save')}
              </Button>
            </div>
          </Card>
        </SettingsSection>

        {/* Access Requests */}
        {settings.isPrivate && settings.requireApproval && (
          <SettingsSection
            title={t('settingsExtended.accessRequests')}
            description={t('settingsExtended.accessRequestsDesc')}
          >
            <Card className="p-4 md:p-6">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {t('settingsExtended.noPendingRequests')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map(request => (
                    <div
                      key={request.id}
                      className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-b-0 border-border"
                    >
                      <Avatar src={request.avatar} name={request.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{request.name}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {request.message}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => handleReviewRequest(request.id, true)}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            {t('settingsExtended.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => handleReviewRequest(request.id, false)}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            {t('settingsExtended.deny')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </SettingsSection>
        )}

        {/* Quick Links */}
        <SettingsSection
          title={t('settingsExtended.accessMgmt')}
          description={t('settingsExtended.accessMgmtDesc')}
        >
          <Card className="p-0 divide-y divide-border">
            <Link
              href="/settings/user-groups"
              className="flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors active:bg-surface-hover min-h-[56px]"
            >
              <div className="w-9 h-9 rounded-lg bg-info/15 flex items-center justify-center flex-shrink-0">
                <Users className="w-4.5 h-4.5 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t('settingsExtended.userGroups')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settingsExtended.userGroupsDesc')}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Link>
            <Link
              href="/settings/product-groups"
              className="flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors active:bg-surface-hover min-h-[56px]"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Package className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t('settingsExtended.productGroups')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settingsExtended.productGroupsDesc')}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Link>
          </Card>
        </SettingsSection>
      </div>
    </div>
  );
}
