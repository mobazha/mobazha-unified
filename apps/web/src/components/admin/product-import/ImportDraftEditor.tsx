'use client';

import { useEffect, useRef, useState } from 'react';
import {
  formatProductImportDraftPrice,
  getCurrencySymbol,
  productImportMajorAmountInput,
  productImportMinorAmountFromInput,
  productImportDraftQuantity,
  productImportQuantityFromInput,
  shouldSyncProductImportDraftEditor,
  stripHtmlTags,
  updateProductImportProposalDraft,
  useCurrency,
  useI18n,
  type ProductImportDraft,
  type ProductImportMissingField,
  type ProductImportWorkbenchRow,
} from '@mobazha/core';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface ImportDraftEditorProps {
  row: ProductImportWorkbenchRow;
  missingFields: ProductImportMissingField[];
  onSaved: () => void;
  onAskAi?: () => void;
}

function draftDescriptionForEdit(raw?: string): string {
  if (!raw?.trim()) return '';
  if (/<[^>]+>/.test(raw)) return stripHtmlTags(raw).trim();
  return raw.trim();
}

export function ImportDraftEditor({
  row,
  missingFields,
  onSaved,
  onAskAi,
}: ImportDraftEditorProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { localCurrency } = useCurrency();
  const currencyCode = row.draft?.price?.currencyCode || localCurrency || 'USD';
  const currencySymbol = getCurrencySymbol(currencyCode);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(row.draft?.title || '');
  const [description, setDescription] = useState(() =>
    draftDescriptionForEdit(row.draft?.description)
  );
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [priceMajor, setPriceMajor] = useState(() => {
    const minor = row.draft?.price?.amountMinor;
    const div = row.draft?.price?.divisibility ?? 2;
    return productImportMajorAmountInput(minor, div);
  });
  const [quantity, setQuantity] = useState(() => {
    const qty = row.draft?.inventory?.quantity;
    return qty != null ? String(qty) : '';
  });
  const activeProposalIdRef = useRef(row.proposalArtifactId);
  const editBaseUpdatedAtRef = useRef(row.updatedAt);
  const draftDirtyRef = useRef(false);

  useEffect(() => {
    if (
      !shouldSyncProductImportDraftEditor(
        activeProposalIdRef.current,
        row.proposalArtifactId,
        draftDirtyRef.current
      )
    ) {
      return;
    }

    activeProposalIdRef.current = row.proposalArtifactId;
    editBaseUpdatedAtRef.current = row.updatedAt;
    draftDirtyRef.current = false;
    setTitle(row.draft?.title || '');
    setDescription(draftDescriptionForEdit(row.draft?.description));
    setDescriptionDirty(false);
    const minor = row.draft?.price?.amountMinor;
    const div = row.draft?.price?.divisibility ?? 2;
    setPriceMajor(productImportMajorAmountInput(minor, div));
    const qty = row.draft?.inventory?.quantity;
    setQuantity(qty != null ? String(qty) : '');
  }, [row.proposalArtifactId, row.updatedAt]);

  const markDraftDirty = () => {
    draftDirtyRef.current = true;
  };

  const handleSave = async () => {
    const divisibility = row.draft?.price?.divisibility ?? 2;
    const parsedPrice = priceMajor.trim()
      ? productImportMinorAmountFromInput(priceMajor, divisibility)
      : undefined;
    const parsedQty = quantity.trim() ? productImportQuantityFromInput(quantity) : undefined;
    if (priceMajor.trim() && parsedPrice == null) {
      toast({
        title: t('common.error'),
        description: t('admin.productImport.workbench.invalidPrice'),
        variant: 'destructive',
      });
      return;
    }
    if (quantity.trim() && parsedQty == null) {
      toast({
        title: t('common.error'),
        description: t('admin.productImport.workbench.invalidQuantity'),
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const expectedUpdatedAt = editBaseUpdatedAtRef.current;
      if (!expectedUpdatedAt) {
        throw new Error(t('admin.productImport.workbench.missingDraftVersion'));
      }
      const currencyCodeToSave = row.draft?.price?.currencyCode || localCurrency || 'USD';

      const draftPatch: Partial<ProductImportDraft> = {
        title: title.trim(),
        price:
          parsedPrice != null
            ? {
                amountMinor: parsedPrice,
                currencyCode: currencyCodeToSave,
                divisibility,
              }
            : undefined,
        inventory: parsedQty != null ? { quantity: parsedQty } : undefined,
      };
      if (descriptionDirty) {
        draftPatch.description = description.trim();
      }

      const updatedArtifact = await updateProductImportProposalDraft(
        row.proposalArtifactId,
        draftPatch,
        expectedUpdatedAt
      );
      editBaseUpdatedAtRef.current = updatedArtifact.updatedAt;
      draftDirtyRef.current = false;
      setDescriptionDirty(false);

      toast({
        title: t('common.success'),
        description: t('admin.productImport.workbench.saveDraftSuccess'),
        variant: 'success',
      });
      onSaved();
    } catch (err) {
      toast({
        title: t('common.error'),
        description:
          err instanceof Error ? err.message : t('admin.productImport.workbench.saveDraftFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const priceMissing = missingFields.includes('price');
  const quantityMissing = missingFields.includes('quantity');
  const titleMissing = missingFields.includes('title');

  const pricePlaceholder = priceMissing
    ? t('admin.productImport.workbench.fieldPlaceholderPrice')
    : formatProductImportDraftPrice(row.draft);
  const quantityPlaceholder = quantityMissing
    ? t('admin.productImport.workbench.fieldPlaceholderQty')
    : productImportDraftQuantity(row.draft);

  return (
    <div className="space-y-3" data-testid={`import-draft-editor-${row.proposalArtifactId}`}>
      <div>
        <h3 className="text-sm font-medium text-foreground">
          {t('admin.productImport.workbench.fixDetailsTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.productImport.workbench.fixDetailsHint')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t('admin.productImport.workbench.colTitle')}
            {titleMissing ? (
              <span className="ml-1.5 text-xs font-normal text-warning">
                ({t('admin.productImport.workbench.fieldRequired')})
              </span>
            ) : null}
          </span>
          <Input
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              markDraftDirty();
            }}
            className={cn(titleMissing && 'border-warning/60')}
            data-testid="import-draft-title"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-muted-foreground">
            {t('admin.productImport.workbench.colPrice')}
            <span className="font-normal"> ({currencyCode})</span>
            {priceMissing ? (
              <span className="ml-1.5 text-xs font-normal text-warning">
                ({t('admin.productImport.workbench.fieldRequired')})
              </span>
            ) : null}
          </span>
          <div
            className={cn(
              'flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring',
              priceMissing && 'border-warning/60'
            )}
          >
            <span className="shrink-0 pl-3 text-sm text-muted-foreground select-none" aria-hidden>
              {currencySymbol}
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={priceMajor}
              onChange={e => {
                setPriceMajor(e.target.value);
                markDraftDirty();
              }}
              placeholder={pricePlaceholder}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              data-testid="import-draft-price"
            />
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-muted-foreground">
            {t('admin.productImport.workbench.colQty')}
            {quantityMissing ? (
              <span className="ml-1.5 text-xs font-normal text-warning">
                ({t('admin.productImport.workbench.fieldRequired')})
              </span>
            ) : null}
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={quantity}
            onChange={e => {
              setQuantity(e.target.value);
              markDraftDirty();
            }}
            placeholder={quantityPlaceholder}
            className={cn(quantityMissing && 'border-warning/60')}
            data-testid="import-draft-quantity"
          />
        </label>

        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t('admin.productImport.workbench.descriptionLabel')}
          </span>
          <textarea
            value={description}
            onChange={e => {
              setDescription(e.target.value);
              setDescriptionDirty(true);
              markDraftDirty();
            }}
            rows={3}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="import-draft-description"
          />
        </label>
      </div>

      <div className="sticky bottom-20 z-20 -mx-4 flex gap-2 border-t border-border bg-muted/20 px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <Button
          type="button"
          size="sm"
          className="min-h-10 flex-1 sm:flex-none"
          disabled={saving}
          onClick={() => void handleSave()}
          data-testid="import-draft-save"
        >
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {t('admin.productImport.workbench.saveDraft')}
        </Button>
        {onAskAi && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-10 flex-1 sm:flex-none"
            onClick={onAskAi}
          >
            {t('admin.productImport.workbench.fixWithAi')}
          </Button>
        )}
      </div>
    </div>
  );
}
