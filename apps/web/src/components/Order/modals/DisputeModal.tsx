'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@mobazha/core';

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (claim: string) => Promise<void>;
  isLoading?: boolean;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const [claim, setClaim] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resetState = useCallback(() => {
    setClaim('');
    setValidationError('');
    setShowConfirm(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleSubmitClick = useCallback(() => {
    if (!claim.trim()) {
      setValidationError(t('order.dispute.reasonRequired'));
      textareaRef.current?.focus();
      return;
    }
    setValidationError('');
    setShowConfirm(true);
  }, [claim, t]);

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false);
    await onSubmit(claim.trim());
    resetState();
  }, [claim, onSubmit, resetState]);

  const handleClaimChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setClaim(e.target.value);
    if (e.target.value.trim()) {
      setValidationError('');
    }
  }, []);

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={open => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('order.dispute.title')}</DialogTitle>
            <DialogDescription>{t('order.dispute.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <textarea
                ref={textareaRef}
                value={claim}
                onChange={handleClaimChange}
                rows={5}
                className={`w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm resize-none
                  focus:outline-none focus:ring-2 transition-colors
                  ${
                    validationError
                      ? 'border-destructive focus:ring-destructive/30'
                      : 'border-border focus:ring-primary/30'
                  }`}
                placeholder={t('order.dispute.placeholder')}
                aria-label={t('order.dispute.placeholder')}
                aria-invalid={!!validationError}
                aria-describedby={validationError ? 'dispute-error' : undefined}
                autoFocus
              />
              {validationError && (
                <p id="dispute-error" className="mt-1.5 text-sm text-destructive" role="alert">
                  {validationError}
                </p>
              )}
            </div>

            <div className="bg-warning/8 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-xs text-warning">
                  <p className="font-medium mb-1">{t('order.dispute.warning')}</p>
                  <p>{t('order.dispute.warningText')}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitClick}
              disabled={isLoading || !claim.trim()}
            >
              {isLoading ? t('common.loading') : t('order.dispute.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
