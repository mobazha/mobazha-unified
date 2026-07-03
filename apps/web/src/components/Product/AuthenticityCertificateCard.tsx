'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { Award, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AuthenticityCertificateCardProps {
  certificateUrl: string;
  compact?: boolean;
  className?: string;
}

export function AuthenticityCertificateCard({
  certificateUrl,
  compact = false,
  className,
}: AuthenticityCertificateCardProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30',
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3',
        className
      )}
      data-testid="product-authenticity-certificate-card"
    >
      <div className="flex items-start gap-3">
        <Award
          className={cn('text-primary shrink-0 mt-0.5', compact ? 'w-4 h-4' : 'w-5 h-5')}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-medium text-foreground',
              compact ? 'text-sm' : 'text-sm sm:text-base'
            )}
          >
            {t('product.authenticity.title')}
          </p>
          <p
            className={cn(
              'text-muted-foreground mt-0.5',
              compact ? 'text-xs' : 'text-xs sm:text-sm'
            )}
          >
            {t('product.authenticity.description')}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        className={cn('w-full touch-feedback', compact && 'h-9 text-xs')}
        asChild
      >
        <a href={certificateUrl} target="_blank" rel="noopener noreferrer">
          {t('product.authenticity.viewCertificate')}
          <ExternalLink className="w-3.5 h-3.5 ml-2" aria-hidden />
        </a>
      </Button>
    </div>
  );
}
