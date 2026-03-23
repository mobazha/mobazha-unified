/**
 * Unified RPC Configuration
 *
 * Single source of truth for all blockchain RPC endpoints.
 * Environment variables override hardcoded defaults.
 *
 * ENV VARS:
 *   NEXT_PUBLIC_ETH_RPC_URL        — Ethereum mainnet
 *   NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL — Ethereum Sepolia
 *   NEXT_PUBLIC_BSC_RPC_URL         — BNB Smart Chain
 *   NEXT_PUBLIC_SOL_RPC_URL         — Solana mainnet-beta
 *   NEXT_PUBLIC_SOL_DEVNET_RPC_URL  — Solana devnet
 */

import { ChainId } from '../services/payment/types';
import { CHAIN_CONFIG, getRpcUrl as getChainRpcUrl } from '../services/payment/chains';
import { getEnvConfig } from './env';

// ── ENV var → ChainId mapping ────────────────────────

const ENV_RPC_OVERRIDES: Partial<Record<ChainId, string>> = {};

function readEnv(key: string): string | undefined {
  if (typeof process !== 'undefined') {
    return process.env?.[key] || undefined;
  }
  return undefined;
}

function initEnvOverrides() {
  const map: Array<[string, ChainId]> = [
    ['NEXT_PUBLIC_ETH_RPC_URL', ChainId.ETHEREUM],
    ['NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL', ChainId.ETHEREUM_SEPOLIA],
    ['NEXT_PUBLIC_BSC_RPC_URL', ChainId.BSC],
    ['NEXT_PUBLIC_BSC_TESTNET_RPC_URL', ChainId.BSC_TESTNET],
    ['NEXT_PUBLIC_POLYGON_RPC_URL', ChainId.POLYGON],
    ['NEXT_PUBLIC_ARB_RPC_URL', ChainId.ARBITRUM],
    ['NEXT_PUBLIC_OP_RPC_URL', ChainId.OPTIMISM],
    ['NEXT_PUBLIC_AVAX_RPC_URL', ChainId.AVALANCHE],
  ];
  for (const [envKey, chainId] of map) {
    const val = readEnv(envKey);
    if (val) {
      ENV_RPC_OVERRIDES[chainId] = val;
    }
  }
}

try {
  initEnvOverrides();
} catch {
  // safe in browser — Vite replaces process.env at build time
}

// ── EVM RPC ──────────────────────────────────────────

/**
 * Get the primary RPC URL for an EVM chain.
 * Priority: env var override → first URL in CHAIN_CONFIG.
 */
export function getEvmRpcUrl(chainId: ChainId): string {
  return ENV_RPC_OVERRIDES[chainId] || getChainRpcUrl(chainId);
}

/**
 * Get all fallback RPC URLs for an EVM chain (including env override as first).
 */
export function getEvmFallbackRpcUrls(chainId: ChainId): string[] {
  const chain = CHAIN_CONFIG[chainId];
  if (!chain) return [];
  const envUrl = ENV_RPC_OVERRIDES[chainId];
  if (envUrl) {
    return [envUrl, ...chain.rpcUrls.filter(u => u !== envUrl)];
  }
  return [...chain.rpcUrls];
}

// ── Solana RPC ───────────────────────────────────────

/**
 * Get the Solana RPC endpoint.
 * Priority: env var → public endpoint.
 */
export function getSolanaRpcUrl(isDevnet?: boolean): string {
  const devnet = isDevnet ?? getEnvConfig().isTestEnv;
  if (devnet) {
    return readEnv('NEXT_PUBLIC_SOL_DEVNET_RPC_URL') || 'https://api.devnet.solana.com';
  }
  return readEnv('NEXT_PUBLIC_SOL_RPC_URL') || 'https://api.mainnet-beta.solana.com';
}

// ── Convenience re-exports ──────────────────────────

export { ChainId } from '../services/payment/types';
