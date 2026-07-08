'use client';

import React from 'react';
import { Check, Link2, Share2, Users } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { useDealLinksContext } from './DealLinksContext';

export function DealLinksOnboarding() {
  const { t } = useI18n();
  const { dealLinks, programs, loading } = useDealLinksContext();

  const activeLinks = dealLinks.filter(link => link.status === 'active');
  const hasLink = activeLinks.length > 0;
  const hasActiveProgram = programs.some(program => program.status === 'active');

  if (loading) {
    return null;
  }

  const steps = [
    {
      id: 'link',
      icon: Link2,
      label: t('admin.dealLinks.onboarding.step1'),
      done: hasLink,
      current: !hasLink,
    },
    {
      id: 'program',
      icon: Users,
      label: t('admin.dealLinks.onboarding.step2'),
      done: hasActiveProgram,
      current: hasLink && !hasActiveProgram,
    },
    {
      id: 'share',
      icon: Share2,
      label: t('admin.dealLinks.onboarding.step3'),
      done: hasActiveProgram,
      current: false,
    },
  ] as const;

  if (hasLink && hasActiveProgram) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      data-testid="deal-links-onboarding"
      role="list"
      aria-label={t('admin.dealLinks.onboarding.title')}
    >
      <p className="mb-3 text-sm font-medium">{t('admin.dealLinks.onboarding.title')}</p>
      <ol className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              role="listitem"
              className={cn(
                'flex min-w-0 flex-1 items-start gap-2 rounded-md border px-3 py-2 text-sm',
                step.current ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20',
                step.done && !step.current && 'opacity-80'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  step.done
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {t('admin.dealLinks.onboarding.stepNumber', { step: index + 1 })}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
