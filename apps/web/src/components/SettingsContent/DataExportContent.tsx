'use client';

import React, { useState } from 'react';
import { Download, FileText, Package, Users, AlertCircle } from 'lucide-react';
import { exportsApi, useI18n, type ExportKind, type ExportFormat } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { SettingsSection } from '@/components/SettingsLayout';

// DG-1.10 — Seller data-portability page.
// Implements the "Your store, your data, your customers" product contract
// from DIGITAL_DELIVERY_DESIGN.md §2.4. Sellers can pull a CSV or JSON
// snapshot of their listings, sales history, and aggregated customer list
// at any time. No backend state is touched; each click triggers a fresh
// snapshot fetch over HTTPS.
//
// We intentionally do not paginate or stream in the UI: vendor stores in
// the Phase 1.x window cap out at hundreds of listings / thousands of
// orders, and a full-snapshot mental model is what sellers expect when
// migrating to or from another platform. If a future store grows past
// the comfortable buffer the backend handlers will be the place to add
// chunking, not the UI.

interface ExportCardConfig {
  kind: ExportKind;
  icon: React.ElementType;
  testId: string;
  // i18n keys (kept inline so the diff is easy to audit against the
  // English locale entries added in the same commit).
  titleKey: string;
  descriptionKey: string;
}

const EXPORTS: ExportCardConfig[] = [
  {
    kind: 'listings',
    icon: Package,
    testId: 'export-listings',
    titleKey: 'dataExport.listingsTitle',
    descriptionKey: 'dataExport.listingsDescription',
  },
  {
    kind: 'sales',
    icon: FileText,
    testId: 'export-sales',
    titleKey: 'dataExport.salesTitle',
    descriptionKey: 'dataExport.salesDescription',
  },
  {
    kind: 'customers',
    icon: Users,
    testId: 'export-customers',
    titleKey: 'dataExport.customersTitle',
    descriptionKey: 'dataExport.customersDescription',
  },
];

export function DataExportContent() {
  const { t } = useI18n();
  const { toast } = useToast();
  // Track per-card download state so two cards can be in-flight independently
  // without the buttons fighting each other for a shared spinner.
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const handleDownload = async (kind: ExportKind, format: ExportFormat) => {
    const key = `${kind}-${format}`;
    setBusy(prev => ({ ...prev, [key]: true }));
    try {
      const result = await exportsApi.downloadExport(kind, format);
      exportsApi.triggerBlobDownload(result);
      toast({
        variant: 'success',
        title: t('dataExport.toastSuccess', { kind: t(`dataExport.${kind}Title`) }),
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('dataExport.toastError'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div className="divide-y divide-border">
      <SettingsSection
        className="pb-5 md:pb-8"
        title={t('dataExport.pageTitle')}
        description={t('dataExport.pageDescription')}
      >
        <div className="grid gap-4">
          {EXPORTS.map(cfg => {
            const Icon = cfg.icon;
            const csvBusy = Boolean(busy[`${cfg.kind}-csv`]);
            const jsonBusy = Boolean(busy[`${cfg.kind}-json`]);
            return (
              <Card key={cfg.kind} className="p-4 md:p-6" data-testid={cfg.testId}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm md:text-base font-semibold text-foreground">
                        {t(cfg.titleKey)}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                        {t(cfg.descriptionKey)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(cfg.kind, 'csv')}
                      disabled={csvBusy}
                      data-testid={`${cfg.testId}-csv`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {csvBusy ? t('dataExport.downloading') : t('dataExport.csvButton')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(cfg.kind, 'json')}
                      disabled={jsonBusy}
                      data-testid={`${cfg.testId}-json`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {jsonBusy ? t('dataExport.downloading') : t('dataExport.jsonButton')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection className="pt-5 md:pt-8" title="">
        <Card className="p-4 md:p-6 border-primary/20 bg-primary/5">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-foreground space-y-1">
              <p className="font-medium">{t('dataExport.noteTitle')}</p>
              <p className="text-muted-foreground">{t('dataExport.noteBody')}</p>
            </div>
          </div>
        </Card>
      </SettingsSection>
    </div>
  );
}
