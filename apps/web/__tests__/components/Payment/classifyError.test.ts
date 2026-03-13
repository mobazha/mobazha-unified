import { describe, it, expect } from 'vitest';
import { classifyError } from '@/components/Payment/TransactionOverlay';

describe('classifyError', () => {
  it('returns errorInsufficientFunds for balance-related errors', () => {
    expect(classifyError('insufficient funds for gas')).toBe('errorInsufficientFunds');
    expect(classifyError('not enough balance to cover tx')).toBe('errorInsufficientFunds');
    expect(classifyError('transfer amount exceeds balance')).toBe('errorInsufficientFunds');
  });

  it('returns errorUserRejected for user cancellation', () => {
    expect(classifyError('MetaMask Tx Signature: User denied transaction')).toBe(
      'errorUserRejected'
    );
    expect(classifyError('Transaction was rejected by user')).toBe('errorUserRejected');
    expect(classifyError('User cancelled the operation')).toBe('errorUserRejected');
    expect(classifyError('user refused to sign')).toBe('errorUserRejected');
  });

  it('returns errorContractReverted for smart contract failures', () => {
    expect(classifyError('execution reverted: ERC20: transfer amount exceeds allowance')).toBe(
      'errorContractReverted'
    );
    expect(classifyError('call exception')).toBe('errorContractReverted');
    expect(classifyError('transaction revert')).toBe('errorContractReverted');
  });

  it('returns errorNetworkCongestion for network issues', () => {
    expect(classifyError('transaction timeout')).toBe('errorNetworkCongestion');
    expect(classifyError('network congestion detected')).toBe('errorNetworkCongestion');
    expect(classifyError('replacement fee too low')).toBe('errorNetworkCongestion');
  });

  it('returns empty string for unrecognized errors', () => {
    expect(classifyError('something unexpected')).toBe('');
    expect(classifyError('')).toBe('');
    expect(classifyError('unknown error code 42')).toBe('');
  });

  it('is case-insensitive', () => {
    expect(classifyError('INSUFFICIENT funds')).toBe('errorInsufficientFunds');
    expect(classifyError('User DENIED transaction')).toBe('errorUserRejected');
    expect(classifyError('EXECUTION REVERTED')).toBe('errorContractReverted');
  });

  it('matches first applicable category when multiple keywords present', () => {
    expect(classifyError('insufficient funds, execution reverted')).toBe('errorInsufficientFunds');
  });
});
