'use client';

import React, { useState, useCallback } from 'react';
import { useI18n, useUserContext } from '@mobazha/core';
import { useUserStore } from '@mobazha/core/stores/userStore';
import {
  Shield,
  Truck,
  Scale,
  User,
  Plug,
  Wallet,
  PauseCircle,
  PlayCircle,
  Megaphone,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePlatform } from '@mobazha/ui/hooks';
import { useToast } from '@/components/ui/use-toast';

interface SettingsCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}

function SettingsCard({ icon: Icon, title, description, href }: SettingsCardProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 sm:gap-4 p-3 sm:p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group active:bg-muted/30"
    >
      <div className="p-2 sm:p-2.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm sm:text-base font-medium text-foreground">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
          {description}
        </p>
      </div>
    </Link>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{children}</div>
    </div>
  );
}

function StoreStatusToggle() {
  const { t } = useI18n();
  const { isStorePaused } = useUserContext();
  const updateProfile = useUserStore(s => s.updateProfile);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handleToggle = useCallback(async () => {
    setLoading(true);
    try {
      await updateProfile({ storePaused: !isStorePaused });
      toast({
        variant: 'success',
        title: isStorePaused ? t('store.resumeStore') : t('store.pauseStore'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
      });
    } finally {
      setLoading(false);
    }
  }, [isStorePaused, updateProfile, toast, t]);

  return (
    <>
      <div className="flex items-center justify-between p-4 sm:p-5 bg-card border border-border rounded-xl">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${isStorePaused ? 'bg-warning/10 text-warning' : 'bg-emerald-500/10 text-emerald-500'}`}
          >
            {isStorePaused ? (
              <PauseCircle className="w-5 h-5" />
            ) : (
              <PlayCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-medium text-foreground">
                {t('store.storeStatus')}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isStorePaused
                    ? 'bg-warning/10 text-warning'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isStorePaused ? t('store.statusPaused') : t('store.statusActive')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t('store.pauseStoreDesc')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className={`shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
            isStorePaused
              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
              : 'border-warning/30 text-warning hover:bg-warning/10'
          } disabled:opacity-50`}
        >
          {loading ? '...' : isStorePaused ? t('store.resumeStore') : t('store.pauseStore')}
        </button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={isStorePaused ? t('store.resumeConfirmTitle') : t('store.pauseConfirmTitle')}
        description={isStorePaused ? t('store.resumeConfirmDesc') : t('store.pauseConfirmDesc')}
        confirmLabel={
          isStorePaused ? t('store.resumeConfirmAction') : t('store.pauseConfirmAction')
        }
        cancelLabel={t('common.cancel')}
        onConfirm={handleToggle}
      />
    </>
  );
}

export default function AdminSettingsPage() {
  const { t } = useI18n();
  const { isEmbeddedApp } = usePlatform();

  return (
    <div data-testid="admin-settings">
      {!isEmbeddedApp && (
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">
            {t('admin.settings.title')}
          </h1>
          <p className="hidden sm:block text-sm text-muted-foreground mt-1">
            {t('admin.settings.subtitle')}
          </p>
        </div>
      )}

      <div className={isEmbeddedApp ? 'space-y-4' : 'space-y-6 sm:space-y-8'}>
        {/* Store Status */}
        <StoreStatusToggle />

        {/* Store */}
        <SettingsSection title={t('admin.settings.sectionStore')}>
          <SettingsCard
            icon={User}
            title={t('admin.settings.profile')}
            description={t('admin.settings.profileDesc')}
            href="/admin/settings/profile"
          />
          <SettingsCard
            icon={Shield}
            title={t('admin.settings.accessControl')}
            description={t('admin.settings.accessControlDesc')}
            href="/admin/settings/access-control"
          />
        </SettingsSection>

        {/* Transaction Rules */}
        <SettingsSection title={t('admin.settings.sectionTransaction')}>
          <SettingsCard
            icon={Shield}
            title={t('admin.settings.policies')}
            description={t('admin.settings.policiesDesc')}
            href="/admin/settings/policies"
          />
          <SettingsCard
            icon={Wallet}
            title={t('admin.settings.payments')}
            description={t('admin.settings.paymentsDesc')}
            href="/admin/settings/payments"
          />
          <SettingsCard
            icon={ShoppingBag}
            title={t('admin.settings.guestCheckout')}
            description={t('admin.settings.guestCheckoutDesc')}
            href="/admin/settings/guest-checkout"
          />
          <SettingsCard
            icon={Truck}
            title={t('admin.settings.shipping')}
            description={t('admin.settings.shippingDesc')}
            href="/admin/settings/shipping"
          />
          <SettingsCard
            icon={Scale}
            title={t('admin.settings.moderators')}
            description={t('admin.settings.moderatorsDesc')}
            href="/admin/settings/moderators"
          />
        </SettingsSection>

        {/* Growth */}
        <SettingsSection title={t('admin.settings.sectionGrowth')}>
          <SettingsCard
            icon={Megaphone}
            title={t('admin.settings.salesChannels')}
            description={t('admin.settings.salesChannelsDesc')}
            href="/admin/settings/sales-channels"
          />
        </SettingsSection>

        {/* Extensions */}
        <SettingsSection title={t('admin.settings.sectionExtensions')}>
          <SettingsCard
            icon={Plug}
            title={t('admin.settings.integrations')}
            description={t('admin.settings.integrationsDesc')}
            href="/admin/settings/integrations"
          />
        </SettingsSection>
      </div>
    </div>
  );
}
