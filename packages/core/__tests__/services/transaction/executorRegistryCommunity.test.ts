import { describe, expect, it, afterEach } from 'vitest';

import {
  getExecutorRegistry,
  getPaymentExecutor,
  resetExecutorRegistry,
} from '../../../services/transaction/executorRegistry';

describe('Community Edition executor registry', () => {
  afterEach(() => {
    resetExecutorRegistry();
  });

  it('registers no frontend payment executors', () => {
    const registry = getExecutorRegistry();
    expect(registry.categories()).toEqual([]);
  });

  it('returns null for EVM and Solana checkout paths', () => {
    expect(getPaymentExecutor('ETHEREUM', 'ETH')).toBeNull();
    expect(getPaymentExecutor('SOLANA', 'SOL')).toBeNull();
    expect(getPaymentExecutor('TRON', 'TRX')).toBeNull();
  });

  it('returns null for UTXO checkout (backend-monitored)', () => {
    expect(getPaymentExecutor('BITCOIN', 'BTC')).toBeNull();
    expect(getPaymentExecutor('ZCASH', 'ZEC')).toBeNull();
  });
});
