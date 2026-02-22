'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { ChevronRight } from 'lucide-react';
import { HStack, VStack } from '@/components/layouts';
import { SettingsPageHeader } from '@/components/SettingsLayout';

const acceptedCoins = [
  { symbol: 'BTC', name: 'Bitcoin', enabled: true },
  { symbol: 'ETH', name: 'Ethereum', enabled: true },
  { symbol: 'USDT', name: 'Tether', enabled: true },
  { symbol: 'USDC', name: 'USD Coin', enabled: false },
  { symbol: 'BNB', name: 'Binance Coin', enabled: false },
  { symbol: 'LTC', name: 'Litecoin', enabled: false },
];

interface SettingRowProps {
  title: string;
  description?: string;
  value?: string;
  onClick: () => void;
}

const SettingRow: React.FC<SettingRowProps> = ({ title, description, value, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 hover:bg-surface-hover/50 active:bg-muted transition-colors border-b border-border last:border-0 text-left min-h-[44px]"
  >
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
      )}
    </div>
    {value ? (
      <span className="text-muted-foreground text-sm ml-3 flex-shrink-0">{value}</span>
    ) : null}
    <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0" />
  </button>
);

export default function StoreSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [coins, setCoins] = useState(acceptedCoins);
  const [showCoinsModal, setShowCoinsModal] = useState(false);

  const handleCoinToggle = (symbol: string) => {
    setCoins(prev =>
      prev.map(coin => (coin.symbol === symbol ? { ...coin, enabled: !coin.enabled } : coin))
    );
  };

  const enabledCoinsCount = coins.filter(c => c.enabled).length;

  const handleComingSoon = () => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.storePoliciesDesc'),
    });
  };

  return (
    <div>
      <SettingsPageHeader title={t('settings.sidebar.store')} />

      <Card className="overflow-hidden">
        <SettingRow
          title={t('settingsExtended.storePolicies')}
          description={t('settingsExtended.storePoliciesDesc')}
          onClick={handleComingSoon}
        />
        <SettingRow
          title={t('settingsExtended.moderators')}
          description={t('settingsExtended.moderatorsDesc')}
          onClick={() => router.push('/settings/moderation')}
        />
        <SettingRow
          title={t('settingsExtended.acceptedCryptocurrencies')}
          value={t('settingsExtended.selected', { count: enabledCoinsCount })}
          onClick={() => setShowCoinsModal(true)}
        />
        <SettingRow
          title={t('settingsExtended.shippingOptions')}
          description={t('settingsExtended.shippingOptionsDesc')}
          onClick={() => router.push('/settings/store/shipping')}
        />
      </Card>

      {/* Coins Modal */}
      <Dialog open={showCoinsModal} onOpenChange={setShowCoinsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.acceptedCryptocurrencies')}</DialogTitle>
          </DialogHeader>
          <VStack gap="sm">
            {coins.map(coin => (
              <HStack
                key={coin.symbol}
                justify="between"
                align="center"
                className="p-3 rounded-lg bg-muted"
              >
                <div>
                  <p className="font-medium text-foreground">{coin.symbol}</p>
                  <p className="text-sm text-muted-foreground">{coin.name}</p>
                </div>
                <Switch
                  checked={coin.enabled}
                  onCheckedChange={() => handleCoinToggle(coin.symbol)}
                />
              </HStack>
            ))}
          </VStack>
          <Button className="w-full mt-4" onClick={() => setShowCoinsModal(false)}>
            {t('settingsExtended.done')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
