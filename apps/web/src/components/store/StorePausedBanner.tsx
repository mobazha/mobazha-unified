'use client';

import React, { useState, useCallback } from 'react';
import { PauseCircle } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { useUserStore } from '@mobazha/core/stores/userStore';
import { useToast } from '@/components/ui/use-toast';

interface StorePausedBannerProps {
  className?: string;
  variant?: 'buyer' | 'admin';
}

/**
 * Banner shown when a store is paused (vacation mode).
 * - buyer variant: shown on storefront to visitors
 * - admin variant: shown in admin dashboard to the store owner, with a quick Resume button
 */
export function StorePausedBanner({ className = '', variant = 'buyer' }: StorePausedBannerProps) {
  const { t } = useI18n();
  const updateProfile = useUserStore(s => s.updateProfile);
  const { toast } = useToast();
  const [resuming, setResuming] = useState(false);

  const handleResume = useCallback(async () => {
    setResuming(true);
    try {
      await updateProfile({ storePaused: false });
      toast({ variant: 'success', title: t('store.resumeStore') });
    } catch {
      toast({ variant: 'destructive', title: t('common.error') });
    } finally {
      setResuming(false);
    }
  }, [updateProfile, toast, t]);

  const message = variant === 'admin' ? t('store.pausedBannerAdmin') : t('store.pausedBanner');

  return (
    <div
      role="status"
      className={`sticky top-0 z-30 flex items-center gap-2 pl-12 pr-4 lg:px-4 py-2.5 bg-warning/10 border-b border-warning/20 text-sm ${className}`}
    >
      <PauseCircle className="w-4 h-4 text-warning flex-shrink-0" />
      <span className="text-warning font-medium flex-1">{message}</span>
      {variant === 'admin' && (
        <button
          onClick={handleResume}
          disabled={resuming}
          className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-md bg-warning/20 text-warning hover:bg-warning/30 transition-colors disabled:opacity-50"
        >
          {resuming ? '...' : t('store.resumeStore')}
        </button>
      )}
    </div>
  );
}
