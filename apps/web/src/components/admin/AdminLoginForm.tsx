'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore, getEnvConfig, useI18n, acquireSaaSToken } from '@mobazha/core';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';
import { Lock, ArrowLeft, Globe } from 'lucide-react';
import Link from 'next/link';

interface AdminLoginFormProps {
  casdoorAvailable?: boolean;
}

/**
 * Inline admin login form rendered inside /admin layout when the user
 * is not yet authenticated in standalone mode.
 *
 * This keeps admin login fully separated from the buyer /login page,
 * following the Shopify / WooCommerce pattern of isolated admin auth.
 *
 * When casdoorAvailable is true, a secondary "Sign in with Mobazha Account"
 * option appears below the password form. This opens a Casdoor popup where
 * the admin can use any bound social provider (Telegram/Discord/Google).
 * The resulting JWT is validated by the node's JWTValidator to confirm
 * admin ownership (claims.Id == ownerUserID).
 */
export function AdminLoginForm({ casdoorAvailable = false }: AdminLoginFormProps) {
  const router = useRouter();
  const { login, loginWithToken, isLoading, error } = useUserStore();
  const { t } = useI18n();

  const envConfig = useMemo(() => getEnvConfig(), []);
  const presetUsername = envConfig.auth.basic?.username || 'admin';

  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [socialLoading, setSocialLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!password) {
      setLocalError(t('login.usernamePasswordRequired'));
      return;
    }

    const success = await login({ username: presetUsername, password });
    if (success) {
      router.refresh();
    }
  };

  const handleSocialLogin = async () => {
    setLocalError('');
    setSocialLoading(true);
    try {
      const result = await acquireSaaSToken(true);
      if (!result.success || !result.token) {
        setLocalError(result.error || 'Authentication failed');
        return;
      }
      const success = await loginWithToken(result.token);
      if (success) {
        router.refresh();
      } else {
        setLocalError(
          t('login.socialLoginNotAdmin', {
            defaultValue: 'This account does not have admin access to this store.',
          })
        );
      }
    } catch {
      setLocalError('Authentication failed');
    } finally {
      setSocialLoading(false);
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)]">
      {/* Centered login card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="px-6 py-6 bg-black/30 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10">
            <div className="flex justify-end mb-4">
              <LanguageSwitcher className="[&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:border [&>button]:border-white/15 [&>button]:shadow-sm" />
            </div>
            {/* Logo & Store name */}
            <div className="text-center mb-6">
              <MobazhaLogo size={48} className="text-white mx-auto mb-3" />
              <h1 className="text-xl font-bold text-white mb-1">
                {t('login.sellerAdmin', { defaultValue: 'Store Admin' })}
              </h1>
            </div>

            {displayError && (
              <div className="mb-5 p-3 bg-error/20 border border-error/30 rounded-lg">
                <p className="text-sm text-error">{displayError}</p>
              </div>
            )}

            {/* Password-only form (username fixed to preset) */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-white/60" />
                  <label htmlFor="admin-password" className="text-sm font-medium text-white/70">
                    {t('login.password')}
                  </label>
                </div>
                <input
                  id="admin-password"
                  data-testid="admin-login-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('login.passwordPlaceholder', { defaultValue: 'Enter password' })}
                  autoComplete="current-password"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                data-testid="admin-login-submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isLoading ? t('login.loggingIn') : t('login.login')}
              </button>
            </form>

            {casdoorAvailable && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  data-testid="admin-social-login"
                  onClick={handleSocialLogin}
                  disabled={isLoading || socialLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  {socialLoading
                    ? t('login.loggingIn')
                    : t('login.signInWithMobazha', {
                        defaultValue: 'Sign in with Mobazha Account',
                      })}
                </button>
              </div>
            )}
          </div>

          {/* Back to store link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('policies.backToStore', { defaultValue: 'Back to Store' })}
            </Link>
          </div>

          {/* Brand footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-white/30">{t('login.brandFooter')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginForm;
