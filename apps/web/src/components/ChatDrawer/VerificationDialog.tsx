'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldX, Loader2, X } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export type VerificationPhase = 'request' | 'waiting' | 'sas' | 'completed' | 'cancelled';

interface VerificationDialogProps {
  open: boolean;
  phase: VerificationPhase;
  otherUserId: string | null;
  sasEmoji: Array<[string, string]> | null;
  loading: boolean;
  onAccept: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

const isTerminalPhase = (phase: VerificationPhase) =>
  phase === 'completed' || phase === 'cancelled';

function formatUserId(userId: string): string {
  const match = userId.match(/^@([^:]+):(.+)$/);
  if (!match) return userId;
  const [, localpart, server] = match;
  const display = localpart.startsWith('peer_') ? localpart.slice(5) : localpart;
  if (display.length > 16) {
    return `${display.slice(0, 8)}...${display.slice(-6)}@${server}`;
  }
  return `${display}@${server}`;
}

export function VerificationDialog({
  open,
  phase,
  otherUserId,
  sasEmoji,
  loading,
  onAccept,
  onConfirm,
  onCancel,
  onClose,
}: VerificationDialogProps) {
  const { t } = useI18n();

  const getUserInitial = () => {
    if (!otherUserId) return '?';
    const match = otherUserId.match(/^@([^:]+)/);
    const localpart = match ? match[1] : otherUserId;
    const display = localpart.startsWith('peer_') ? localpart.slice(5) : localpart;
    return display.charAt(0).toUpperCase() || '?';
  };

  const canDismiss = isTerminalPhase(phase);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={v => {
        if (!v && canDismiss) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={e => {
            if (!canDismiss) e.preventDefault();
          }}
          onEscapeKeyDown={e => {
            if (!canDismiss) e.preventDefault();
          }}
          onInteractOutside={e => {
            if (!canDismiss) e.preventDefault();
          }}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-[420px] translate-x-[-50%] translate-y-[-50%]',
            'border border-border bg-surface rounded-xl shadow-2xl',
            'p-0 duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          {canDismiss && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}

          {/* Header banner */}
          <div
            className={cn(
              'px-6 pt-6 pb-4 rounded-t-xl',
              phase === 'completed' && 'bg-green-500/10',
              phase === 'cancelled' && 'bg-destructive/10',
              !isTerminalPhase(phase) && 'bg-primary/5'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  phase === 'completed' && 'bg-green-500/20',
                  phase === 'cancelled' && 'bg-destructive/20',
                  !isTerminalPhase(phase) && 'bg-primary/15'
                )}
              >
                {phase === 'completed' ? (
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                ) : phase === 'cancelled' ? (
                  <ShieldX className="w-5 h-5 text-destructive" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-text-primary">
                  {phase === 'request' && (t('chat.verificationTitle') || 'Verification Request')}
                  {phase === 'waiting' && (t('chat.verificationWaiting') || 'Verifying...')}
                  {phase === 'sas' && (t('chat.verificationSasTitle') || 'Verify Emoji')}
                  {phase === 'completed' && (t('chat.verificationCompleted') || 'Verified!')}
                  {phase === 'cancelled' && (t('chat.verificationCancelled') || 'Cancelled')}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-text-secondary mt-0.5">
                  {phase === 'request' &&
                    (t('chat.verificationRequestSubtitle') ||
                      'Someone wants to verify your identity')}
                  {phase === 'waiting' &&
                    (t('chat.verificationWaitingSubtitle') || 'Waiting for the other user...')}
                  {phase === 'sas' &&
                    (t('chat.verificationSasSubtitle') || 'Compare emoji to verify')}
                  {phase === 'completed' &&
                    (t('chat.verificationCompletedSubtitle') || 'Identity verified successfully')}
                  {phase === 'cancelled' &&
                    (t('chat.verificationCancelledSubtitle') || 'Verification was cancelled')}
                </DialogPrimitive.Description>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {(phase === 'request' || phase === 'waiting') && otherUserId && (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
                  {getUserInitial()}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text-primary block truncate">
                    {formatUserId(otherUserId)}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {t('chat.verificationRequestMessage') ||
                      'This helps ensure your messages are secure.'}
                  </span>
                </div>
              </div>
            )}

            {phase === 'waiting' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-text-secondary">
                  {t('chat.verificationWaitingMessage') ||
                    'Waiting for the other user to accept...'}
                </p>
              </div>
            )}

            {phase === 'sas' && sasEmoji && (
              <>
                <p className="text-sm text-text-secondary text-center mb-4">
                  {t('chat.verificationSasInstruction') ||
                    'Verify that the following emoji appear in the same order on both devices:'}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-2 p-3 rounded-lg bg-muted/50">
                  {sasEmoji.map(([emoji, name], index) => (
                    <div key={index} className="flex flex-col items-center w-14 py-1">
                      <span className="text-2xl leading-none">{emoji}</span>
                      <span className="text-[10px] text-text-secondary capitalize mt-1 leading-tight text-center">
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {phase === 'completed' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <ShieldCheck className="w-12 h-12 text-green-500" />
                <p className="text-sm text-text-secondary text-center">
                  {t('chat.verificationSuccess') ||
                    'Your messages with this user are now verified.'}
                </p>
              </div>
            )}

            {phase === 'cancelled' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <ShieldX className="w-12 h-12 text-destructive" />
                <p className="text-sm text-text-secondary text-center">
                  {t('chat.verificationCancelledMessage') || 'Verification was cancelled.'}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end px-6 pb-6">
            {phase === 'waiting' && (
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            )}
            {phase === 'request' && (
              <>
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  {t('chat.verificationDecline') || 'Decline'}
                </Button>
                <Button onClick={onAccept} disabled={loading} size="lg">
                  {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {t('chat.verificationAccept') || 'Accept'}
                </Button>
              </>
            )}
            {phase === 'sas' && (
              <>
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  {t('chat.verificationNoMatch') || "They don't match"}
                </Button>
                <Button onClick={onConfirm} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {t('chat.verificationMatch') || 'They match'}
                </Button>
              </>
            )}
            {(phase === 'completed' || phase === 'cancelled') && (
              <Button variant="outline" onClick={onClose}>
                {t('common.close') || 'Close'}
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
