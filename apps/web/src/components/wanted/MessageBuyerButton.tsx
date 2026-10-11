// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useI18n, useMatrixChat } from '@mobazha/core';

interface MessageBuyerButtonProps {
  buyerPeerID: string;
  buyerName?: string;
}

/**
 * Opens a direct conversation with the buyer of a buy request.
 *
 * Chat runs on Matrix, and a node only provisions it when it is configured with
 * a registration secret or can obtain a homeserver from the platform. On a node
 * without it, `POST /v1/chat/rooms` answers 503, so a button that always tries
 * would just fail every time. The entry point therefore states that direct
 * messages are unavailable instead of offering a control that cannot work; the
 * public comment thread stays usable either way.
 *
 * The room is created through the node's get-or-create endpoint, so pressing
 * this twice does not start two conversations.
 */
export function MessageBuyerButton({ buyerPeerID, buyerName }: MessageBuyerButtonProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { isConnected, createDirectRoom } = useMatrixChat();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!isConnected) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('wanted.chatUnavailable', {
          defaultValue: 'Direct messages are unavailable on this node.',
        })}
      </p>
    );
  }

  const openConversation = async () => {
    setFailed(false);
    setBusy(true);
    try {
      const roomId = await createDirectRoom(buyerPeerID, buyerName);
      if (!roomId) {
        setFailed(true);
        return;
      }
      router.push('/chat');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" onClick={openConversation} disabled={busy}>
        {busy
          ? t('wanted.messageBuyerOpening', { defaultValue: 'Opening...' })
          : t('wanted.messageBuyer', { defaultValue: 'Message buyer' })}
      </Button>
      {failed && (
        <p className="text-xs text-destructive">
          {t('wanted.errorMessage', {
            defaultValue: 'Could not open the conversation. Please try again.',
          })}
        </p>
      )}
    </div>
  );
}
