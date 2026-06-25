import type { VerticalModuleRef } from '../../curation/types';

/** P1 Hub+NFT vertical mount point (F1). */
export const HUB_NFT_MODULE_ID = 'hub_nft' as const;

export const HUB_NFT_MODULE: VerticalModuleRef = {
  id: HUB_NFT_MODULE_ID,
  fulfillment: 'nft',
};

export function hasHubNftModule(modules: VerticalModuleRef[] | undefined): boolean {
  return (modules ?? []).some(module => module.id === HUB_NFT_MODULE_ID);
}
