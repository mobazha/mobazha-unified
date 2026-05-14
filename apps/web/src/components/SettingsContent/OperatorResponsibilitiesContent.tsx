'use client';

import React, { useCallback, useSyncExternalStore } from 'react';
import { ShieldCheck, AlertTriangle, FileWarning } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { SettingsSection } from '@/components/SettingsLayout';

// DG-1.14: Operator-responsibility acknowledgement.
// Stored in localStorage as an MVP — we only need to (a) show the seller
// they have explicitly accepted the contract and (b) record the date for
// the seller's own records. A future Phase 2 task may upgrade this to a
// per-tenant UserPreferences field synced through the backend so the
// acknowledgement survives device wipes and supports admin reporting.
const ACK_STORAGE_KEY = 'mobazha-operator-responsibilities-ack-v1';

function readAck(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACK_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Notify subscribers when the ack value changes from inside this tab
// (storage events only fire on *other* tabs, so we proxy our own writes).
const ackListeners = new Set<() => void>();

function emitAckChange() {
  for (const listener of ackListeners) listener();
}

function writeAck(value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(ACK_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACK_STORAGE_KEY, value);
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

export function OperatorResponsibilitiesContent() {
  const { t } = useI18n();
  const { toast } = useToast();
  // useSyncExternalStore keeps the localStorage read out of useEffect and
  // avoids the cascading-render lint warning. Server snapshot returns null
  // since localStorage is client-only.
  const ackedAt = useSyncExternalStore(
    subscribeAck,
    () => readAck(),
    () => null
  );

  const handleToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        const now = new Date().toISOString();
        writeAck(now);
        toast({
          variant: 'success',
          title: t('settingsExtended.operatorResponsibilitiesAckSaved'),
        });
      } else {
        writeAck(null);
      }
    },
    [t, toast]
  );

  const platformItems = [
    t('settingsExtended.operatorResponsibilitiesPlatformInfra'),
    t('settingsExtended.operatorResponsibilitiesPlatformAUP'),
    t('settingsExtended.operatorResponsibilitiesPlatformCustody'),
    t('settingsExtended.operatorResponsibilitiesPlatformTech'),
  ];

  const sellerItems = [
    t('settingsExtended.operatorResponsibilitiesSellerTax'),
    t('settingsExtended.operatorResponsibilitiesSellerContent'),
    t('settingsExtended.operatorResponsibilitiesSellerProcessor'),
    t('settingsExtended.operatorResponsibilitiesSellerCustomer'),
    t('settingsExtended.operatorResponsibilitiesSellerSelfHost'),
  ];

  const ackedDate = ackedAt
    ? new Date(ackedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="divide-y divide-border">
      <SettingsSection
        className="pb-5 md:pb-8"
        title={t('settingsExtended.operatorResponsibilitiesPageTitle')}
        description={t('settingsExtended.operatorResponsibilitiesIntro')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4 md:p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm md:text-base font-semibold text-foreground">
                {t('settingsExtended.operatorResponsibilitiesPlatformTitle')}
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {platformItems.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-warning/10 text-warning shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm md:text-base font-semibold text-foreground">
                {t('settingsExtended.operatorResponsibilitiesSellerTitle')}
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {sellerItems.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-warning">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </SettingsSection>

      <SettingsSection
        className="pt-5 md:pt-8 pb-5 md:pb-8"
        title={t('settingsExtended.operatorResponsibilitiesDigitalNoteTitle')}
      >
        <Card className="p-4 md:p-6 border-warning/30 bg-warning/5">
          <div className="flex gap-3">
            <FileWarning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              {t('settingsExtended.operatorResponsibilitiesDigitalNote')}
            </p>
          </div>
        </Card>
      </SettingsSection>

      <SettingsSection className="pt-5 md:pt-8" title="">
        <Card className="p-4 md:p-6">
          <label
            htmlFor="operator-responsibilities-ack"
            className="flex items-start gap-3 cursor-pointer"
          >
            <Checkbox
              id="operator-responsibilities-ack"
              checked={ackedAt !== null}
              onCheckedChange={checked => handleToggle(Boolean(checked))}
              data-testid="operator-responsibilities-ack"
              className="mt-0.5"
            />
            <div className="space-y-1">
              <span className="text-sm font-medium text-foreground">
                {t('settingsExtended.operatorResponsibilitiesAckLabel')}
              </span>
              {ackedDate ? (
                <p className="text-xs text-muted-foreground">
                  {t('settingsExtended.operatorResponsibilitiesAckedAt', {
                    date: ackedDate,
                  })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('settingsExtended.operatorResponsibilitiesUnacked')}
                </p>
              )}
            </div>
          </label>
        </Card>
      </SettingsSection>
    </div>
  );
}
