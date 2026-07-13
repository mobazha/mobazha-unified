// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CollectiblesExperienceHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  variant?: 'page' | 'section';
  className?: string;
}

export function CollectiblesExperienceHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  variant = 'page',
  className,
}: CollectiblesExperienceHeaderProps) {
  const isPage = variant === 'page';

  return (
    <header className={cn('space-y-3', className)} data-testid="collectibles-experience-header">
      {backHref ? (
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-11 min-h-[44px] px-2">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        </Button>
      ) : null}

      <div
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
          isPage && 'rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6'
        )}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <h1
            className={cn(
              'font-bold text-foreground',
              isPage ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
