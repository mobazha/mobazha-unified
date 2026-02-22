'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';

interface SaveBarProps {
  isDirty: boolean;
  isLoading: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export const SaveBar: React.FC<SaveBarProps> = ({ isDirty, isLoading, onSave, onDiscard }) => {
  const { t } = useI18n();

  if (!isDirty) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-50 bg-card border-t border-border shadow-lg animate-in slide-in-from-bottom-4 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-[960px] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 gap-4">
          <p className="text-sm text-muted-foreground">{t('settingsModal.unsavedChanges')}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onDiscard} disabled={isLoading}>
              {t('common.discard')}
            </Button>
            <Button onClick={onSave} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
