'use client';

import React from 'react';
import { Check, Shield, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Moderator } from './types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useI18n, getImageUrl } from '@mobazha/core';

export interface ModeratorCardProps {
  moderator: Moderator;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export const ModeratorCard: React.FC<ModeratorCardProps> = ({
  moderator,
  selected,
  onClick,
  disabled = false,
  compact = false,
  className,
}) => {
  const { t } = useI18n();

  // 获取头像 URL
  const avatarUrl = moderator.avatarHashes?.small
    ? getImageUrl(moderator.avatarHashes.small)
    : undefined;

  // 计算费率显示
  const feeDisplay = React.useMemo(() => {
    const { fee } = moderator || {};
    if (!fee) return '';

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
  }, [moderator]);

  if (compact) {
    // 紧凑模式 - 用于结算页面摘要显示
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex items-center gap-3 w-full p-3 rounded-lg',
          'border transition-all duration-200',
          'text-left',
          selected ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <Avatar className="w-10 h-10">
          <AvatarImage src={avatarUrl} alt={moderator.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {moderator.name?.[0] || 'M'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground truncate">{moderator.name}</span>
            {moderator.verifiedMod && <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </div>
          <span className="text-xs text-muted-foreground">
            {t('payment.moderatorFee')}: {feeDisplay}
          </span>
        </div>

        {selected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </button>
    );
  }

  // 完整卡片模式 - 用于仲裁员选择列表
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col p-4 rounded-xl',
        'border transition-all duration-200',
        'text-left w-full',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-surface hover:bg-muted/30 hover:border-muted-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* 选中指示器 */}
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* 头部：头像和基本信息 */}
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatarUrl} alt={moderator.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {moderator.name?.[0] || 'M'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-foreground">{moderator.name}</span>
            {moderator.verifiedMod && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary text-[10px] h-5 gap-0.5"
              >
                <Shield className="w-3 h-3" />
                {t('payment.verified')}
              </Badge>
            )}
          </div>

          {moderator.handle && (
            <span className="text-sm text-muted-foreground">@{moderator.handle}</span>
          )}

          {moderator.location && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{moderator.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* 描述 */}
      {moderator.description && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{moderator.description}</p>
      )}

      {/* 底部：费率和语言 */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{t('payment.fee')}:</span>
          <span className="text-sm font-medium text-foreground">{feeDisplay}</span>
        </div>

        {moderator.languages && moderator.languages.length > 0 && (
          <div className="flex items-center gap-1">
            {moderator.languages.slice(0, 3).map(lang => (
              <Badge key={lang} variant="outline" className="text-[10px] h-5">
                {lang.toUpperCase()}
              </Badge>
            ))}
            {moderator.languages.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{moderator.languages.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

export default ModeratorCard;
