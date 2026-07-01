'use client';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorefrontPeerID, useUserStore } from '@mobazha/core';

/**
 * /store (no peerId) — resolves the local store's peerId and redirects.
 * Used in Sovereign / Standalone mode where there is only one store,
 * so the URL stays clean without exposing the raw peerId.
 */
export default function StoreIndexRedirect() {
  const navigate = useNavigate();
  const storefrontPeerID = useStorefrontPeerID();
  const { profile } = useUserStore();

  const peerId = storefrontPeerID || profile?.peerID;

  useEffect(() => {
    if (peerId) {
      navigate(`/store/${peerId}`, { replace: true });
    }
  }, [peerId, navigate]);

  return null;
}
