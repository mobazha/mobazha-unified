'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';

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
    return otherUserId.charAt(1).toUpperCase() || '?';
  };

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {phase === 'completed' ? (
              <ShieldCheck className="w-5 h-5 text-green-500" />
            ) : phase === 'cancelled' ? (
              <ShieldX className="w-5 h-5 text-destructive" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-primary" />
            )}
            {phase === 'request' && (t('chat.verificationTitle') || 'Verification Request')}
            {phase === 'waiting' && (t('chat.verificationWaiting') || 'Verifying...')}
            {phase === 'sas' && (t('chat.verificationSasTitle') || 'Verify Emoji')}
            {phase === 'completed' && (t('chat.verificationCompleted') || 'Verified!')}
            {phase === 'cancelled' && (t('chat.verificationCancelled') || 'Cancelled')}
          </DialogTitle>
          <DialogDescription>
            {phase === 'request' &&
              (t('chat.verificationRequestSubtitle') || 'Someone wants to verify your identity')}
            {phase === 'waiting' &&
              (t('chat.verificationWaitingSubtitle') || 'Waiting for the other user...')}
            {phase === 'sas' && (t('chat.verificationSasSubtitle') || 'Compare emoji to verify')}
            {phase === 'completed' &&
              (t('chat.verificationCompletedSubtitle') || 'Identity verified successfully')}
            {phase === 'cancelled' &&
              (t('chat.verificationCancelledSubtitle') || 'Verification was cancelled')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* User Info */}
          {(phase === 'request' || phase === 'waiting') && otherUserId && (
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                {getUserInitial()}
              </div>
              <span className="text-sm font-mono text-muted-foreground truncate">
                {otherUserId}
              </span>
            </div>
          )}

          {/* Request phase */}
          {phase === 'request' && (
            <p className="text-sm text-muted-foreground text-center">
              {t('chat.verificationRequestMessage') ||
                'This helps ensure your messages are secure.'}
            </p>
          )}

          {/* Waiting phase */}
          {phase === 'waiting' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('chat.verificationWaitingMessage') || 'Waiting for the other user to accept...'}
              </p>
            </div>
          )}

          {/* SAS emoji grid */}
          {phase === 'sas' && sasEmoji && (
            <>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {t('chat.verificationSasInstruction') ||
                  'Verify that the following emoji appear in the same order on both devices:'}
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                {sasEmoji.map(([emoji, name], index) => (
                  <div key={index} className="flex flex-col items-center w-16">
                    <span className="text-3xl">{emoji}</span>
                    <span className="text-[10px] text-muted-foreground capitalize mt-0.5">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Completed */}
          {phase === 'completed' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="text-5xl">✅</div>
              <p className="text-sm text-muted-foreground text-center">
                {t('chat.verificationSuccess') || 'Your messages with this user are now verified.'}
              </p>
            </div>
          )}

          {/* Cancelled */}
          {phase === 'cancelled' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="text-5xl">❌</div>
              <p className="text-sm text-muted-foreground text-center">
                {t('chat.verificationCancelledMessage') || 'Verification was cancelled.'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
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
              <Button onClick={onAccept} disabled={loading}>
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
      </DialogContent>
    </Dialog>
  );
}
