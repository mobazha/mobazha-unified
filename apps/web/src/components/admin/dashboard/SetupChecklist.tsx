'use client';

import React, { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  useI18n,
  useReceivingAccounts,
  useShippingProfiles,
  useStorefrontConfig,
  EDITION_I18N_KEYS,
} from '@mobazha/core';
import {
  ShoppingBag,
  CreditCard,
  Truck,
  Palette,
  Check,
  ChevronDown,
  ChevronUp,
  PartyPopper,
} from 'lucide-react';

const CHECKLIST_DISMISSED_KEY = 'setupChecklistDismissed';

function isChecklistDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CHECKLIST_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

interface ChecklistStep {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
  href: string;
  completed: boolean;
}

interface SetupChecklistProps {
  hasProducts: boolean;
  productsLoading: boolean;
}

export function SetupChecklist({ hasProducts, productsLoading }: SetupChecklistProps) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(isChecklistDismissed);
  const [collapsed, setCollapsed] = useState(false);

  const { data: receivingAccounts } = useReceivingAccounts();
  const { profiles, isLoading: shippingLoading } = useShippingProfiles();
  const { config, isLoading: storefrontLoading } = useStorefrontConfig();

  const hasPayment = useMemo(() => {
    return Array.isArray(receivingAccounts) && receivingAccounts.some(a => a.isActive !== false);
  }, [receivingAccounts]);

  const hasShipping = useMemo(() => profiles.length > 0, [profiles]);

  const hasStorefrontCustomized = useMemo(() => {
    if (!config) return false;
    return Boolean(config.sections && config.sections.length > 0) || Boolean(config.theme);
  }, [config]);

  const steps: ChecklistStep[] = useMemo(
    () => [
      {
        id: 'product',
        icon: ShoppingBag,
        labelKey: 'admin.checklist.addProduct',
        descKey: 'admin.checklist.addProductDesc',
        href: '/listing/new?from=admin',
        completed: hasProducts,
      },
      {
        id: 'payment',
        icon: CreditCard,
        labelKey: 'admin.checklist.setupPayment',
        descKey: EDITION_I18N_KEYS.setupPaymentChecklistDesc,
        href: '/admin/settings/payments',
        completed: hasPayment,
      },
      {
        id: 'shipping',
        icon: Truck,
        labelKey: 'admin.checklist.setupShipping',
        descKey: 'admin.checklist.setupShippingDesc',
        href: '/admin/settings/shipping',
        completed: hasShipping,
      },
      {
        id: 'branding',
        icon: Palette,
        labelKey: 'admin.checklist.customizeStore',
        descKey: 'admin.checklist.customizeStoreDesc',
        href: '/admin/storefront',
        completed: hasStorefrontCustomized,
      },
    ],
    [hasProducts, hasPayment, hasShipping, hasStorefrontCustomized]
  );

  const anyLoading = productsLoading || shippingLoading || storefrontLoading;
  const stepLoadingMap: Record<string, boolean> = {
    product: productsLoading,
    payment: false,
    shipping: shippingLoading,
    branding: storefrontLoading,
  };
  const completedCount = useMemo(() => steps.filter(s => s.completed).length, [steps]);
  const allCompleted = !anyLoading && completedCount === steps.length;

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true');
    } catch {
      /* noop */
    }
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  if (allCompleted) {
    return (
      <div className="mb-6 rounded-xl border border-success/30 bg-success/5 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t('admin.checklist.allDoneTitle')}
              </h3>
              <p className="text-xs text-muted-foreground">{t('admin.checklist.allDoneDesc')}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0 px-2"
          >
            {t('admin.checklist.dismiss')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t('admin.checklist.title')}</h3>
          <span className="text-xs text-muted-foreground">
            {t('admin.checklist.progress', {
              completed: String(completedCount),
              total: String(steps.length),
            })}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
        <div
          className={`h-full rounded-full bg-primary transition-all duration-500 ${anyLoading ? 'opacity-60' : ''}`}
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {steps.map(step => {
            const Icon = step.icon;
            const isStepLoading = stepLoadingMap[step.id];
            return (
              <Link
                key={step.id}
                href={step.completed || isStepLoading ? '#' : step.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors group ${
                  step.completed
                    ? 'bg-muted/50 cursor-default'
                    : isStepLoading
                      ? 'cursor-default opacity-70'
                      : 'hover:bg-muted/50'
                }`}
                onClick={
                  step.completed || isStepLoading
                    ? (e: React.MouseEvent) => e.preventDefault()
                    : undefined
                }
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    step.completed
                      ? 'bg-success/10 text-success'
                      : isStepLoading
                        ? 'bg-muted text-muted-foreground animate-pulse'
                        : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                  }`}
                >
                  {step.completed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {t(step.labelKey)}
                  </p>
                  {!step.completed && (
                    <p className="text-xs text-muted-foreground">{t(step.descKey)}</p>
                  )}
                </div>
                {!step.completed && !isStepLoading && (
                  <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {t('admin.checklist.goSetup')}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
