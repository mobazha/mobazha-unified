'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  Info,
  PackageX,
  PackageCheck,
  TrendingUp,
  Zap,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useI18n, fulfillmentApi } from '@mobazha/core';
import type {
  SupplyChainAlert,
  AutoActionRule,
  AlertType,
  AlertSeverity,
  RuleTrigger,
  RuleAction,
} from '@mobazha/core';
import { cn } from '@/lib/utils';
import { SourcingFeatureGuard } from '../SourcingFeatureGuard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  warning:
    'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  info: 'bg-primary/10 text-primary border-primary/20',
};

const SEVERITY_ICON: Record<AlertSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const ALERT_TYPE_ICON: Record<AlertType, typeof PackageX> = {
  stock_out: PackageX,
  stock_back: PackageCheck,
  price_drift: TrendingUp,
  rule_action: Zap,
  product_changed: TrendingUp,
  product_discontinued: PackageX,
};

function alertTypeLabel(t: (k: string) => string, type: AlertType): string {
  const map: Record<AlertType, string> = {
    stock_out: t('admin.sourcing.alertTypeStockOut'),
    stock_back: t('admin.sourcing.alertTypeStockBack'),
    price_drift: t('admin.sourcing.alertTypePriceDrift'),
    rule_action: t('admin.sourcing.alertTypeRuleAction'),
    product_changed: t('admin.sourcing.alertTypeProductChanged'),
    product_discontinued: t('admin.sourcing.alertTypeProductDiscontinued'),
  };
  return map[type] || type;
}

function _severityLabel(t: (k: string) => string, sev: AlertSeverity): string {
  const map: Record<AlertSeverity, string> = {
    info: t('admin.sourcing.alertSeverityInfo'),
    warning: t('admin.sourcing.alertSeverityWarning'),
    critical: t('admin.sourcing.alertSeverityCritical'),
  };
  return map[sev] || sev;
}

function triggerLabel(t: (k: string) => string, trigger: RuleTrigger): string {
  const map: Record<RuleTrigger, string> = {
    stock_out: t('admin.sourcing.triggerStockOut'),
    stock_back: t('admin.sourcing.triggerStockBack'),
    price_drift: t('admin.sourcing.triggerPriceDrift'),
    product_cost_changed: t('admin.sourcing.triggerProductCostChanged'),
    product_discontinued: t('admin.sourcing.triggerProductDiscontinued'),
  };
  return map[trigger] || trigger;
}

function actionLabel(t: (k: string) => string, action: RuleAction): string {
  const map: Record<RuleAction, string> = {
    hide_listing: t('admin.sourcing.actionHideListing'),
    show_listing: t('admin.sourcing.actionShowListing'),
    pause_listing: t('admin.sourcing.actionPauseListing'),
    notify_only: t('admin.sourcing.actionNotifyOnly'),
    auto_delist: t('admin.sourcing.actionAutoDelist'),
  };
  return map[action] || action;
}

// ---------------------------------------------------------------------------
// Alert Card
// ---------------------------------------------------------------------------

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: SupplyChainAlert;
  onDismiss: (id: string) => void;
}) {
  const { t } = useI18n();
  const SevIcon = SEVERITY_ICON[alert.severity] || Info;
  const TypeIcon = ALERT_TYPE_ICON[alert.alertType] || Bell;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border transition-opacity',
        SEVERITY_STYLES[alert.severity],
        alert.dismissed && 'opacity-50'
      )}
    >
      <SevIcon className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <TypeIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">
            {alertTypeLabel(t, alert.alertType)}
          </span>
          <span className="text-xs opacity-60">
            {new Date(alert.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm font-medium">{alert.title}</p>
        <p className="text-xs opacity-80 mt-0.5">{alert.message}</p>
        {alert.listingSlug && (
          <Link
            href={`/admin/products/${alert.listingSlug}/edit`}
            className="text-xs underline mt-1 inline-block hover:opacity-80"
          >
            {alert.listingSlug}
          </Link>
        )}
      </div>
      {!alert.dismissed && (
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-xs px-2.5 py-1 rounded-md bg-background/50 hover:bg-background/80 transition-colors shrink-0"
          title={t('admin.sourcing.dismissAlert')}
        >
          <BellOff className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rule Card
// ---------------------------------------------------------------------------

function RuleCard({ rule, onDelete }: { rule: AutoActionRule; onDelete: (id: string) => void }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'w-2 h-2 rounded-full shrink-0',
              rule.enabled !== false ? 'bg-success' : 'bg-muted-foreground'
            )}
          />
          <span className="text-xs text-muted-foreground">
            {rule.enabled !== false
              ? t('admin.sourcing.ruleEnabled')
              : t('admin.sourcing.ruleDisabled')}
          </span>
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">{t('admin.sourcing.triggerLabel')}: </span>
          <span className="font-medium text-foreground">{triggerLabel(t, rule.trigger)}</span>
          {rule.threshold != null && rule.threshold > 0 && (
            <span className="text-muted-foreground"> (&gt; {rule.threshold}%)</span>
          )}
        </p>
        <p className="text-sm mt-0.5">
          <span className="text-muted-foreground">{t('admin.sourcing.actionLabel')}: </span>
          <span className="font-medium text-foreground">{actionLabel(t, rule.action)}</span>
        </p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onDelete(rule.id);
              setConfirming(false);
            }}
            className="text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            {t('admin.sourcing.deleteRule')}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-3 py-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title={t('admin.sourcing.deleteRule')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Rule Form
// ---------------------------------------------------------------------------

const TRIGGERS: RuleTrigger[] = [
  'stock_out',
  'stock_back',
  'price_drift',
  'product_cost_changed',
  'product_discontinued',
];
const ACTIONS: RuleAction[] = [
  'hide_listing',
  'show_listing',
  'pause_listing',
  'notify_only',
  'auto_delist',
];

function CreateRuleForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useI18n();
  const [trigger, setTrigger] = useState<RuleTrigger>('stock_out');
  const [action, setAction] = useState<RuleAction>('hide_listing');
  const [threshold, setThreshold] = useState<number>(10);
  const [creating, setCreating] = useState(false);

  const showThreshold = trigger === 'price_drift' || trigger === 'product_cost_changed';

  const handleCreate = async () => {
    setCreating(true);
    try {
      await fulfillmentApi.createRule({
        trigger,
        action,
        threshold: showThreshold ? threshold : undefined,
        enabled: true,
      });
      onCreated();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-4 bg-card">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {t('admin.sourcing.triggerLabel')}
          </label>
          <select
            value={trigger}
            onChange={e => setTrigger(e.target.value as RuleTrigger)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {TRIGGERS.map(trig => (
              <option key={trig} value={trig}>
                {triggerLabel(t, trig)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {t('admin.sourcing.actionLabel')}
          </label>
          <select
            value={action}
            onChange={e => setAction(e.target.value as RuleAction)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {ACTIONS.map(act => (
              <option key={act} value={act}>
                {actionLabel(t, act)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {showThreshold && (
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {t('admin.sourcing.thresholdLabel')}
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      )}
      <button
        onClick={handleCreate}
        disabled={creating}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm transition-colors"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {t('admin.sourcing.addRule')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AlertsPage() {
  return (
    <SourcingFeatureGuard>
      <AlertsContent />
    </SourcingFeatureGuard>
  );
}

function AlertsContent() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<SupplyChainAlert[]>([]);
  const [rules, setRules] = useState<AutoActionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDismissed, setShowDismissed] = useState(false);
  const [showCreateRule, setShowCreateRule] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedAlerts, fetchedRules] = await Promise.all([
        fulfillmentApi.getAlerts({ dismissed: showDismissed || undefined, limit: 100 }),
        fulfillmentApi.getRules(),
      ]);
      setAlerts(fetchedAlerts);
      setRules(fetchedRules);
    } finally {
      setLoading(false);
    }
  }, [showDismissed]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDismiss = async (alertID: string) => {
    await fulfillmentApi.dismissAlert(alertID);
    setAlerts(prev => prev.map(a => (a.id === alertID ? { ...a, dismissed: true } : a)));
  };

  const handleDeleteRule = async (ruleID: string) => {
    await fulfillmentApi.deleteRule(ruleID);
    setRules(prev => prev.filter(r => r.id !== ruleID));
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const dismissedAlerts = alerts.filter(a => a.dismissed);
  const displayAlerts = showDismissed ? alerts : activeAlerts;

  return (
    <div data-testid="admin-sourcing-alerts">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/sourcing" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('admin.sourcing.alertsAndRules')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('admin.sourcing.alertsDesc')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Alerts Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  {t('admin.sourcing.alerts')}
                  {activeAlerts.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({activeAlerts.length})
                    </span>
                  )}
                </h2>
              </div>
              {dismissedAlerts.length > 0 && (
                <button
                  onClick={() => setShowDismissed(!showDismissed)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDismissed ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  {showDismissed
                    ? t('admin.sourcing.hideDismissed')
                    : t('admin.sourcing.showDismissed')}
                </button>
              )}
            </div>

            {displayAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-card border border-border rounded-xl">
                <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {t('admin.sourcing.noAlerts')}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {t('admin.sourcing.noAlertsDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} onDismiss={handleDismiss} />
                ))}
              </div>
            )}
          </section>

          {/* Rules Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  {t('admin.sourcing.rules')}
                </h2>
              </div>
              <button
                onClick={() => setShowCreateRule(!showCreateRule)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('admin.sourcing.addRule')}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">{t('admin.sourcing.rulesDesc')}</p>

            {showCreateRule && (
              <div className="mb-4">
                <CreateRuleForm
                  onCreated={() => {
                    setShowCreateRule(false);
                    fetchAll();
                  }}
                />
              </div>
            )}

            {rules.length === 0 && !showCreateRule ? (
              <div className="flex flex-col items-center justify-center py-12 bg-card border border-border rounded-xl">
                <Zap className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {t('admin.sourcing.noRules')}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {t('admin.sourcing.noRulesDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => (
                  <RuleCard key={rule.id} rule={rule} onDelete={handleDeleteRule} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
