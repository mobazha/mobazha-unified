'use client';

import React from 'react';
import { Shield, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, getImageUrl } from '@mobazha/core';
import { PaymentProtectionCardProps } from './types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const PaymentProtectionCard: React.FC<PaymentProtectionCardProps> = ({
  enabled,
  onEnabledChange,
  selectedModerator,
  onChangeModerator,
  protectionDays = 45,
  className,
}) => {
  const { t } = useI18n();

  // 获取仲裁员头像
  const moderatorAvatarUrl = selectedModerator?.avatarHashes?.small
    ? getImageUrl(selectedModerator.avatarHashes.small)
    : undefined;

  // 计算费率显示
  const feeDisplay = React.useMemo(() => {
    if (!selectedModerator?.fee) return '';
    const { fee } = selectedModerator;

    if (fee.feeType === 'percentage' && fee.percentage !== undefined) {
      return `${fee.percentage}%`;
    } else if (fee.feeType === 'fixed' && fee.fixedFee) {
      return `${fee.fixedFee.amount} ${fee.fixedFee.currency}`;
    } else if (fee.feeType === 'percentage_plus_fixed') {
      const parts = [];
      if (fee.percentage !== undefined) parts.push(`${fee.percentage}%`);
      if (fee.fixedFee) parts.push(`${fee.fixedFee.amount} ${fee.fixedFee.currency}`);
      return parts.join(' + ');
    }
    return '';
  }, [selectedModerator]);

  return (
    <div
      data-testid="payment-protection-card"
      className={cn('rounded-xl border border-border bg-surface overflow-hidden', className)}
    >
      {/* 头部：启用开关 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{t('payment.paymentProtection')}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{t('payment.paymentProtectionInfo')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-sm text-muted-foreground">
              {t('payment.protectFor', { days: protectionDays })}
            </span>
          </div>
        </div>
        <Switch
          data-testid="payment-protection-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {/* 仲裁员信息（仅当启用时显示） */}
      {enabled && (
        <div className="p-4">
          {selectedModerator ? (
            <button
              type="button"
              onClick={onChangeModerator}
              className="flex items-center gap-3 w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={moderatorAvatarUrl} alt={selectedModerator.name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedModerator.name?.[0] || 'M'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground truncate">
                    {selectedModerator.name}
                  </span>
                  {selectedModerator.verifiedMod && (
                    <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {t('payment.fee')}: {feeDisplay}
                  </span>
                  {selectedModerator.location && (
                    <>
                      <span>•</span>
                      <span>{selectedModerator.location}</span>
                    </>
                  )}
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </button>
          ) : (
            <Button
              variant="outline"
              className="min-h-11 w-full justify-between"
              onClick={onChangeModerator}
            >
              <span>{t('payment.selectModerator')}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentProtectionCard;
