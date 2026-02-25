'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input-compat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Plus, Wallet, Pencil, Trash2, Loader2 } from 'lucide-react';

const SUPPORTED_COINS = [
  { code: 'BTC', name: 'Bitcoin', icon: '₿' },
  { code: 'LTC', name: 'Litecoin', icon: 'Ł' },
  { code: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { code: 'BSC', name: 'BNB Chain', icon: '⬡' },
  { code: 'MATIC', name: 'Polygon', icon: '⬢' },
];

interface ReceivingAddress {
  coin: string;
  address: string;
  label?: string;
  isExternal: boolean;
}

const mockAddresses: ReceivingAddress[] = [
  {
    coin: 'BTC',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    label: 'Main wallet',
    isExternal: true,
  },
  {
    coin: 'ETH',
    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    label: 'MetaMask',
    isExternal: true,
  },
];

export default function ReceivingAddressesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<ReceivingAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCoin, setNewCoin] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const [editingCoin, setEditingCoin] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAddresses(mockAddresses);
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsExtended.loadFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleAddAddress = async () => {
    if (!newCoin || !newAddress) {
      toast({
        title: t('common.error'),
        description: t('settingsExtended.fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (addresses.some(a => a.coin === newCoin)) {
      toast({
        title: t('common.error'),
        description: t('settingsExtended.addressExists', { coin: newCoin }),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAddresses(prev => [
        ...prev,
        { coin: newCoin, address: newAddress, label: newLabel || undefined, isExternal: true },
      ]);
      setShowAddForm(false);
      setNewCoin('');
      setNewAddress('');
      setNewLabel('');
      toast({ title: t('common.success'), description: t('settingsExtended.addressAdded') });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsExtended.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (addr: ReceivingAddress) => {
    setEditingCoin(addr.coin);
    setEditAddress(addr.address);
    setEditLabel(addr.label || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCoin || !editAddress) return;
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAddresses(prev =>
        prev.map(a =>
          a.coin === editingCoin ? { ...a, address: editAddress, label: editLabel || undefined } : a
        )
      );
      setEditingCoin(null);
      toast({ title: t('common.success'), description: t('settingsExtended.addressUpdated') });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsExtended.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (coin: string) => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAddresses(prev => prev.filter(a => a.coin !== coin));
      toast({ title: t('common.success'), description: t('settingsExtended.addressDeleted') });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsExtended.deleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const availableCoins = SUPPORTED_COINS.filter(c => !addresses.some(a => a.coin === c.code));

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.receiving')}
        description={t('settingsExtended.receivingDesc')}
        backHref="/settings"
        actions={
          availableCoins.length > 0 && !showAddForm ? (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('common.add')}
            </Button>
          ) : undefined
        }
      />

      {/* Add form */}
      {showAddForm && (
        <Card className="p-4 md:p-6 mb-4">
          <h3 className="text-base font-semibold mb-4">
            {t('settingsExtended.addReceivingAddress')}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('settingsExtended.coin')} *
                </label>
                <Select value={newCoin} onValueChange={setNewCoin}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settingsExtended.selectCoin')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCoins.map(coin => (
                      <SelectItem key={coin.code} value={coin.code}>
                        <span className="mr-2">{coin.icon}</span>
                        {coin.name} ({coin.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('settingsExtended.label')}
                </label>
                <Input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder={t('settingsExtended.labelPlaceholder')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('settingsExtended.address')} *
              </label>
              <Input
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder={t('settingsExtended.addressPlaceholder')}
                className="font-mono"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCoin('');
                  setNewAddress('');
                  setNewLabel('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAddAddress} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t('common.add')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Address list */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          {t('common.loading')}
        </div>
      ) : addresses.length === 0 ? (
        <Card className="p-4 md:p-6 text-center">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold mb-2">
            {t('settingsExtended.noReceivingAddresses')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('settingsExtended.noReceivingAddressesDesc')}
          </p>
          {availableCoins.length > 0 && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('settingsExtended.addFirstAddress')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => {
            const coinInfo = SUPPORTED_COINS.find(c => c.code === addr.coin);
            const isEditing = editingCoin === addr.coin;

            return (
              <Card key={addr.coin} className="p-4 md:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                    {coinInfo?.icon || '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base">
                        {coinInfo?.name || addr.coin}
                      </span>
                      <span className="text-xs text-muted-foreground">({addr.coin})</span>
                      {addr.isExternal && (
                        <span className="px-2 py-0.5 bg-info/15 text-info text-xs rounded">
                          {t('settingsExtended.externalWallet')}
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <Input
                          value={editAddress}
                          onChange={e => setEditAddress(e.target.value)}
                          className="font-mono text-sm"
                          placeholder={t('settingsExtended.addressPlaceholder')}
                        />
                        <Input
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          placeholder={t('settingsExtended.labelPlaceholder')}
                        />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingCoin(null)}>
                            {t('common.cancel')}
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                            {t('common.save')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-mono text-xs sm:text-sm text-muted-foreground mt-1 break-all">
                          {addr.address}
                        </p>
                        {addr.label && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {addr.label}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => startEdit(addr)}
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t('settingsExtended.confirmDelete')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('settingsExtended.deleteAddressDesc', {
                                name: coinInfo?.name || addr.coin,
                              })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(addr.coin)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t('common.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <Card className="mt-6 p-4 md:p-6 bg-info/5 border-info/20">
        <h4 className="font-medium text-info mb-2">{t('settingsExtended.aboutReceiving')}</h4>
        <ul className="text-sm text-info/80 space-y-1">
          <li>• {t('settingsExtended.receivingTip1')}</li>
          <li>• {t('settingsExtended.receivingTip2')}</li>
          <li>• {t('settingsExtended.receivingTip3')}</li>
          <li>• {t('settingsExtended.receivingTip4')}</li>
        </ul>
      </Card>
    </div>
  );
}
