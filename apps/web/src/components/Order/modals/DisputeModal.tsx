'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/layouts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { useI18n } from '@mobazha/core';

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (claim: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * 争议申诉模态框
 */
export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const [claim, setClaim] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmitClick = useCallback(() => {
    if (!claim.trim()) {
      window.alert(t('order.dispute.reasonRequired'));
      return;
    }
    setShowConfirm(true);
  }, [claim, t]);

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false);
    await onSubmit(claim.trim());
  }, [claim, onSubmit]);

  const handleClose = useCallback(() => {
    setClaim('');
    setShowConfirm(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
        <Card className="w-full max-w-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">
            {t('order.dispute.title')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{t('order.dispute.description')}</p>

          <textarea
            value={claim}
            onChange={e => setClaim(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-success resize-none mb-4 text-sm"
            placeholder={t('order.dispute.placeholder')}
            autoFocus
          />

          <div className="bg-warning/8 border border-warning/20 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="text-xs text-warning">
                <p className="font-medium mb-1">{t('order.dispute.warning')}</p>
                <p>{t('order.dispute.warningText')}</p>
              </div>
            </div>
          </div>

          <HStack justify="end" gap="sm">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleSubmitClick}
              disabled={isLoading || !claim.trim()}
            >
              {isLoading ? t('common.loading') : t('order.dispute.submit')}
            </Button>
          </HStack>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.dispute.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('order.dispute.confirmText')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t('order.dispute.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DisputeModal;
