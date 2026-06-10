'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Copy,
  Check,
  Wallet,
  LinkIcon,
  AlertCircle,
  MoreHorizontal,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenIcon } from '@/components/Payment';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { BottomSheet, BottomSheetItem } from '@/components/ui/bottom-sheet';
import {
  useI18n,
  useReceivingAccounts,
  useAddReceivingAccount,
  useUpdateReceivingAccount,
  useDeleteReceivingAccount,
  useWallet,
  getEnvConfig,
} from '@mobazha/core';
import WAValidator from 'multicoin-address-validator';
import type { ReceivingAccount, ReceivingAccountInput } from '@mobazha/core/services/api/wallet';

type ChainFamily = 'evm' | 'solana' | 'utxo' | 'tron';
type NetworkMode = 'mainnet' | 'testnet';
type StatusFilter = 'all' | 'active' | 'inactive';

interface ChainMeta {
  id: string;
  name: string;
  color: string;
  family: ChainFamily;
  tokens: { symbol: string; label: string }[];
}

const CHAINS: ChainMeta[] = [
  {
    id: 'BTC',
    name: 'Bitcoin',
    color: '#F7931A',
    family: 'utxo',
    tokens: [{ symbol: 'NATIVE', label: 'BTC' }],
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    color: '#627EEA',
    family: 'evm',
    tokens: [
      { symbol: 'NATIVE', label: 'ETH' },
      { symbol: 'USDT', label: 'USDT' },
      { symbol: 'USDC', label: 'USDC' },
    ],
  },
  {
    id: 'BSC',
    name: 'BNB Chain',
    color: '#F0B90B',
    family: 'evm',
    tokens: [
      { symbol: 'NATIVE', label: 'BNB' },
      { symbol: 'USDT', label: 'USDT' },
      { symbol: 'USDC', label: 'USDC' },
    ],
  },
  {
    id: 'BASE',
    name: 'Base',
    color: '#0052FF',
    family: 'evm',
    tokens: [
      { symbol: 'NATIVE', label: 'ETH' },
      { symbol: 'USDT', label: 'USDT' },
      { symbol: 'USDC', label: 'USDC' },
    ],
  },
  {
    id: 'SOL',
    name: 'Solana',
    color: '#9945FF',
    family: 'solana',
    tokens: [
      { symbol: 'NATIVE', label: 'SOL' },
      { symbol: 'USDT', label: 'USDT' },
      { symbol: 'USDC', label: 'USDC' },
    ],
  },
  {
    id: 'BCH',
    name: 'Bitcoin Cash',
    color: '#8DC351',
    family: 'utxo',
    tokens: [{ symbol: 'NATIVE', label: 'BCH' }],
  },
  {
    id: 'LTC',
    name: 'Litecoin',
    color: '#345D9D',
    family: 'utxo',
    tokens: [{ symbol: 'NATIVE', label: 'LTC' }],
  },
  {
    id: 'ZEC',
    name: 'Zcash',
    color: '#ECB244',
    family: 'utxo',
    tokens: [{ symbol: 'NATIVE', label: 'ZEC' }],
  },
  {
    id: 'TRON',
    name: 'TRON',
    color: '#EB0029',
    family: 'tron',
    tokens: [
      { symbol: 'NATIVE', label: 'TRX' },
      { symbol: 'USDT', label: 'USDT' },
    ],
  },
];

const SELECTABLE_CHAINS = CHAINS.filter(chain => chain.id !== 'ZEC');

type ValidatorNetwork = 'prod' | 'testnet';

const BTC_REGTEST_RE = /^bcrt1[0-9a-z]{39,59}$/i;
const UTXO_VALIDATOR_SYMBOL: Record<string, string> = {
  BTC: 'btc',
  BCH: 'bch',
  LTC: 'ltc',
  ZEC: 'zec',
};

interface FormState {
  name: string;
  chainType: string;
  address: string;
  activeTokens: string[];
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  chainType: '',
  address: '',
  activeTokens: [],
  isActive: true,
};

function chainMeta(chainType: string): ChainMeta | undefined {
  return CHAINS.find(c => c.id === chainType);
}

function truncateAddr(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function networkLabelKey(mode: NetworkMode): string {
  return mode === 'testnet'
    ? 'receivingAccounts.networkTestnet'
    : 'receivingAccounts.networkMainnet';
}

function toValidatorNetwork(mode: NetworkMode): ValidatorNetwork {
  return mode === 'testnet' ? 'testnet' : 'prod';
}

function validateWithLibrary(address: string, symbol: string, network: ValidatorNetwork): boolean {
  try {
    return WAValidator.validate(address, symbol, network);
  } catch {
    return false;
  }
}

function validateAddress(
  chain: ChainMeta | undefined,
  addr: string,
  networkMode: NetworkMode
): string | null {
  if (!chain || !addr.trim()) return null;
  const a = addr.trim();
  const targetNetwork = toValidatorNetwork(networkMode);

  switch (chain.family) {
    case 'evm': {
      return validateWithLibrary(a, 'eth', targetNetwork)
        ? null
        : 'receivingAccounts.invalidEvmAddress';
    }
    case 'solana': {
      return validateWithLibrary(a, 'sol', targetNetwork)
        ? null
        : 'receivingAccounts.invalidSolAddress';
    }
    case 'tron': {
      return validateWithLibrary(a, 'trx', targetNetwork)
        ? null
        : 'receivingAccounts.invalidTronAddress';
    }
    case 'utxo': {
      const symbol = UTXO_VALIDATOR_SYMBOL[chain.id];
      if (!symbol) return null;

      if (
        validateWithLibrary(a, symbol, targetNetwork) ||
        (chain.id === 'BTC' && targetNetwork === 'testnet' && BTC_REGTEST_RE.test(a))
      ) {
        return null;
      }

      const oppositeNetwork: ValidatorNetwork = targetNetwork === 'testnet' ? 'prod' : 'testnet';
      if (validateWithLibrary(a, symbol, oppositeNetwork)) {
        return networkMode === 'testnet'
          ? 'receivingAccounts.networkMismatchNeedTestnet'
          : 'receivingAccounts.networkMismatchNeedMainnet';
      }

      return 'receivingAccounts.invalidUtxoAddress';
    }
    default:
      return null;
  }
}

function isNetworkMismatchError(errorKey: string | null): boolean {
  return (
    errorKey === 'receivingAccounts.networkMismatchNeedMainnet' ||
    errorKey === 'receivingAccounts.networkMismatchNeedTestnet'
  );
}

function addressPlaceholder(chain: ChainMeta | undefined, networkMode: NetworkMode): string {
  if (!chain) return '';

  switch (chain.id) {
    case 'BTC':
      return networkMode === 'testnet' ? 'tb1q... / m...' : 'bc1q... / 1...';
    case 'BCH':
      return networkMode === 'testnet' ? 'bchtest:q...' : 'bitcoincash:q...';
    case 'LTC':
      return networkMode === 'testnet' ? 'tltc1q... / m...' : 'ltc1q... / L...';
    case 'ZEC':
      return networkMode === 'testnet' ? 'tm...' : 't1...';
    case 'TRON':
      return 'TJYs7M...';
    default:
      if (chain.family === 'evm') return '0x...';
      if (chain.family === 'solana') return '9xQeWv...';
      return '';
  }
}

function normalizeTokenSymbols(chain: ChainMeta | undefined, tokens: string[] = []): string[] {
  if (!tokens.length) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;

    let canonical = token.toUpperCase();
    if (chain) {
      const bySymbol = chain.tokens.find(tk => tk.symbol.toUpperCase() === canonical);
      if (bySymbol) {
        canonical = bySymbol.symbol;
      } else {
        const byLabel = chain.tokens.find(tk => tk.label.toUpperCase() === canonical);
        if (byLabel) canonical = byLabel.symbol;
      }
    }

    if (seen.has(canonical)) continue;
    seen.add(canonical);
    normalized.push(canonical);
  }

  return normalized;
}

function tokenDisplayLabels(chain: ChainMeta | undefined, tokens: string[] = []): string[] {
  return normalizeTokenSymbols(chain, tokens).map(symbol => {
    const meta = chain?.tokens.find(tk => tk.symbol === symbol);
    return meta?.label ?? symbol;
  });
}

function formFromAccount(acc: ReceivingAccount): FormState {
  const chain = chainMeta(acc.chainType);
  return {
    name: acc.name,
    chainType: acc.chainType,
    address: acc.address,
    activeTokens: normalizeTokenSymbols(chain, acc.activeTokens ?? []),
    isActive: acc.isActive,
  };
}

function toInput(form: FormState): ReceivingAccountInput {
  const chain = chainMeta(form.chainType);
  const normalizedActive = normalizeTokenSymbols(chain, form.activeTokens);
  const allTokens = chain?.tokens.map(t => t.symbol) ?? [];
  const inactive = allTokens.filter(t => !normalizedActive.includes(t));
  return {
    name: form.name,
    chainType: form.chainType,
    address: form.address,
    activeTokens: normalizedActive,
    inactiveTokens: inactive,
    isActive: form.isActive,
  };
}

interface AccountFormProps {
  form: FormState;
  onChange: (form: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
  networkMode: NetworkMode;
}

const AccountForm: React.FC<AccountFormProps> = ({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  isEdit,
  networkMode,
}) => {
  const { t } = useI18n();
  const { walletInfo, isConnected, openModal } = useWallet();
  const selectedChain = chainMeta(form.chainType);
  const addrError = form.address.trim()
    ? validateAddress(selectedChain, form.address.trim(), networkMode)
    : null;

  const formRef = useRef(form);
  const onChangeRef = useRef(onChange);
  const prevConnected = useRef(isConnected);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const toggleToken = (symbol: string): void => {
    const next = form.activeTokens.includes(symbol)
      ? form.activeTokens.filter(s => s !== symbol)
      : [...form.activeTokens, symbol];
    onChange({ ...form, activeTokens: next });
  };

  const handleConnectWallet = useCallback(async () => {
    if (isConnected && walletInfo?.address) {
      onChangeRef.current({ ...formRef.current, address: walletInfo.address });
      return;
    }
    await openModal({ view: 'Connect' });
  }, [isConnected, walletInfo, openModal]);

  useEffect(() => {
    if (
      !prevConnected.current &&
      isConnected &&
      walletInfo?.address &&
      selectedChain?.family === 'evm' &&
      !formRef.current.address
    ) {
      onChangeRef.current({ ...formRef.current, address: walletInfo.address });
    }
    prevConnected.current = isConnected;
  }, [isConnected, walletInfo?.address, selectedChain?.family]);

  const canSave =
    form.name.trim() &&
    form.chainType &&
    form.address.trim() &&
    form.activeTokens.length > 0 &&
    !addrError;

  const showTokenSelector = selectedChain && selectedChain.tokens.length > 1;

  return (
    <div className="border border-border rounded-xl p-4 sm:p-5 space-y-4">
      <h3 className="font-medium text-foreground">
        {isEdit ? t('receivingAccounts.editAccount') : t('receivingAccounts.addAccount')}
      </h3>

      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
          networkMode === 'testnet'
            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
        )}
      >
        <Settings2 className="w-3.5 h-3.5" />
        <span>
          {t('receivingAccounts.networkLockedHint', {
            network: t(networkLabelKey(networkMode)),
          })}
        </span>
      </div>

      {!isEdit && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            {t('receivingAccounts.chain')}
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {SELECTABLE_CHAINS.map(c => {
              const selected = form.chainType === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-testid={`receiving-chain-${c.id}`}
                  onClick={() => {
                    const meta = chainMeta(c.id);
                    onChange({
                      ...form,
                      chainType: c.id,
                      activeTokens: meta ? meta.tokens.map(tok => tok.symbol) : [],
                      name: form.name || `My ${c.name} Wallet`,
                    });
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all text-center',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                  )}
                >
                  <TokenIcon token={c.id} size={28} />
                  <span
                    className={cn(
                      'text-[10px] font-medium leading-tight',
                      selected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isEdit && selectedChain && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TokenIcon token={selectedChain.id} size={20} />
          {selectedChain.name}
        </div>
      )}

      {form.chainType && (
        <>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('receivingAccounts.name')}
            </label>
            <input
              type="text"
              data-testid="receiving-form-name"
              value={form.name}
              onChange={e => onChange({ ...form, name: e.target.value })}
              placeholder={t('receivingAccounts.namePlaceholder')}
              className={cn(
                'w-full h-10 px-3 rounded-lg text-sm',
                'border border-border bg-background',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
              )}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('receivingAccounts.address')}
              </label>
              {selectedChain?.family === 'evm' && !isEdit && (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium',
                    'text-primary hover:text-primary/80 transition-colors'
                  )}
                >
                  <LinkIcon className="w-3 h-3" />
                  {isConnected && walletInfo?.address
                    ? t('receivingAccounts.useConnectedWallet')
                    : t('receivingAccounts.connectWallet')}
                </button>
              )}
            </div>
            <input
              type="text"
              data-testid="receiving-form-address"
              value={form.address}
              onChange={e => onChange({ ...form, address: e.target.value })}
              placeholder={addressPlaceholder(selectedChain, networkMode)}
              className={cn(
                'w-full h-10 px-3 rounded-lg text-sm font-mono',
                'border bg-background',
                'focus:outline-none focus:ring-2 focus:ring-primary/30',
                addrError
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                  : 'border-border focus:border-primary'
              )}
            />
            {addrError && (
              <p className="flex items-center gap-1 mt-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                {t(addrError)}
              </p>
            )}
          </div>

          {showTokenSelector && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t('receivingAccounts.tokens')}
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedChain.tokens.map(token => {
                  const active = form.activeTokens.includes(token.symbol);
                  return (
                    <button
                      key={token.symbol}
                      type="button"
                      onClick={() => toggleToken(token.symbol)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                        'border',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {token.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-1">
        {form.chainType && (
          <button
            type="button"
            data-testid="receiving-form-save"
            onClick={onSave}
            disabled={saving || !canSave}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-10 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'active:scale-[0.98] transition-all',
              (saving || !canSave) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? t('common.save') : t('common.add')}
          </button>
        )}
        <button
          type="button"
          data-testid="receiving-form-cancel"
          onClick={onCancel}
          className={cn(
            'h-10 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50',
            form.chainType ? 'px-4' : 'flex-1'
          )}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({
  checked,
  onChange,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
      checked ? 'bg-primary' : 'bg-muted-foreground/30',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <span
      className={cn(
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0'
      )}
    />
  </button>
);

interface AccountRowProps {
  account: ReceivingAccount;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onOpenMobileActions: () => void;
  deleting: boolean;
  toggling: boolean;
  networkMode: NetworkMode;
  mobile: boolean;
}

const AccountRow: React.FC<AccountRowProps> = ({
  account,
  onEdit,
  onDelete,
  onToggleActive,
  onOpenMobileActions,
  deleting,
  toggling,
  networkMode,
  mobile,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const meta = chainMeta(account.chainType);
  const issueKey = validateAddress(meta, account.address, networkMode);
  const statusLabel = account.isActive
    ? t('receivingAccounts.active')
    : t('receivingAccounts.inactive');
  const displayTokens = tokenDisplayLabels(meta, account.activeTokens ?? []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [account.address]);

  return (
    <div
      data-testid={`receiving-account-row-${account.id}`}
      className={cn(
        'border rounded-lg px-3 py-3 transition-opacity',
        account.isActive ? 'border-border' : 'border-border opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border/40 bg-background">
          <TokenIcon token={account.chainType} size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-foreground truncate">{account.name}</h3>
            <span className="text-[11px] text-muted-foreground">
              {meta?.name ?? account.chainType}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1 min-w-0">
            <span className="text-xs font-mono text-muted-foreground truncate">
              {truncateAddr(account.address)}
            </span>
            <button
              type="button"
              data-testid="receiving-account-copy"
              onClick={handleCopy}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label={t('receivingAccounts.copyAddress')}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {displayTokens.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {displayTokens.map(tokenLabel => {
                return (
                  <span
                    key={tokenLabel}
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground"
                  >
                    {tokenLabel}
                  </span>
                );
              })}
            </div>
          )}

          {issueKey && isNetworkMismatchError(issueKey) && (
            <p className="flex items-center gap-1 mt-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {t(issueKey)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-xs text-muted-foreground">{statusLabel}</span>
          <ToggleSwitch checked={account.isActive} onChange={onToggleActive} disabled={toggling} />

          {mobile ? (
            <button
              type="button"
              data-testid="receiving-account-actions"
              onClick={onOpenMobileActions}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50"
              aria-label={t('common.actions', { defaultValue: 'Actions' })}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                data-testid="receiving-account-edit"
                onClick={onEdit}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3 rounded-lg',
                  'border border-border text-xs font-medium text-foreground',
                  'hover:bg-muted/50 transition-colors'
                )}
              >
                <Pencil className="w-3.5 h-3.5" />
                {t('common.edit')}
              </button>
              <button
                type="button"
                data-testid="receiving-account-delete"
                onClick={onDelete}
                disabled={deleting}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3 rounded-lg',
                  'border border-destructive/30 text-xs font-medium text-destructive',
                  'hover:bg-destructive/5 transition-colors',
                  deleting && 'opacity-70 cursor-not-allowed'
                )}
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {t('common.delete')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const CryptoReceivingSection: React.FC = () => {
  const { t } = useI18n();
  const { data: accounts = [], isLoading } = useReceivingAccounts();
  const addMutation = useAddReceivingAccount();
  const updateMutation = useUpdateReceivingAccount();
  const deleteMutation = useDeleteReceivingAccount();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const networkMode = useMemo<NetworkMode>(
    () => (getEnvConfig().isTestEnv ? 'testnet' : 'mainnet'),
    []
  );

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeActionAccount, setActiveActionAccount] = useState<ReceivingAccount | null>(null);

  const knownChainIds = useMemo(() => new Set(CHAINS.map(c => c.id)), []);
  const cryptoAccounts = useMemo(
    () => accounts.filter(a => knownChainIds.has(a.chainType)),
    [accounts, knownChainIds]
  );
  const filteredAccounts = useMemo(() => {
    if (statusFilter === 'active') return cryptoAccounts.filter(acc => acc.isActive);
    if (statusFilter === 'inactive') return cryptoAccounts.filter(acc => !acc.isActive);
    return cryptoAccounts;
  }, [cryptoAccounts, statusFilter]);

  const networkMismatchAccounts = useMemo(
    () =>
      cryptoAccounts.filter(acc => {
        const issueKey = validateAddress(chainMeta(acc.chainType), acc.address, networkMode);
        return isNetworkMismatchError(issueKey);
      }),
    [cryptoAccounts, networkMode]
  );
  const activeCount = useMemo(
    () => cryptoAccounts.filter(acc => acc.isActive).length,
    [cryptoAccounts]
  );

  const handleAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((acc: ReceivingAccount) => {
    setEditingId(acc.id);
    setForm(formFromAccount(acc));
    setShowForm(true);
    setActiveActionAccount(null);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const input = toInput(form);
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, input });
      } else {
        await addMutation.mutateAsync(input);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      // errors are surfaced by mutation states
    }
  }, [form, editingId, addMutation, updateMutation]);

  const handleToggleActive = useCallback(
    async (acc: ReceivingAccount) => {
      setTogglingId(acc.id);
      try {
        const chain = chainMeta(acc.chainType);
        const normalizedActive = normalizeTokenSymbols(chain, acc.activeTokens ?? []);
        const allTokens = chain?.tokens.map(tok => tok.symbol) ?? [];
        const inactive = allTokens.filter(tok => !normalizedActive.includes(tok));
        await updateMutation.mutateAsync({
          id: acc.id,
          input: {
            name: acc.name,
            chainType: acc.chainType,
            address: acc.address,
            activeTokens: normalizedActive,
            inactiveTokens: inactive,
            isActive: !acc.isActive,
          },
        });
      } finally {
        setTogglingId(null);
      }
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      setDeletingId(id);
      try {
        await deleteMutation.mutateAsync(id);
      } finally {
        setDeletingId(null);
        setActiveActionAccount(null);
      }
    },
    [deleteMutation]
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }, []);

  const handleCopyFromSheet = useCallback(async () => {
    if (!activeActionAccount) return;
    try {
      await navigator.clipboard.writeText(activeActionAccount.address);
    } finally {
      setActiveActionAccount(null);
    }
  }, [activeActionAccount]);

  const filterItems: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: t('common.all', { defaultValue: 'All' }) },
    { key: 'active', label: t('receivingAccounts.active') },
    { key: 'inactive', label: t('receivingAccounts.inactive') },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="receiving-accounts-section">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            {t('receivingAccounts.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('receivingAccounts.subtitle')}</p>
        </div>
        {!showForm && (
          <button
            type="button"
            data-testid="receiving-add-button"
            onClick={handleAdd}
            className={cn(
              'flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-lg shrink-0',
              'bg-primary text-primary-foreground text-sm font-medium',
              'active:scale-[0.98] transition-all'
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t('receivingAccounts.addAccount')}</span>
            <span className="sm:hidden">{t('common.add', { defaultValue: 'Add' })}</span>
          </button>
        )}
      </div>

      <div
        data-testid="receiving-network-lock-banner"
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs',
          networkMode === 'testnet'
            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
            : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {t('receivingAccounts.environmentLocked', {
              network: t(networkLabelKey(networkMode)),
            })}
          </span>
        </div>
        <span className="shrink-0">
          {t('receivingAccounts.activeCount', {
            active: activeCount,
            total: cryptoAccounts.length,
          })}
        </span>
      </div>

      {networkMismatchAccounts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">{t('receivingAccounts.networkMismatchTitle')}</p>
              <p className="mt-0.5">
                {t('receivingAccounts.networkMismatchDesc', {
                  count: networkMismatchAccounts.length,
                  network: t(networkLabelKey(networkMode)),
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <AccountForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={addMutation.isPending || updateMutation.isPending}
          isEdit={editingId !== null}
          networkMode={networkMode}
        />
      )}

      {cryptoAccounts.length > 0 && !showForm && (
        <div className="flex flex-wrap items-center gap-2" data-testid="receiving-status-filters">
          {filterItems.map(item => {
            const selected = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                data-testid={`receiving-filter-${item.key}`}
                onClick={() => setStatusFilter(item.key)}
                className={cn(
                  'h-8 px-3 rounded-full text-xs font-medium border transition-colors',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/40'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {cryptoAccounts.length === 0 && !showForm ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold mb-2">{t('receivingAccounts.noAccounts')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('receivingAccounts.noAccountsDesc')}
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className={cn(
              'inline-flex items-center gap-1.5 h-10 px-5 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'active:scale-[0.98] transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            {t('receivingAccounts.addAccount')}
          </button>
        </div>
      ) : (
        !showForm && (
          <div className="space-y-2">
            {filteredAccounts.map(acc => (
              <AccountRow
                key={acc.id}
                account={acc}
                onEdit={() => handleEdit(acc)}
                onDelete={() => handleDelete(acc.id)}
                onToggleActive={() => handleToggleActive(acc)}
                onOpenMobileActions={() => setActiveActionAccount(acc)}
                deleting={deletingId === acc.id}
                toggling={togglingId === acc.id}
                networkMode={networkMode}
                mobile={isMobile}
              />
            ))}
          </div>
        )
      )}

      <BottomSheet
        open={isMobile && !!activeActionAccount}
        onClose={() => setActiveActionAccount(null)}
        title={activeActionAccount?.name || t('common.actions', { defaultValue: 'Actions' })}
      >
        <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <BottomSheetItem
            title={t('common.edit')}
            icon={<Pencil className="w-4 h-4" />}
            onClick={() => activeActionAccount && handleEdit(activeActionAccount)}
          />
          <BottomSheetItem
            title={t('receivingAccounts.copyAddress')}
            icon={<Copy className="w-4 h-4" />}
            onClick={handleCopyFromSheet}
          />
          <BottomSheetItem
            title={t('common.delete')}
            icon={<Trash2 className="w-4 h-4" />}
            className="text-destructive"
            onClick={() => activeActionAccount && handleDelete(activeActionAccount.id)}
          />
        </div>
      </BottomSheet>
    </div>
  );
};

export default CryptoReceivingSection;
