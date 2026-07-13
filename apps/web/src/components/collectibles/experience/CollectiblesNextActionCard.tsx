// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface CollectiblesNextActionCardProps {
  title: string;
  description?: string;
  statusLabel?: string;
  statusVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    testId?: string;
  };
  secondaryActions?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'outline' | 'ghost' | 'link';
    testId?: string;
  }>;
  children?: React.ReactNode;
  sticky?: boolean;
  className?: string;
  testId?: string;
}

function resolveActionKey(
  action: { label: string; href?: string; testId?: string },
  index: number
): string {
  return action.testId ?? action.href ?? `${action.label}-${index}`;
}

function renderHrefAction(
  action: {
    label: string;
    href: string;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'ghost' | 'link';
    testId?: string;
  },
  className: string,
  key: string
) {
  if (action.disabled) {
    return (
      <Button
        key={key}
        type="button"
        variant={action.variant ?? 'default'}
        className={className}
        disabled
        aria-disabled="true"
        data-testid={action.testId}
      >
        {action.label}
      </Button>
    );
  }

  return (
    <Button
      key={key}
      asChild
      variant={action.variant ?? 'default'}
      className={className}
      data-testid={action.testId}
    >
      <Link href={action.href}>{action.label}</Link>
    </Button>
  );
}

export function CollectiblesNextActionCard({
  title,
  description,
  statusLabel,
  statusVariant = 'secondary',
  primaryAction,
  secondaryActions,
  children,
  sticky = false,
  className,
  testId = 'collectibles-next-action-card',
}: CollectiblesNextActionCardProps) {
  return (
    <Card
      className={cn(
        'space-y-3 p-4 sm:p-5',
        sticky && 'sticky bottom-4 z-10 border-primary/30 shadow-md sm:static sm:shadow-none',
        className
      )}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground sm:text-base">{title}</h3>
          {description ? (
            <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
          ) : null}
        </div>
        {statusLabel ? <Badge variant={statusVariant}>{statusLabel}</Badge> : null}
      </div>

      {children}

      {(primaryAction || secondaryActions?.length) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {primaryAction ? (
            primaryAction.href ? (
              renderHrefAction(
                {
                  label: primaryAction.label,
                  href: primaryAction.href,
                  disabled: primaryAction.disabled,
                  testId: primaryAction.testId,
                },
                'min-h-[44px] w-full sm:w-auto',
                resolveActionKey(primaryAction, 0)
              )
            ) : (
              <Button
                type="button"
                className="min-h-[44px] w-full sm:w-auto"
                disabled={primaryAction.disabled}
                onClick={primaryAction.onClick}
                data-testid={primaryAction.testId}
              >
                {primaryAction.label}
              </Button>
            )
          ) : null}
          {secondaryActions?.map((action, index) => {
            const actionKey = resolveActionKey(action, index);
            return action.href ? (
              renderHrefAction(
                {
                  label: action.label,
                  href: action.href,
                  disabled: action.disabled,
                  variant: action.variant ?? 'outline',
                  testId: action.testId,
                },
                'min-h-[44px] w-full sm:w-auto',
                actionKey
              )
            ) : (
              <Button
                key={actionKey}
                type="button"
                variant={action.variant ?? 'outline'}
                className="min-h-[44px] w-full sm:w-auto"
                disabled={action.disabled}
                onClick={action.onClick}
                data-testid={action.testId}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
