'use client';

import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useI18n } from '@mobazha/core';

interface ClearCartAlertProps {
  onConfirm: () => void;
  children: (open: () => void) => ReactNode;
}

export function ClearCartAlert({ onConfirm, children }: ClearCartAlertProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      {children(() => setIsOpen(true))}
      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={t('cart.clearConfirmTitle')}
        description={t('cart.clearConfirmMessage')}
        confirmLabel={t('common.clearAll')}
        cancelLabel={t('common.cancel')}
        onConfirm={onConfirm}
        variant="destructive"
      />
    </>
  );
}
