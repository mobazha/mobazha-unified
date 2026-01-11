'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HStack, VStack } from '@/components/layouts';

const acceptedCoins = [
  { symbol: 'BTC', name: 'Bitcoin', enabled: true },
  { symbol: 'ETH', name: 'Ethereum', enabled: true },
  { symbol: 'USDT', name: 'Tether', enabled: true },
  { symbol: 'USDC', name: 'USD Coin', enabled: false },
  { symbol: 'BNB', name: 'Binance Coin', enabled: false },
  { symbol: 'LTC', name: 'Litecoin', enabled: false },
];

interface SettingItemProps {
  title: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

const SettingItem = ({
  title,
  description,
  value,
  onClick,
  toggle,
  toggleValue,
  onToggle,
}: SettingItemProps) => {
  const content = (
    <>
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        )}
      </div>
      {toggle ? (
        <Switch
          checked={toggleValue}
          onCheckedChange={val => onToggle?.(val)}
          className="ml-3 flex-shrink-0"
        />
      ) : value ? (
        <span className="text-muted-foreground text-sm ml-3 flex-shrink-0">{value}</span>
      ) : onClick ? (
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0" />
      ) : null}
    </>
  );

  const baseClassName =
    'w-full flex items-center justify-between p-3 hover:bg-surface-hover/50 transition-colors border-b border-border last:border-0';

  if (toggle || !onClick) {
    return <div className={baseClassName}>{content}</div>;
  }

  return (
    <button onClick={onClick} className={`${baseClassName} active:bg-muted`}>
      {content}
    </button>
  );
};

interface SettingGroupProps {
  title?: string;
  children: React.ReactNode;
}

const SettingGroup = ({ title, children }: SettingGroupProps) => (
  <div className="mb-6">
    {title && (
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {title}
      </h3>
    )}
    <Card className="overflow-hidden">{children}</Card>
  </div>
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

  const handleComingSoon = (feature: string) => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: `${feature} ${t('common.comingSoon').toLowerCase()}`,
    });
  };

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-6">{t('settings.sidebar.store')}</h1>

      <SettingGroup title={t('settingsExtended.store')}>
        <SettingItem
          title={t('settingsExtended.storePolicies')}
          description={t('settingsExtended.storePoliciesDesc')}
          onClick={() => handleComingSoon('Store Policies')}
        />
        <SettingItem
          title={t('settingsExtended.moderators')}
          description={t('settingsExtended.moderatorsDesc')}
          onClick={() => router.push('/settings/moderation')}
        />
        <SettingItem
          title={t('settingsExtended.acceptedCryptocurrencies')}
          value={t('settingsExtended.selected', { count: enabledCoinsCount })}
          onClick={() => setShowCoinsModal(true)}
        />
        <SettingItem
          title={t('settingsExtended.shippingOptions')}
          description={t('settingsExtended.shippingOptionsDesc')}
          onClick={() => handleComingSoon('Shipping Options')}
        />
      </SettingGroup>

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
