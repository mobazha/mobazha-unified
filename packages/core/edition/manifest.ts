/**
 * Community Edition manifest — machine-readable capability boundary.
 * Source of truth: config/editions/community.json (must stay in sync).
 */

export interface CommunityEditionManifest {
  schemaVersion: number;
  edition: 'community';
  license: 'MPL-2.0';
  paymentPluginSdkLicense: 'Apache-2.0';
  payment: {
    chains: readonly string[];
    rails: readonly string[];
  };
  deploymentTargets: readonly string[];
}

/** Inline manifest projection — keep aligned with config/editions/community.json */
export const COMMUNITY_EDITION_MANIFEST: CommunityEditionManifest = {
  schemaVersion: 1,
  edition: 'community',
  license: 'MPL-2.0',
  paymentPluginSdkLicense: 'Apache-2.0',
  payment: {
    chains: ['BTC', 'BCH', 'LTC'],
    rails: ['utxo_transparent'],
  },
  deploymentTargets: ['standalone'],
};

export const COMMUNITY_PAYMENT_CHAINS = COMMUNITY_EDITION_MANIFEST.payment.chains;

export const COMMUNITY_PAYMENT_CHAIN_SET = new Set<string>(
  COMMUNITY_PAYMENT_CHAINS.map(chain => chain.toUpperCase())
);
