// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Store Policy API (public read)
 *
 * Backend: mobazha/internal/api/store_policy_handlers.go
 */

import { publicGet } from './helpers';
import { NODE_API } from '../../config/apiPaths';

export interface PublishedStoreModerator {
  peerID: string;
  enabled: boolean;
  position: number;
}

export interface PublishedStorePolicy {
  revision: number;
  moderators?: PublishedStoreModerator[];
}

/** Get a store's published policy (moderators etc.) — public, no auth. */
export async function getPublishedStorePolicy(
  peerID: string
): Promise<PublishedStorePolicy | null> {
  return publicGet<PublishedStorePolicy | null>(NODE_API.STORE_POLICY_PUBLISHED(peerID));
}
