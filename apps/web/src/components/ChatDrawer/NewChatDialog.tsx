'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n, useChatStore } from '@mobazha/core';

const PEER_ID_PATTERN = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|12D3Koo[1-9A-HJ-NP-Za-km-z]{44,50})$/;

function isValidPeerID(id: string): boolean {
  return PEER_ID_PATTERN.test(id);
}

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewChatDialog: React.FC<NewChatDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useI18n();
  const openDrawerWithPeer = useChatStore(state => state.openDrawerWithPeer);

  const [peerID, setPeerID] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = peerID.trim();
      if (!trimmed) {
        setError(t('chat.newChat.errorEmpty'));
        return;
      }
      if (!isValidPeerID(trimmed)) {
        setError(t('chat.newChat.errorInvalid'));
        return;
      }
      setError('');
      onOpenChange(false);
      setPeerID('');
      openDrawerWithPeer(trimmed);
    },
    [peerID, t, onOpenChange, openDrawerWithPeer]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setPeerID('');
    setError('');
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('chat.newChat.title')}</DialogTitle>
          <DialogDescription>{t('chat.newChat.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Input
              value={peerID}
              onChange={e => {
                setPeerID(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('chat.newChat.placeholder')}
              className="font-mono text-sm"
              autoFocus
            />
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!peerID.trim()}>
              {t('chat.newChat.start')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
