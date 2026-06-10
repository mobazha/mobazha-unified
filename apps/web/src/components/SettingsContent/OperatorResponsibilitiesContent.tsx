'use client';

import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { ShieldCheck, AlertTriangle, FileWarning, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui';
import {
  useI18n,
  isStandaloneMode,
  type TranslationKey,
  getAdminStorePaymentsPath,
} from '@mobazha/core';
import { SettingsSection } from '@/components/SettingsLayout';

// DG-1.14: Operator-responsibility acknowledgement (client-side MVP).
// Bump ACK_CONTRACT_VERSION when copy changes materially so sellers re-acknowledge.
const ACK_CONTRACT_VERSION = 1;
const ACK_STORAGE_KEY = 'mobazha-operator-responsibilities-ack-v1';

interface AckRecord {
  version: number;
  ackedAt: string;
}

type ResponsibilityItem = {
  textKey: string;
  href?: string;
  standaloneOnly?: boolean;
};

function parseAck(raw: string | null): AckRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AckRecord>;
    if (typeof parsed.version === 'number' && typeof parsed.ackedAt === 'string') {
      return { version: parsed.version, ackedAt: parsed.ackedAt };
    }
  } catch {
    // Legacy: plain ISO timestamp string
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      return { version: ACK_CONTRACT_VERSION, ackedAt: raw };
    }
  }
  return null;
}

function readAckRaw(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACK_STORAGE_KEY);
  } catch {
    return null;
  }
}

const ackListeners = new Set<() => void>();

function emitAckChange() {
  for (const listener of ackListeners) listener();
}

function writeAck(record: AckRecord | null) {
  if (typeof window === 'undefined') return;
  try {
    if (record === null) {
      window.localStorage.removeItem(ACK_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(record));
    }
  } catch {
    // localStorage may be unavailable (private browsing); silently degrade.
  }
  emitAckChange();
}

function subscribeAck(listener: () => void) {
  ackListeners.add(listener);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', listener);
  }
  return () => {
    ackListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', listener);
    }
  };
}

function ResponsibilityList({
  items,
  bulletClassName,
  t,
}: {
  items: ResponsibilityItem[];
  bulletClassName: string;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}) {
  const isStandalone = isStandaloneMode();

  return (
    <ul className="space-y-3 text-sm text-muted-foreground">
      {items.map(item => {
        if (item.standaloneOnly && !isStandalone) return null;
        const text = t(`settingsExtended.${item.textKey}` as TranslationKey);
        return (
          <li key={item.textKey} className="flex gap-2">
            <span className={`shrink-0 ${bulletClassName}`}>•</span>
            <div className="min-w-0 space-y-1">
              <span className="text-foreground">{text}</span>
              {item.standaloneOnly && (
                <span className="ml-2 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t('settingsExtended.operatorResponsibilitiesStandaloneBadge')}
                </span>
              )}
              {item.href && (
                <div>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {t('settingsExtended.operatorResponsibilitiesViewSettings')}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function OperatorResponsibilitiesContent() {
  const { t, formatDate } = useI18n();
  const { toast } = useToast();
  const [pendingChecked, setPendingChecked] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const ackRaw = useSyncExternalStore(subscribeAck, readAckRaw, () => null);
  const ackRecord = useMemo(() => parseAck(ackRaw), [ackRaw]);

  const isCurrentVersion = ackRecord !== null && ackRecord.version === ACK_CONTRACT_VERSION;
  const isAcked = isCurrentVersion;

  const handleConfirm = useCallback(() => {
    if (!pendingChecked) return;
    const now = new Date().toISOString();
    writeAck({ version: ACK_CONTRACT_VERSION, ackedAt: now });
    setPendingChecked(false);
    toast({
      variant: 'success',
      title: t('settingsExtended.operatorResponsibilitiesAckSaved'),
    });
  }, [pendingChecked, t, toast]);

  const handleRevoke = useCallback(() => {
    writeAck(null);
    setPendingChecked(false);
    setRevokeOpen(false);
  }, []);

  const platformItems: ResponsibilityItem[] = [
    { textKey: 'operatorResponsibilitiesPlatformInfra' },
    { textKey: 'operatorResponsibilitiesPlatformAUP' },
    { textKey: 'operatorResponsibilitiesPlatformCustody' },
    {
      textKey: 'operatorResponsibilitiesPlatformTech',
      href: '/admin/settings/moderators',
    },
  ];

  const sellerItems: ResponsibilityItem[] = [
    {
      textKey: 'operatorResponsibilitiesSellerTax',
      href: '/admin/settings/policies',
    },
    {
      textKey: 'operatorResponsibilitiesSellerContent',
      href: '/admin/settings/access-control/privacy',
    },
    {
      textKey: 'operatorResponsibilitiesSellerProcessor',
      href: getAdminStorePaymentsPath(),
    },
    {
      textKey: 'operatorResponsibilitiesSellerCustomer',
      href: '/admin/settings/policies',
    },
    {
      textKey: 'operatorResponsibilitiesSellerSelfHost',
      href: '/admin/system',
      standaloneOnly: true,
    },
  ];

  const ackedDate =
    isAcked && ackRecord
      ? formatDate(ackRecord.ackedAt, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

  return (
    <div className="divide-y divide-border">
      <SettingsSection
        className="pb-5 md:pb-8"
        title={t('settingsExtended.operatorResponsibilitiesMatrixTitle')}
        description={t('settingsExtended.operatorResponsibilitiesIntro')}
      >
        <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
          <Card className="flex h-full flex-col p-4 md:p-6">
            <div className="mb-3 flex items-start gap-3">
              <div className="shrink-0 rounded-lg bg-success/10 p-2 text-success">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground md:text-base">
                {t('settingsExtended.operatorResponsibilitiesPlatformTitle')}
              </h3>
            </div>
            <ResponsibilityList items={platformItems} bulletClassName="text-success" t={t} />
          </Card>

          <Card className="flex h-full flex-col p-4 md:p-6">
            <div className="mb-3 flex items-start gap-3">
              <div className="shrink-0 rounded-lg bg-warning/10 p-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground md:text-base">
                {t('settingsExtended.operatorResponsibilitiesSellerTitle')}
              </h3>
            </div>
            <ResponsibilityList items={sellerItems} bulletClassName="text-warning" t={t} />
          </Card>
        </div>
      </SettingsSection>

      <SettingsSection
        className="py-5 md:py-8"
        title={t('settingsExtended.operatorResponsibilitiesDigitalNoteTitle')}
      >
        <Card className="border-warning/30 bg-warning/5 p-4 md:p-6">
          <div className="flex gap-3">
            <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div className="min-w-0 space-y-3">
              <p className="text-sm text-foreground">
                {t('settingsExtended.operatorResponsibilitiesDigitalNote')}
              </p>
              <Link
                href="/admin/settings/policies"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {t('settingsExtended.operatorResponsibilitiesDigitalLink')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      </SettingsSection>

      <SettingsSection
        className="pt-5 md:pt-8"
        title={t('settingsExtended.operatorResponsibilitiesAckSectionTitle')}
        description={t('settingsExtended.operatorResponsibilitiesAckSectionDesc')}
      >
        <Card className="p-4 md:p-6">
          {ackRecord !== null && !isCurrentVersion && (
            <p
              className="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-foreground"
              role="status"
            >
              {t('settingsExtended.operatorResponsibilitiesVersionOutdated')}
            </p>
          )}

          {isAcked ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t('settingsExtended.operatorResponsibilitiesAckLabel')}
                  </p>
                  {ackedDate && (
                    <p className="text-xs text-muted-foreground">
                      {t('settingsExtended.operatorResponsibilitiesAckedAt', {
                        date: ackedDate,
                      })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('settingsExtended.operatorResponsibilitiesAckVersion', {
                      version: `v${ACK_CONTRACT_VERSION}`,
                    })}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevokeOpen(true)}
                data-testid="operator-responsibilities-revoke"
              >
                {t('settingsExtended.operatorResponsibilitiesRevokeAck')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <label
                htmlFor="operator-responsibilities-ack"
                className="flex cursor-pointer items-start gap-3"
              >
                <Checkbox
                  id="operator-responsibilities-ack"
                  checked={pendingChecked}
                  onCheckedChange={checked => setPendingChecked(Boolean(checked))}
                  data-testid="operator-responsibilities-ack"
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {t('settingsExtended.operatorResponsibilitiesAckLabel')}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsExtended.operatorResponsibilitiesUnacked')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsExtended.operatorResponsibilitiesAckVersion', {
                      version: `v${ACK_CONTRACT_VERSION}`,
                    })}
                  </p>
                </div>
              </label>
              <Button
                type="button"
                disabled={!pendingChecked}
                onClick={handleConfirm}
                data-testid="operator-responsibilities-confirm"
                data-ai-action="settings.operator-responsibilities.confirm"
              >
                {t('settingsExtended.operatorResponsibilitiesAckConfirm')}
              </Button>
            </div>
          )}
        </Card>
      </SettingsSection>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settingsExtended.operatorResponsibilitiesRevokeTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.operatorResponsibilitiesRevokeDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>
              {t('settingsExtended.operatorResponsibilitiesRevokeConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
