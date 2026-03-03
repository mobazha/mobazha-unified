'use client';

import { useState, useCallback, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@mobazha/core';

interface ClearCartAlertProps {
  onConfirm: () => void;
  children: (open: () => void) => ReactNode;
}

export function ClearCartAlert({ onConfirm, children }: ClearCartAlertProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    onConfirm();
  }, [onConfirm]);

  return (
    <>
      {children(() => setIsOpen(true))}
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cart.clearConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cart.clearConfirmMessage')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.clearAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
