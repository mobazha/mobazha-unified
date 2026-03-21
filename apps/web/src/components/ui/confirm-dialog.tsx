'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** 'destructive' renders the confirm button in red */
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

/**
 * Compact confirmation dialog optimized for both desktop and mobile.
 *
 * Use for simple confirm/cancel flows (delete, clear, discard).
 * For form dialogs (accept order, refund, fulfill), use AlertDialog directly.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = React.useCallback(() => {
    onOpenChange(false);
    onConfirm();
  }, [onOpenChange, onConfirm]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xs sm:max-w-sm rounded-2xl p-6">
        <AlertDialogHeader className="space-y-1.5">
          <AlertDialogTitle className="text-center text-base">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-center text-sm">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'w-full py-2.5 rounded-xl font-medium text-[15px] transition-all',
              'active:opacity-80 disabled:opacity-50',
              variant === 'destructive'
                ? 'bg-destructive text-white hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {confirmLabel}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full py-2.5 text-muted-foreground font-medium text-[15px] hover:bg-muted rounded-xl active:opacity-80 transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
