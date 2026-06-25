import { getEnvConfig } from '../config/env';

const SOLANA_EXPLORER = 'https://explorer.solana.com';

export function getSolanaExplorerBaseUrl(isDevnet?: boolean): string {
  const devnet = isDevnet ?? getEnvConfig().isTestEnv;
  return devnet ? `${SOLANA_EXPLORER}?cluster=devnet` : SOLANA_EXPLORER;
}

export function getSolanaExplorerTxUrl(signature: string, isDevnet?: boolean): string {
  const trimmed = signature.trim();
  if (!trimmed) return '';
  const devnet = isDevnet ?? getEnvConfig().isTestEnv;
  const path = `/tx/${encodeURIComponent(trimmed)}`;
  return devnet ? `${SOLANA_EXPLORER}${path}?cluster=devnet` : `${SOLANA_EXPLORER}${path}`;
}

export function getSolanaExplorerAddressUrl(address: string, isDevnet?: boolean): string {
  const trimmed = address.trim();
  if (!trimmed) return '';
  const devnet = isDevnet ?? getEnvConfig().isTestEnv;
  const path = `/address/${encodeURIComponent(trimmed)}`;
  return devnet ? `${SOLANA_EXPLORER}${path}?cluster=devnet` : `${SOLANA_EXPLORER}${path}`;
}
