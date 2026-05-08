'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@mobazha/core';
import { authSafeGet, authPut } from '@mobazha/core/services/api/helpers';
import { Wifi, WifiOff, Save, Server, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface LtcSettings {
  electrumEndpoint: string;
  sweepTargetAddress: string;
  sweepThreshold: string;
}

interface XmrSettings {
  walletRpcUrl: string;
  accountIndex: number;
}

interface RpcStatusEntry {
  connected: boolean;
  error?: string;
}

interface RpcStatusResponse {
  ltc?: RpcStatusEntry;
  xmr?: RpcStatusEntry;
}

function StatusBadge({ connected, error }: { connected: boolean; error?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
        connected
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400'
      }`}
      title={error}
    >
      {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {connected
        ? t('outpost.rpcConnected', { defaultValue: 'Connected' })
        : t('outpost.rpcDisconnected', { defaultValue: 'Disconnected' })}
    </span>
  );
}

function LtcSection() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<LtcSettings>({
    electrumEndpoint: '',
    sweepTargetAddress: '',
    sweepThreshold: '0.001',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<RpcStatusEntry | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    authSafeGet<LtcSettings | null>('/settings/payments/ltc', null).then(data => {
      if (data) {
        setSettings({
          electrumEndpoint: data.electrumEndpoint || '',
          sweepTargetAddress: data.sweepTargetAddress || '',
          sweepThreshold: data.sweepThreshold || '0.001',
        });
      }
    });

    authSafeGet<RpcStatusResponse | null>('/system/rpc-status', null).then(data => {
      if (data?.ltc) setStatus(data.ltc);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await authPut('/settings/payments/ltc', settings);
      setSaveMsg({ ok: true, text: t('common.saved', { defaultValue: 'Saved' }) });
    } catch {
      setSaveMsg({ ok: false, text: t('common.saveFailed', { defaultValue: 'Save failed' }) });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Litecoin (LTC)
            </CardTitle>
            <CardDescription className="mt-1">
              {t('outpost.ltcDesc', {
                defaultValue:
                  'HD address derivation + Electrum + Auto-Sweep to your external wallet',
              })}
            </CardDescription>
          </div>
          {status && <StatusBadge connected={status.connected} error={status.error} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ltc-electrum">
            {t('outpost.electrumEndpoint', { defaultValue: 'Electrum Server Endpoint' })}
          </Label>
          <Input
            id="ltc-electrum"
            placeholder="ssl://electrum.example.com:50002"
            value={settings.electrumEndpoint}
            onChange={e => setSettings(s => ({ ...s, electrumEndpoint: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            {t('outpost.electrumHint', {
              defaultValue: 'Required. Electrum protocol endpoint for LTC payment verification.',
            })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ltc-sweep">
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {t('outpost.sweepTarget', { defaultValue: 'Sweep Target Address' })}
            </span>
          </Label>
          <Input
            id="ltc-sweep"
            placeholder="ltc1q..."
            value={settings.sweepTargetAddress}
            onChange={e => setSettings(s => ({ ...s, sweepTargetAddress: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            {t('outpost.sweepTargetHint', {
              defaultValue: 'Your external LTC wallet address. Funds are auto-swept here.',
            })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ltc-threshold">
            {t('outpost.sweepThreshold', { defaultValue: 'Sweep Threshold (LTC)' })}
          </Label>
          <Input
            id="ltc-threshold"
            type="number"
            step="0.001"
            min="0"
            value={settings.sweepThreshold}
            onChange={e => setSettings(s => ({ ...s, sweepThreshold: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            {t('outpost.sweepThresholdHint', {
              defaultValue: 'Minimum balance before auto-sweep triggers. Default: 0.001 LTC.',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? t('common.saving') : t('common.save')}
          </Button>
          {saveMsg && (
            <span
              className={`text-xs ${saveMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {saveMsg.text}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function XmrSection() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<XmrSettings>({
    walletRpcUrl: 'http://127.0.0.1:18082',
    accountIndex: 0,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<RpcStatusEntry | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    authSafeGet<XmrSettings | null>('/settings/payments/xmr', null).then(data => {
      if (data) {
        setSettings({
          walletRpcUrl: data.walletRpcUrl || 'http://127.0.0.1:18082',
          accountIndex: data.accountIndex ?? 0,
        });
      }
    });

    authSafeGet<RpcStatusResponse | null>('/system/rpc-status', null).then(data => {
      if (data?.xmr) setStatus(data.xmr);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await authPut('/settings/payments/xmr', settings);
      setSaveMsg({ ok: true, text: t('common.saved', { defaultValue: 'Saved' }) });
    } catch {
      setSaveMsg({ ok: false, text: t('common.saveFailed', { defaultValue: 'Save failed' }) });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Monero (XMR)
            </CardTitle>
            <CardDescription className="mt-1">
              {t('outpost.xmrDesc', {
                defaultValue:
                  'Subaddress generation via monero-wallet-rpc. No sweep needed — funds are directly in your wallet.',
              })}
            </CardDescription>
          </div>
          {status && <StatusBadge connected={status.connected} error={status.error} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="xmr-rpc">
            {t('outpost.walletRpcUrl', { defaultValue: 'monero-wallet-rpc URL' })}
          </Label>
          <Input
            id="xmr-rpc"
            placeholder="http://127.0.0.1:18082"
            value={settings.walletRpcUrl}
            onChange={e => setSettings(s => ({ ...s, walletRpcUrl: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            {t('outpost.walletRpcHint', {
              defaultValue: 'Local monero-wallet-rpc endpoint. Default: http://127.0.0.1:18082',
            })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="xmr-account">
            {t('outpost.accountIndex', { defaultValue: 'Account Index' })}
          </Label>
          <Input
            id="xmr-account"
            type="number"
            min="0"
            step="1"
            value={settings.accountIndex}
            onChange={e =>
              setSettings(s => ({ ...s, accountIndex: parseInt(e.target.value) || 0 }))
            }
          />
          <p className="text-xs text-muted-foreground">
            {t('outpost.accountIndexHint', {
              defaultValue: 'Wallet account index for subaddress generation. Default: 0.',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? t('common.saving') : t('common.save')}
          </Button>
          {saveMsg && (
            <span
              className={`text-xs ${saveMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {saveMsg.text}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function OutpostPaymentSettings() {
  return (
    <div className="space-y-6">
      <LtcSection />
      <XmrSection />
    </div>
  );
}
