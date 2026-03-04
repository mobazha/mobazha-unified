/**
 * Fiat Payment API Service
 *
 * Buyer endpoints: getProviders, createPayment, capturePayment
 * Seller endpoints: getConfig, saveConfig, deleteConfig, getProviderStatus
 * SaaS onboarding: startOnboarding, getOnboardingStatus
 */

import { NODE_API, HOSTING_API } from '../../config/apiPaths';
import { authGet, authPost, authPut, authDel, publicGet, hostingPost, hostingGet } from './helpers';
import type {
  FiatProviderInfo,
  FiatPaymentSession,
  FiatPaymentResult,
  FiatAccountStatus,
  FiatProviderConfigView,
  FiatProviderConfigInput,
  CreateFiatPaymentParams,
} from '../../types/fiat';
import type { DataEnvelope } from '../../types/common';

// ========== Buyer-facing ==========

export async function getProviders(vendorPeerID?: string): Promise<FiatProviderInfo[]> {
  const qs = vendorPeerID ? `?vendor=${vendorPeerID}` : '';
  const res = await publicGet<DataEnvelope<FiatProviderInfo[]>>(`${NODE_API.FIAT_PROVIDERS}${qs}`);
  return Array.isArray(res?.data) ? res.data : [];
}

export async function createPayment(
  provider: string,
  params: CreateFiatPaymentParams
): Promise<FiatPaymentSession> {
  const res = await authPost<DataEnvelope<FiatPaymentSession>>(
    NODE_API.FIAT_CREATE_PAYMENT(provider),
    params
  );
  return res.data;
}

export async function capturePayment(
  provider: string,
  sessionID: string
): Promise<FiatPaymentResult> {
  const res = await authPost<DataEnvelope<FiatPaymentResult>>(
    NODE_API.FIAT_CAPTURE_PAYMENT(provider, sessionID)
  );
  return res.data;
}

// ========== Seller-facing (standalone mode) ==========

export async function getProviderStatus(provider: string): Promise<FiatAccountStatus> {
  const res = await authGet<DataEnvelope<FiatAccountStatus>>(
    NODE_API.FIAT_PROVIDER_STATUS(provider)
  );
  return res.data;
}

export async function getConfig(): Promise<FiatProviderConfigView[]> {
  const res = await authGet<DataEnvelope<FiatProviderConfigView[]>>(NODE_API.FIAT_PROVIDER_CONFIG);
  return res.data;
}

export async function saveConfig(provider: string, input: FiatProviderConfigInput): Promise<void> {
  await authPut<DataEnvelope<null>>(NODE_API.FIAT_PROVIDER_CONFIG_BY_ID(provider), input);
}

export async function deleteConfig(provider: string): Promise<void> {
  await authDel<DataEnvelope<null>>(NODE_API.FIAT_PROVIDER_CONFIG_BY_ID(provider));
}

// ========== SaaS onboarding ==========

export async function startOnboarding(
  provider: string,
  opts?: { returnURL?: string; refreshURL?: string }
): Promise<{ url: string }> {
  const res = await hostingPost<DataEnvelope<{ url: string }>>(
    HOSTING_API.FIAT_ONBOARDING_START(provider),
    {
      returnURL: opts?.returnURL || '',
      refreshURL: opts?.refreshURL || '',
    }
  );
  return res.data;
}

export async function getOnboardingStatus(provider: string): Promise<FiatAccountStatus> {
  const res = await hostingGet<DataEnvelope<FiatAccountStatus>>(
    HOSTING_API.FIAT_ONBOARDING_STATUS(provider)
  );
  return res.data;
}
