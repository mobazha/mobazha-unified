'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, adminAuthApi, isStandalone, useI18n, useUserStore } from '@mobazha/core';
import { LockKeyhole } from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';

export default function AdminSecuritySettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const logout = useUserStore(state => state.logout);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const supportsLocalAdminPassword = isStandalone();

  useEffect(() => {
    if (!supportsLocalAdminPassword) router.replace('/admin/settings');
  }, [router, supportsLocalAdminPassword]);

  if (!supportsLocalAdminPassword) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('admin.settings.passwordAllRequired'));
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      setError(t('admin.settings.passwordLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('admin.settings.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await adminAuthApi.changeAdminPassword({ currentPassword, newPassword });
      // The Node revokes every administrator session after rotation. Clear the
      // browser's Basic token as well and force a clean sign-in with the new password.
      logout('/admin?passwordChanged=1');
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t('admin.settings.passwordChangeFailed')
      );
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="admin-settings-security">
      <SettingsPageHeader
        title={t('admin.settings.security')}
        description={t('admin.settings.securityDesc')}
        backHref="/admin/settings"
      />

      <div className="max-w-2xl rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">{t('admin.settings.changePassword')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('admin.settings.passwordSessionWarning')}
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">
              {t('admin.settings.currentPassword')}
            </span>
            <input
              data-testid="current-admin-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">
              {t('admin.settings.newPassword')}
            </span>
            <input
              data-testid="new-admin-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="mt-1.5 block text-xs text-muted-foreground">
              {t('admin.settings.passwordLength')}
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">
              {t('admin.settings.confirmPassword')}
            </span>
            <input
              data-testid="confirm-admin-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <button
            type="submit"
            data-testid="change-admin-password-submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting ? t('admin.settings.changingPassword') : t('admin.settings.changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
