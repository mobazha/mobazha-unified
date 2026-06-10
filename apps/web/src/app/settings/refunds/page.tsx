'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui';
import {
  TOKENS,
  isPaymentCoinEnabled,
  useI18n,
  useRefundReceivingAddresses,
  truncateAddress,
  validateRefundReceivingAddressInput,
  getRefundReceivingAddressWarnings,
} from '@mobazha/core';
import { AlertCircle, Copy, Loader2, Plus, Trash2, Wallet } from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { EmptyState } from '@/components/ui/empty-state';

const REFUND_COIN_OPTIONS = TOKENS.filter(
  token =>
    token.assetId.startsWith('crypto:') &&
    token.isNative &&
    !token.disabled &&
    isPaymentCoinEnabled(token.assetId)
);

function coinLabel(assetId: string): string {
  const token = REFUND_COIN_OPTIONS.find(item => item.assetId === assetId);
  return token ? `${token.token} (${token.chain})` : assetId;
}

export default function RefundReceivingSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { addresses, isLoading, isSaving, error, upsertAddress, removeAddress, saveAll } =
    useRefundReceivingAddresses();

  const [draftCoin, setDraftCoin] = useState('');
  const [draftAddress, setDraftAddress] = useState('');
  const [editingCoin, setEditingCoin] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [editTouched, setEditTouched] = useState(false);

  const savedEntries = useMemo(
    () =>
      Object.entries(addresses)
        .filter(([, addr]) => addr.trim())
        .sort(([a], [b]) => coinLabel(a).localeCompare(coinLabel(b))),
    [addresses]
  );

  const availableCoins = useMemo(
    () => REFUND_COIN_OPTIONS.filter(token => !addresses[token.assetId]?.trim()),
    [addresses]
  );

  const resolvedDraftCoin = useMemo(() => {
    if (draftCoin && availableCoins.some(token => token.assetId === draftCoin)) {
      return draftCoin;
    }
    return availableCoins[0]?.assetId ?? '';
  }, [draftCoin, availableCoins]);

  const draftValidation = useMemo(() => {
    if (!resolvedDraftCoin || !draftAddress.trim()) return null;
    return validateRefundReceivingAddressInput(resolvedDraftCoin, draftAddress);
  }, [resolvedDraftCoin, draftAddress]);

  const draftWarnings = useMemo(() => {
    if (!resolvedDraftCoin || !draftAddress.trim()) return [];
    return getRefundReceivingAddressWarnings(resolvedDraftCoin, draftAddress, addresses);
  }, [resolvedDraftCoin, draftAddress, addresses]);

  const editValidation = useMemo(() => {
    if (!editingCoin || !editValue.trim()) return null;
    return validateRefundReceivingAddressInput(editingCoin, editValue);
  }, [editingCoin, editValue]);

  const editWarnings = useMemo(() => {
    if (!editingCoin || !editValue.trim()) return [];
    const others = { ...addresses };
    delete others[editingCoin];
    return getRefundReceivingAddressWarnings(editingCoin, editValue, others);
  }, [editingCoin, editValue, addresses]);

  const validationMessage = useCallback(
    (result: ReturnType<typeof validateRefundReceivingAddressInput> | null) => {
      if (!result || result.valid) return null;
      if (result.code === 'empty') return t('settings.refunds.validationEmpty');
      if (result.code === 'zero_address') return t('settings.refunds.validationZeroAddress');
      return t('settings.refunds.validationFormat');
    },
    [t]
  );

  const warningMessage = useCallback(
    (warning: ReturnType<typeof getRefundReceivingAddressWarnings>[number]) => {
      if (warning.type === 'duplicate_other_coin') {
        return t('settings.refunds.warningDuplicateCoin', {
          coin: coinLabel(warning.otherCoin),
        });
      }
      if (warning.type === 'bch_bech32_mismatch') {
        return t('settings.refunds.warningBchFormat');
      }
      return '';
    },
    [t]
  );

  const handleCopy = useCallback(
    async (addr: string) => {
      try {
        await navigator.clipboard.writeText(addr);
        toast({ title: t('common.copied') });
      } catch {
        toast({ title: t('common.error'), variant: 'destructive' });
      }
    },
    [toast, t]
  );

  const handleAdd = useCallback(async () => {
    const coin = resolvedDraftCoin.trim();
    const addr = draftAddress.trim();
    if (!coin || !addr) return;

    setTouched(true);
    const validation = validateRefundReceivingAddressInput(coin, addr);
    if (!validation.valid) return;

    const ok = await upsertAddress(coin, addr);
    if (ok) {
      toast({ title: t('settings.refunds.saved') });
      setDraftAddress('');
      setTouched(false);
      setDraftCoin(availableCoins.find(token => token.assetId !== coin)?.assetId ?? '');
    } else {
      toast({ title: t('settings.refunds.saveFailed'), variant: 'destructive' });
    }
  }, [resolvedDraftCoin, draftAddress, upsertAddress, toast, t, availableCoins]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingCoin) return;
    setEditTouched(true);
    const validation = validateRefundReceivingAddressInput(editingCoin, editValue);
    if (!validation.valid) return;

    const ok = await upsertAddress(editingCoin, editValue);
    if (ok) {
      toast({ title: t('settings.refunds.saved') });
      setEditingCoin(null);
      setEditValue('');
      setEditTouched(false);
    } else {
      toast({ title: t('settings.refunds.saveFailed'), variant: 'destructive' });
    }
  }, [editingCoin, editValue, upsertAddress, toast, t]);

  const handleRemove = useCallback(
    async (coin: string) => {
      const ok = await removeAddress(coin);
      if (ok) {
        toast({ title: t('settings.refunds.removed') });
      } else {
        toast({ title: t('settings.refunds.saveFailed'), variant: 'destructive' });
      }
    },
    [removeAddress, toast, t]
  );

  const handleClearAll = useCallback(async () => {
    const ok = await saveAll({});
    if (ok) {
      toast({ title: t('settings.refunds.cleared') });
    }
  }, [saveAll, toast, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-refunds-page">
      <SettingsPageHeader
        title={t('settings.refunds.title')}
        description={t('settings.refunds.description')}
      />

      <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/30 px-4 py-3">
        {t('settings.refunds.contextNote')}
      </p>

      {error && (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
          data-testid="refund-pref-load-error"
        >
          {error}
        </div>
      )}

      {savedEntries.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t('settings.refunds.emptyTitle')}
          description={t('settings.refunds.emptyDesc')}
        />
      ) : (
        <div className="space-y-3">
          {savedEntries.map(([coin, addr]) => (
            <Card key={coin} className="p-4" data-testid={`refund-pref-${coin}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">{coinLabel(coin)}</p>
                  {editingCoin === coin ? (
                    <div className="space-y-2">
                      <Input
                        value={editValue}
                        onChange={event => {
                          setEditValue(event.target.value);
                          setEditTouched(true);
                        }}
                        className="font-mono text-sm"
                        data-testid={`refund-pref-edit-${coin}`}
                        aria-invalid={
                          editTouched && editValidation !== null && !editValidation.valid
                        }
                      />
                      {editTouched && validationMessage(editValidation) && (
                        <p className="text-xs text-destructive">
                          {validationMessage(editValidation)}
                        </p>
                      )}
                      {editWarnings.map((warning, index) => (
                        <p
                          key={`${warning.type}-${index}`}
                          className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-200"
                        >
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {warningMessage(warning)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm text-muted-foreground">
                        {truncateAddress(addr, 10, 8)}
                      </p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => void handleCopy(addr)}
                        aria-label={t('common.copy')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {editingCoin === coin ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={
                          isSaving ||
                          !editValue.trim() ||
                          (editValidation !== null && !editValidation.valid)
                        }
                      >
                        {t('common.save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCoin(null);
                          setEditValue('');
                          setEditTouched(false);
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCoin(coin);
                          setEditValue(addr);
                          setEditTouched(false);
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleRemove(coin)}
                        disabled={isSaving}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {savedEntries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleClearAll()}
              disabled={isSaving}
            >
              {t('settings.refunds.clearAll')}
            </Button>
          )}
        </div>
      )}

      {availableCoins.length > 0 && (
        <Card className="p-4 space-y-4" data-testid="refund-pref-add-form">
          <h3 className="text-sm font-medium text-foreground">{t('settings.refunds.addTitle')}</h3>
          <p className="text-xs text-muted-foreground">{t('settings.refunds.exchangeWarning')}</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="refund-pref-coin">
                {t('settings.refunds.coinLabel')}
              </label>
              <select
                id="refund-pref-coin"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={resolvedDraftCoin}
                onChange={event => setDraftCoin(event.target.value)}
                data-testid="refund-pref-coin-select"
              >
                {availableCoins.map(token => (
                  <option key={token.assetId} value={token.assetId}>
                    {coinLabel(token.assetId)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="refund-pref-address">
                {t('settings.refunds.addressLabel')}
              </label>
              <Input
                id="refund-pref-address"
                value={draftAddress}
                onChange={event => {
                  setDraftAddress(event.target.value);
                  setTouched(true);
                }}
                onBlur={() => setTouched(true)}
                placeholder={t('settings.refunds.addressPlaceholder')}
                className="font-mono text-sm"
                data-testid="refund-pref-address-input"
                aria-invalid={touched && draftValidation !== null && !draftValidation.valid}
              />
              {touched && validationMessage(draftValidation) && (
                <p className="text-xs text-destructive" data-testid="refund-pref-validation-error">
                  {validationMessage(draftValidation)}
                </p>
              )}
              {draftWarnings.map((warning, index) => (
                <p
                  key={`${warning.type}-${index}`}
                  className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-200"
                  data-testid="refund-pref-warning"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {warningMessage(warning)}
                </p>
              ))}
            </div>
            <Button
              onClick={() => void handleAdd()}
              disabled={
                isSaving ||
                !resolvedDraftCoin ||
                !draftAddress.trim() ||
                (draftValidation !== null && !draftValidation.valid)
              }
              data-testid="refund-pref-add-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('common.add')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
