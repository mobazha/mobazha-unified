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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenIcon } from '@/components/Payment';
import {
  useI18n,
  useReceivingAccounts,
  useAddReceivingAccount,
  useUpdateReceivingAccount,
  useDeleteReceivingAccount,
  useWallet,
} from '@mobazha/core';
import type { ReceivingAccount, ReceivingAccountInput } from '@mobazha/core/services/api/wallet';

// ── Chain metadata ──────────────────────────────────────────────

type ChainFamily = 'evm' | 'solana' | 'utxo' | 'tron';

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

function chainMeta(chainType: string): ChainMeta | undefined {
  return CHAINS.find(c => c.id === chainType);
}

function truncateAddr(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

const EVM_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const SOL_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BTC_ADDR_RE =
  /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[0-9a-z]{39,59}|tb1[0-9a-z]{39,59})$/;
const BCH_ADDR_RE = /^([13][1-9A-HJ-NP-Za-km-z]{25,34}|bitcoincash:[0-9a-z]{42,}|[0-9a-z]{42,})$/;
const LTC_ADDR_RE = /^([LM3][1-9A-HJ-NP-Za-km-z]{25,34}|ltc1[0-9a-z]{39,59})$/;
const ZEC_ADDR_RE = /^(t1[1-9A-HJ-NP-Za-km-z]{33}|t3[1-9A-HJ-NP-Za-km-z]{33})$/;
const TRON_ADDR_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

function validateAddress(chain: ChainMeta | undefined, addr: string): string | null {
  if (!chain || !addr.trim()) return null;
  const a = addr.trim();
  switch (chain.family) {
    case 'evm':
      return EVM_ADDR_RE.test(a) ? null : 'receivingAccounts.invalidEvmAddress';
    case 'solana':
      return SOL_ADDR_RE.test(a) ? null : 'receivingAccounts.invalidSolAddress';
    case 'utxo': {
      const regexMap: Record<string, RegExp> = {
        BTC: BTC_ADDR_RE,
        BCH: BCH_ADDR_RE,
        LTC: LTC_ADDR_RE,
        ZEC: ZEC_ADDR_RE,
      };
      const re = regexMap[chain.id];
      if (!re) return null;
      return re.test(a) ? null : 'receivingAccounts.invalidUtxoAddress';
    }
    case 'tron':
      return TRON_ADDR_RE.test(a) ? null : 'receivingAccounts.invalidTronAddress';
    default:
      return null;
  }
}

function addressPlaceholder(chain: ChainMeta | undefined): string {
  if (!chain) return '';
  switch (chain.id) {
    case 'BTC':
      return '1A1zP1... / bc1q...';
    case 'BCH':
      return '1BpEi6... / bitcoincash:q...';
    case 'LTC':
      return 'LQTpS3... / ltc1q...';
    case 'ZEC':
      return 't1UYsZ...';
    case 'TRON':
      return 'TJYs7M...';
    default:
      return chain.family === 'evm' ? '0x...' : '';
  }
}

// ── Form State ──────────────────────────────────────────────────

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

function formFromAccount(acc: ReceivingAccount): FormState {
  return {
    name: acc.name,
    chainType: acc.chainType,
    address: acc.address,
    activeTokens: acc.activeTokens ?? [],
    isActive: acc.isActive,
  };
}

function toInput(form: FormState): ReceivingAccountInput {
  const chain = chainMeta(form.chainType);
  const allTokens = chain?.tokens.map(t => t.symbol) ?? [];
  const inactive = allTokens.filter(t => !form.activeTokens.includes(t));
  return {
    name: form.name,
    chainType: form.chainType,
    address: form.address,
    activeTokens: form.activeTokens,
    inactiveTokens: inactive,
    isActive: form.isActive,
  };
}

// ── AccountForm ─────────────────────────────────────────────────

interface AccountFormProps {
  form: FormState;
  onChange: (form: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
}

const AccountForm: React.FC<AccountFormProps> = ({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  isEdit,
}) => {
  const { t } = useI18n();
  const { walletInfo, isConnected, openModal } = useWallet();
  const selectedChain = chainMeta(form.chainType);
  const addrError = form.address.trim()
    ? validateAddress(selectedChain, form.address.trim())
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

  const toggleToken = (symbol: string) => {
    const next = form.activeTokens.includes(symbol)
      ? form.activeTokens.filter(s => s !== symbol)
      : [...form.activeTokens, symbol];
    onChange({ ...form, activeTokens: next });
  };

  const handleConnectWallet = useCallback(async () => {
    if (isConnected && walletInfo?.address) {
      onChangeRef.current({ ...formRef.current, address: walletInfo.address });
    } else {
      await openModal({ view: 'Connect' });
    }
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

      {/* Chain selection */}
      {!isEdit && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            {t('receivingAccounts.chain')}
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {CHAINS.map(c => {
              const selected = form.chainType === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
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

      {/* Fields after chain selection */}
      {form.chainType && (
        <>
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('receivingAccounts.name')}
            </label>
            <input
              type="text"
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

          {/* Address */}
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
              value={form.address}
              onChange={e => onChange({ ...form, address: e.target.value })}
              placeholder={addressPlaceholder(selectedChain)}
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

          {/* Tokens (only for multi-token chains) */}
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

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
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
            <button
              type="button"
              onClick={onCancel}
              className="px-4 h-10 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Toggle Switch ───────────────────────────────────────────────

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

// ── AccountCard ─────────────────────────────────────────────────

interface AccountCardProps {
  account: ReceivingAccount;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  deleting: boolean;
  toggling: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  onToggleActive,
  deleting,
  toggling,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const meta = chainMeta(account.chainType);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [account.address]);

  return (
    <div
      className={cn(
        'border rounded-xl p-4 sm:p-5 transition-opacity',
        account.isActive ? 'border-border' : 'border-border opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-muted/50">
            <TokenIcon token={account.chainType} size={28} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">{account.name}</h3>
              <span className="text-xs text-muted-foreground shrink-0">
                {meta?.name ?? account.chainType}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-mono text-muted-foreground">
                {truncateAddr(account.address)}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t('receivingAccounts.copyAddress')}
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ToggleSwitch checked={account.isActive} onChange={onToggleActive} disabled={toggling} />
        </div>
      </div>

      {account.activeTokens && account.activeTokens.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {account.activeTokens.map(token => {
            const tokenMeta = meta?.tokens.find(t => t.symbol === token);
            return (
              <span
                key={token}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground"
              >
                {tokenMeta?.label ?? token}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <button
          type="button"
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
          onClick={onDelete}
          disabled={deleting}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-lg',
            'border border-destructive/30 text-xs font-medium text-destructive',
            'hover:bg-destructive/5 transition-colors'
          )}
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
};

// ── CryptoReceivingSection ──────────────────────────────────────

export const CryptoReceivingSection: React.FC = () => {
  const { t } = useI18n();
  const { data: accounts = [], isLoading } = useReceivingAccounts();
  const addMutation = useAddReceivingAccount();
  const updateMutation = useUpdateReceivingAccount();
  const deleteMutation = useDeleteReceivingAccount();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const knownChainIds = useMemo(() => new Set(CHAINS.map(c => c.id)), []);
  const cryptoAccounts = useMemo(
    () => accounts.filter(a => knownChainIds.has(a.chainType)),
    [accounts, knownChainIds]
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
      // mutation error is surfaced via addMutation.isError / updateMutation.isError
    }
  }, [form, editingId, addMutation, updateMutation]);

  const handleToggleActive = useCallback(
    async (acc: ReceivingAccount) => {
      setTogglingId(acc.id);
      try {
        const chain = chainMeta(acc.chainType);
        const allTokens = chain?.tokens.map(t => t.symbol) ?? [];
        const inactive = allTokens.filter(t => !(acc.activeTokens ?? []).includes(t));
        await updateMutation.mutateAsync({
          id: acc.id,
          input: {
            name: acc.name,
            chainType: acc.chainType,
            address: acc.address,
            activeTokens: acc.activeTokens ?? [],
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
      }
    },
    [deleteMutation]
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{t('receivingAccounts.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('receivingAccounts.subtitle')}</p>
        </div>
        {!showForm && cryptoAccounts.length > 0 && (
          <button
            type="button"
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

      {showForm && (
        <AccountForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={addMutation.isPending || updateMutation.isPending}
          isEdit={editingId !== null}
        />
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
        <div className="space-y-3">
          {cryptoAccounts.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              onEdit={() => handleEdit(acc)}
              onDelete={() => handleDelete(acc.id)}
              onToggleActive={() => handleToggleActive(acc)}
              deleting={deletingId === acc.id}
              toggling={togglingId === acc.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CryptoReceivingSection;
