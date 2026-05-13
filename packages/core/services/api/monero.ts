/**
 * Monero (XMR) admin API — Outpost only
 *
 * Backend:
 *   - mobazha3.0/internal/api/monero_node_pool_handler.go
 *   - mobazha3.0/internal/api/monero_wallet_handler.go
 *   - mobazha3.0/internal/api/huma_system_handlers_outpost.go
 *   - mobazha3.0/internal/api/huma_wallet_xmr_outpost.go
 *
 * Two endpoint families:
 *
 *   /v1/system/monero-nodes/*   — daemon NodePool admin
 *     GET    /v1/system/monero-nodes              list candidates + active
 *     POST   /v1/system/monero-nodes              add user-supplied node
 *     DELETE /v1/system/monero-nodes/{address}    remove user-added node
 *     POST   /v1/system/monero-nodes/{address}/switch  rebind wallet-rpc
 *
 *   /v1/wallet/xmr/*            — wallet-level operations
 *     POST   /v1/wallet/xmr/withdraw    send to external address
 *     POST   /v1/wallet/xmr/sweep-all   sweep entire balance
 *
 * Amount is a decimal piconero string (1 XMR = 10^12 piconero). String not
 * number because JS Number's safe-integer limit (2^53 ≈ 9007 XMR) is below
 * realistic outpost balances. The backend ParseAmount accepts the same
 * format and rejects empty/zero/non-numeric/overflow.
 */

import { authGet, authPost, authDel } from './helpers';
import { NODE_API } from '../../config/apiPaths';

// =====================================================================
// NodePool types — mirror pkg/contracts/contracts.go
// =====================================================================

export interface MoneroNodeInfo {
  address: string;
  operator?: string;
  /** "seed-embedded" | "discovered" | "user-added" */
  source: string;
  successStreak: number;
  failStreak: number;
  suspicious: boolean;
  /** RFC3339 timestamp; empty if never probed */
  lastChecked?: string;
}

export interface MoneroNodePoolSnapshot {
  /** false on legacy single-daemon nodes or when NodePool bootstrap failed */
  available: boolean;
  /** active node bound, not Suspicious, fail-streak under threshold */
  healthy: boolean;
  /** background MonitorLoop running */
  monitorOn: boolean;
  /** currently bound daemon; null when no active binding */
  active?: MoneroNodeInfo;
  /** full pool snapshot in insertion order (active also appears here) */
  candidates: MoneroNodeInfo[];
}

export interface MoneroNodeAddRequest {
  /** I2P / Tor / clearnet host:port, e.g. "node.example.b32.i2p:18089" */
  address: string;
  /** human-readable label, e.g. "MoneroWorld" */
  operator?: string;
}

// =====================================================================
// Wallet types
// =====================================================================

/**
 * Decimal piconero string (1 XMR = "1000000000000"). See file header for
 * the rationale behind string-on-the-wire.
 */
export type Piconero = string;

export interface MoneroWithdrawRequest {
  /** Destination Monero address (95–110 chars after trim) */
  address: string;
  /** Decimal piconero string, > 0 */
  amount: Piconero;
  /** 0=default (wallet decides), 1..4=increasing priority/fee */
  priority?: number;
  /**
   * Optional account index. null/undefined falls back to the node's
   * --xmraccount startup default. Explicit 0 selects the primary account
   * and is honoured as such (not treated as "unset").
   */
  accountIndex?: number | null;
}

export interface MoneroWithdrawResult {
  txHash: string;
  txKey?: string;
  /** Decimal piconero strings */
  amount: Piconero;
  fee: Piconero;
}

export interface MoneroSweepAllRequest {
  address: string;
  priority?: number;
  accountIndex?: number | null;
  /** When non-empty, restricts sweep to listed subaddress minor indices */
  subaddrIndices?: number[];
}

export interface MoneroSweepAllResult {
  txHashes: string[];
  txKeys?: string[];
  amounts: Piconero[];
  fees: Piconero[];
}

// =====================================================================
// NodePool API
// =====================================================================

export async function getMoneroNodes(): Promise<MoneroNodePoolSnapshot> {
  return authGet<MoneroNodePoolSnapshot>(NODE_API.SYSTEM_MONERO_NODES);
}

export async function addMoneroNode(req: MoneroNodeAddRequest): Promise<MoneroNodeInfo> {
  return authPost<MoneroNodeInfo>(NODE_API.SYSTEM_MONERO_NODES, req);
}

export async function removeMoneroNode(address: string): Promise<void> {
  await authDel<void>(NODE_API.SYSTEM_MONERO_NODE(address));
}

/** Returns the refreshed pool snapshot so callers don't need a follow-up GET. */
export async function switchMoneroNode(address: string): Promise<MoneroNodePoolSnapshot> {
  return authPost<MoneroNodePoolSnapshot>(NODE_API.SYSTEM_MONERO_NODE_SWITCH(address));
}

// =====================================================================
// Wallet API
// =====================================================================

export async function withdrawXMR(req: MoneroWithdrawRequest): Promise<MoneroWithdrawResult> {
  return authPost<MoneroWithdrawResult>(NODE_API.WALLET_XMR_WITHDRAW, req);
}

export async function sweepAllXMR(req: MoneroSweepAllRequest): Promise<MoneroSweepAllResult> {
  return authPost<MoneroSweepAllResult>(NODE_API.WALLET_XMR_SWEEP_ALL, req);
}

// =====================================================================
// Setup wizard (OP-MP-2.5)
// =====================================================================
// First-run XMR wallet provisioning. The backend persists xmr-wallet.json
// locally and auto-opens the wallet on subsequent boots, so the wizard
// should appear at most once per outpost lifetime (unless the operator
// resets state on disk).

export interface MoneroWalletSetupStatus {
  /** xmr-wallet.json exists on disk */
  exists: boolean;
  /** Live wallet-rpc state via GetAddress probe; false on transient outages */
  walletOpen: boolean;
  /** Primary address; empty before create/restore */
  address?: string;
  /** Operator confirmed they backed up the seed (UX-only, does not gate fns) */
  backupConfirmed: boolean;
  /** Unix seconds; 0 before create/restore */
  createdAt: number;
}

export interface MoneroCreateWalletResult {
  /** 25-word English seed — display once, never persist client-side */
  mnemonic: string;
  /** Primary address for this wallet/account */
  address: string;
}

export interface MoneroRestoreWalletRequest {
  /** 25-word English seed (whitespace-separated) */
  seed: string;
  language?: string;
  /** Block height to start scanning from; 0 = full rescan */
  restoreHeight?: number;
}

export interface MoneroRestoreWalletResult {
  address: string;
}

export async function getXMRWalletSetupStatus(): Promise<MoneroWalletSetupStatus> {
  return authGet<MoneroWalletSetupStatus>(NODE_API.SYSTEM_SETUP_WIZARD_XMR_WALLET);
}

export async function createXMRWallet(language?: string): Promise<MoneroCreateWalletResult> {
  return authPost<MoneroCreateWalletResult>(NODE_API.SYSTEM_SETUP_WIZARD_XMR_WALLET, {
    action: 'create',
    language,
  });
}

export async function restoreXMRWallet(
  req: MoneroRestoreWalletRequest
): Promise<MoneroRestoreWalletResult> {
  return authPost<MoneroRestoreWalletResult>(NODE_API.SYSTEM_SETUP_WIZARD_XMR_WALLET, {
    action: 'restore',
    seed: req.seed,
    language: req.language,
    restoreHeight: req.restoreHeight,
  });
}

export async function confirmXMRWalletBackup(): Promise<void> {
  await authPost<void>(NODE_API.SYSTEM_SETUP_WIZARD_XMR_WALLET, {
    action: 'confirm-backup',
  });
}

// =====================================================================
// Frontend formatting helpers
// =====================================================================

/**
 * Format piconero string as a human-readable XMR amount, e.g.
 *   "1000000000000" → "1.000000000000"
 *
 * Does NOT round. Use Intl.NumberFormat at the call site if you need to
 * display fewer significant digits. Returns the original string if it
 * isn't a parseable BigInt (preserves error visibility instead of
 * silently rendering "NaN").
 */
// BigInt constructor form (not literal `0n` / `1_000_000_000_000n`) — keeps
// this module compilable under tsconfig targets below ES2020 that still
// have BigInt at runtime via lib.dom.
const ZERO = BigInt(0);
const PICO_PER_XMR = BigInt('1000000000000'); // 10^12

export function piconeroToXMR(piconero: Piconero): string {
  try {
    const value = BigInt(piconero);
    const negative = value < ZERO;
    const abs = negative ? -value : value;
    const whole = abs / PICO_PER_XMR;
    const frac = abs % PICO_PER_XMR;
    const fracStr = frac.toString().padStart(12, '0').replace(/0+$/, '') || '0';
    return `${negative ? '-' : ''}${whole.toString()}.${fracStr}`;
  } catch {
    return piconero;
  }
}

/**
 * Convert a human-readable XMR decimal string (e.g. "1.5", "0.0001") to
 * the piconero string the backend expects. Throws on invalid input rather
 * than silently sending a zero — callers should surface the error in form
 * validation.
 *
 * Trailing/leading whitespace is trimmed. Scientific notation is rejected.
 */
export function xmrToPiconero(xmr: string): Piconero {
  const trimmed = xmr.trim();
  if (!trimmed) throw new Error('amount is required');
  if (!/^\d+(\.\d{1,12})?$/.test(trimmed)) {
    throw new Error('amount must be a decimal with at most 12 fractional digits');
  }
  const [whole, frac = ''] = trimmed.split('.');
  const padded = (frac + '000000000000').slice(0, 12);
  const wholePart = BigInt(whole) * PICO_PER_XMR;
  const fracPart = BigInt(padded);
  const total = wholePart + fracPart;
  if (total === ZERO) throw new Error('amount must be > 0');
  return total.toString();
}
