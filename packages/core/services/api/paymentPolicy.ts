/**
 * Store-level payment policy API (UTXO confirmation strategy, etc.)
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPut } from './helpers';

export type UtxoConfirmationPolicy = 'chain_confirmed' | 'mempool_accepted';

export interface StorePaymentPolicy {
  utxoConfirmationPolicy: UtxoConfirmationPolicy;
}

export function getStorePaymentPolicy(): Promise<StorePaymentPolicy> {
  return authGet<StorePaymentPolicy>(NODE_API.SETTINGS_PAYMENT_POLICY);
}

export function updateStorePaymentPolicy(policy: StorePaymentPolicy): Promise<StorePaymentPolicy> {
  return authPut<StorePaymentPolicy>(NODE_API.SETTINGS_PAYMENT_POLICY, policy);
}
