/**
 * Fiat Payment API Service
 *
 * Buyer endpoints: getProviders, createPayment, capturePayment
 * Seller endpoints: getConfig, saveConfig, deleteConfig, getProviderStatus
 * SaaS onboarding: startOnboarding, getOnboardingStatus
 * SaaS disconnect: disconnectProvider
 *
 * NOTE: client.ts request() auto-unwraps {"data": ...} envelopes,
 * so callers receive the inner payload directly — do NOT access .data again.
 */

import { NODE_API, HOSTING_API } from '../../config/apiPaths';
import {
  authGet,
  authPost,
  authPut,
  authDel,
  publicGet,
  hostingPost,
  hostingGet,
  hostingDel,
} from './helpers';
import type {
  FiatProviderInfo,
  PaymentMethodsResponse,
  FiatPaymentSession,
  FiatPaymentResult,
  FiatAccountStatus,
  FiatProviderConfigView,
  FiatProviderConfigInput,
  CreateFiatPaymentParams,
  FiatRefundParams,
  FiatRefundResult,
  WebhookSetupResult,
} from '../../types/fiat';

// ========== Buyer-facing ==========

export async function getPaymentMethods(peerID: string): Promise<PaymentMethodsResponse> {
  const res = await publicGet<PaymentMethodsResponse>(NODE_API.PAYMENT_METHODS_PUBLIC(peerID));
  return {
    crypto: Array.isArray(res?.crypto) ? res.crypto : [],
    fiat: Array.isArray(res?.fiat) ? res.fiat : [],
  };
}

export async function getProviders(vendorPeerID?: string): Promise<FiatProviderInfo[]> {
  const path = vendorPeerID
    ? NODE_API.FIAT_PROVIDERS_PUBLIC(vendorPeerID)
    : NODE_API.FIAT_PROVIDERS;
  const res = await publicGet<FiatProviderInfo[]>(path);
  return Array.isArray(res) ? res : [];
}

export async function createPayment(
  vendorPeerID: string,
  provider: string,
  params: CreateFiatPaymentParams
): Promise<FiatPaymentSession> {
  return authPost<FiatPaymentSession>(NODE_API.FIAT_CREATE_PAYMENT(vendorPeerID, provider), params);
}

export async function capturePayment(
  vendorPeerID: string,
  provider: string,
  sessionID: string
): Promise<FiatPaymentResult> {
  return authPost<FiatPaymentResult>(
    NODE_API.FIAT_CAPTURE_PAYMENT(vendorPeerID, provider, sessionID)
  );
}

export async function refundPayment(
  provider: string,
  paymentID: string,
  params?: FiatRefundParams
): Promise<FiatRefundResult> {
  return authPost<FiatRefundResult>(
    NODE_API.FIAT_REFUND_PAYMENT(provider, paymentID),
    params ?? {}
  );
}

// ========== Seller-facing (standalone mode) ==========

export async function getProviderStatus(provider: string): Promise<FiatAccountStatus> {
  return authGet<FiatAccountStatus>(NODE_API.FIAT_PROVIDER_STATUS(provider));
}

const FIAT_PROVIDER_IDS = ['stripe', 'paypal'] as const;

export async function getConfig(): Promise<FiatProviderConfigView[]> {
  const results = await Promise.allSettled(
    FIAT_PROVIDER_IDS.map(id => authGet<FiatProviderConfigView>(NODE_API.FIAT_PROVIDER_CONFIG(id)))
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<FiatProviderConfigView> =>
        r.status === 'fulfilled' && r.value != null
    )
    .map(r => r.value);
}

export async function saveConfig(
  provider: string,
  input: FiatProviderConfigInput
): Promise<FiatProviderConfigView> {
  return authPut<FiatProviderConfigView>(NODE_API.FIAT_PROVIDER_CONFIG(provider), input);
}

export async function deleteConfig(provider: string): Promise<void> {
  await authDel<null>(NODE_API.FIAT_PROVIDER_CONFIG(provider));
}

export async function verifyConfig(provider: string): Promise<void> {
  await authPost<{ verified: boolean }>(NODE_API.FIAT_PROVIDER_VERIFY(provider), {});
}

export async function setupWebhook(provider: string): Promise<WebhookSetupResult> {
  return authPost<WebhookSetupResult>(NODE_API.FIAT_SETUP_WEBHOOK(provider), {});
}

// ========== SaaS onboarding ==========

export async function startOnboarding(
  provider: string,
  opts?: { returnURL?: string; refreshURL?: string }
): Promise<{ url: string }> {
  return hostingPost<{ url: string }>(HOSTING_API.FIAT_ONBOARDING_START(provider), {
    returnURL: opts?.returnURL || '',
    refreshURL: opts?.refreshURL || '',
  });
}

export async function getOnboardingStatus(provider: string): Promise<FiatAccountStatus> {
  return hostingGet<FiatAccountStatus>(HOSTING_API.FIAT_ONBOARDING_STATUS(provider));
}

export async function disconnectProvider(provider: string): Promise<void> {
  await hostingDel<null>(HOSTING_API.FIAT_ONBOARDING_CONNECTION(provider));
}
