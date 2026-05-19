import { getEnvConfig } from '../../config/env';
import { parseCanonicalPaymentCoin } from '../../data/tokens';

const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function isFiatLikeCoin(coin?: string): boolean {
  const trimmed = (coin || '').trim();
  if (!trimmed) return true;
  if (trimmed.toLowerCase().startsWith('fiat:')) return true;
  return /^[A-Z]{3,8}$/.test(trimmed);
}

function looksLikeEvmTxHash(value?: string): boolean {
  return EVM_TX_HASH_RE.test((value || '').trim());
}

function looksLikeEvmAddress(value?: string): boolean {
  return EVM_ADDRESS_RE.test((value || '').trim());
}

function defaultEvmChainId(): number {
  return getEnvConfig().isTestEnv ? 11155111 : 1;
}

function buildCanonicalNativeCoin(chainId: number): string {
  return `crypto:eip155:${chainId}:native`;
}

function buildCanonicalERC20Coin(chainId: number, tokenAddress: string): string {
  return `crypto:eip155:${chainId}:erc20:${tokenAddress}`;
}

function tryExtractEvmChainId(coin?: string): number | undefined {
  const parsed = parseCanonicalPaymentCoin((coin || '').trim());
  if (!parsed || parsed.namespace !== 'eip155') return undefined;
  const chainId = Number(parsed.chainRef);
  return Number.isFinite(chainId) && chainId > 0 ? chainId : undefined;
}

export interface RecoverCryptoPaymentCoinInput {
  reportedCoin?: string;
  txHash?: string;
  toAddress?: string;
  contractAddress?: string;
  paymentTokenAddress?: string;
}

export interface RecoveredCryptoPaymentCoin {
  paymentCoin?: string;
  chainId?: number;
  recovered: boolean;
}

/**
 * Some local/demo order APIs still serialize EVM payments as `coin=USD`
 * while keeping the actual on-chain amount in wei. Recover the canonical
 * asset id so the UI can render the amount and explorer correctly.
 */
export function recoverCryptoPaymentCoin({
  reportedCoin,
  txHash,
  toAddress,
  contractAddress,
  paymentTokenAddress,
}: RecoverCryptoPaymentCoinInput): RecoveredCryptoPaymentCoin {
  const trimmedCoin = (reportedCoin || '').trim();
  const explicitChainId = tryExtractEvmChainId(trimmedCoin);
  if (explicitChainId) {
    return {
      paymentCoin: trimmedCoin,
      chainId: explicitChainId,
      recovered: false,
    };
  }

  if (!isFiatLikeCoin(trimmedCoin) || !looksLikeEvmTxHash(txHash)) {
    return { paymentCoin: trimmedCoin || undefined, recovered: false };
  }

  const hasEvmTarget =
    looksLikeEvmAddress(toAddress) ||
    looksLikeEvmAddress(contractAddress) ||
    looksLikeEvmAddress(paymentTokenAddress);
  if (!hasEvmTarget) {
    return { paymentCoin: trimmedCoin || undefined, recovered: false };
  }

  const chainId = defaultEvmChainId();
  const tokenAddress = (paymentTokenAddress || '').trim();
  const paymentCoin = looksLikeEvmAddress(tokenAddress)
    ? buildCanonicalERC20Coin(chainId, tokenAddress)
    : buildCanonicalNativeCoin(chainId);

  return { paymentCoin, chainId, recovered: true };
}
