'use client';

/**
 * StorefrontForm — shared controlled form for create + edit flows.
 *
 * Keeps wire shape in lockstep with `@mobazha/core`'s `storefrontsLite` types.
 * Parent owns the submit handler and decides whether to mount this for
 * create (editable ID, no archive button) or edit (locked ID, archive
 * button via the `onArchive` slot).
 */

import React, { useMemo, useState } from 'react';
import { useI18n } from '@mobazha/core';
import type {
  Storefront,
  StorefrontAccessRule,
  StorefrontAccessRuleType,
  StorefrontCreateRequest,
  StorefrontFilter,
  StorefrontPriceRule,
  StorefrontPriceRuleType,
  StorefrontTheme,
  StorefrontUpdateRequest,
  StorefrontVisibility,
} from '@mobazha/core';
import { DEFAULT_STOREFRONT_ID } from '@mobazha/core';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';

// kebab-case with lowercase letters + digits + hyphens. Mirrors the
// server-side constraint so we fail-fast before the network.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export type StorefrontFormMode = 'create' | 'edit';

export interface StorefrontFormProps {
  mode: StorefrontFormMode;
  /** Pre-filled value for edit mode. */
  initial?: Storefront;
  /** Loading flag for the submit button. */
  submitting?: boolean;
  onCancel: () => void;
  onSubmitCreate?: (payload: StorefrontCreateRequest) => void | Promise<void>;
  onSubmitUpdate?: (patch: StorefrontUpdateRequest) => void | Promise<void>;
  /** Rendered in the header for edit mode — typically an Archive button. */
  headerExtras?: React.ReactNode;
}

interface FormState {
  id: string;
  name: string;
  slug: string;
  visibility: StorefrontVisibility;
  themeBase: string;
  filterTags: string;
  filterExcludeTags: string;
  filterCollections: string;
  priceRuleType: StorefrontPriceRuleType | '';
  priceRuleValuePct: string;
  priceRuleAmountMinor: string;
  accessRuleType: StorefrontAccessRuleType;
  accessRuleTags: string;
}

function csvToArray(input: string): string[] {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function arrayToCsv(input?: string[]): string {
  return input && input.length > 0 ? input.join(', ') : '';
}

function makeInitialState(initial?: Storefront): FormState {
  return {
    id: initial?.id && initial.id !== DEFAULT_STOREFRONT_ID ? initial.id : '',
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    visibility: initial?.visibility ?? 'public',
    themeBase: initial?.theme?.base ?? '',
    filterTags: arrayToCsv(initial?.filter?.tags),
    filterExcludeTags: arrayToCsv(initial?.filter?.exclude_tags),
    filterCollections: arrayToCsv(initial?.filter?.collection_ids),
    priceRuleType: initial?.price_rule?.type ?? '',
    priceRuleValuePct:
      initial?.price_rule?.value_pct != null ? String(initial.price_rule.value_pct) : '',
    priceRuleAmountMinor:
      initial?.price_rule?.amount_minor != null ? String(initial.price_rule.amount_minor) : '',
    accessRuleType: initial?.access_rule?.type ?? 'public',
    accessRuleTags: arrayToCsv(initial?.access_rule?.required_tags),
  };
}

export function StorefrontForm({
  mode,
  initial,
  submitting = false,
  onCancel,
  onSubmitCreate,
  onSubmitUpdate,
  headerExtras,
}: StorefrontFormProps) {
  const { t } = useI18n();
  const [state, setState] = useState<FormState>(() => makeInitialState(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const filterHasValue = useMemo(
    () =>
      state.filterTags.trim() !== '' ||
      state.filterExcludeTags.trim() !== '' ||
      state.filterCollections.trim() !== '',
    [state.filterTags, state.filterExcludeTags, state.filterCollections]
  );

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (mode === 'create') {
      const trimmedID = state.id.trim();
      if (!trimmedID) {
        next.id = t('admin.storefronts.idRequired');
      } else if (trimmedID === DEFAULT_STOREFRONT_ID) {
        next.id = t('admin.storefronts.idReserved');
      } else if (!SLUG_RE.test(trimmedID)) {
        next.id = t('admin.storefronts.idInvalid');
      }
    }
    if (!state.name.trim()) {
      next.name = t('admin.storefronts.nameRequired');
    }
    const trimmedSlug = state.slug.trim();
    if (trimmedSlug && !SLUG_RE.test(trimmedSlug)) {
      next.slug = t('admin.storefronts.slugInvalid');
    }
    if (state.priceRuleType === 'flat_discount' || state.priceRuleType === 'flat_markup') {
      const n = Number(state.priceRuleValuePct);
      if (!state.priceRuleValuePct || Number.isNaN(n) || n <= 0) {
        next.priceRuleValuePct = t('admin.storefronts.priceRuleValueRequired');
      }
    }
    if (state.priceRuleType === 'fixed_surcharge') {
      const n = Number(state.priceRuleAmountMinor);
      if (!state.priceRuleAmountMinor || Number.isNaN(n) || n <= 0) {
        next.priceRuleAmountMinor = t('admin.storefronts.priceRuleValueRequired');
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildFilter = (): StorefrontFilter | undefined => {
    if (!filterHasValue) return undefined;
    const filter: StorefrontFilter = {};
    const tags = csvToArray(state.filterTags);
    if (tags.length > 0) filter.tags = tags;
    const exclude = csvToArray(state.filterExcludeTags);
    if (exclude.length > 0) filter.exclude_tags = exclude;
    const collections = csvToArray(state.filterCollections);
    if (collections.length > 0) filter.collection_ids = collections;
    return Object.keys(filter).length > 0 ? filter : undefined;
  };

  const buildPriceRule = (): StorefrontPriceRule | undefined => {
    if (!state.priceRuleType) return undefined;
    if (state.priceRuleType === 'fixed_surcharge') {
      return {
        type: 'fixed_surcharge',
        amount_minor: Math.round(Number(state.priceRuleAmountMinor)),
      };
    }
    return {
      type: state.priceRuleType,
      value_pct: Number(state.priceRuleValuePct),
    };
  };

  const buildAccessRule = (): StorefrontAccessRule | undefined => {
    if (state.accessRuleType === 'public') return undefined;
    const tags = csvToArray(state.accessRuleTags);
    return {
      type: 'access_list',
      required_tags: tags.length > 0 ? tags : undefined,
    };
  };

  const buildTheme = (): StorefrontTheme | undefined => {
    const base = state.themeBase.trim();
    if (!base && !initial?.theme) return undefined;
    if (!base) return undefined;
    return { base };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const filter = buildFilter();
    const priceRule = buildPriceRule();
    const accessRule = buildAccessRule();
    const theme = buildTheme();
    const slug = state.slug.trim() || undefined;

    if (mode === 'create') {
      const payload: StorefrontCreateRequest = {
        id: state.id.trim(),
        name: state.name.trim(),
        slug,
        visibility: state.visibility,
        filter,
        price_rule: priceRule,
        access_rule: accessRule,
        theme,
      };
      await onSubmitCreate?.(payload);
      return;
    }

    // edit mode: build partial update with *_clear flags where appropriate.
    const patch: StorefrontUpdateRequest = {
      name: state.name.trim(),
      slug: slug ?? '',
      visibility: state.visibility,
    };
    if (filter) patch.filter = filter;
    else if (initial?.filter) patch.filter_clear = true;
    if (priceRule) patch.price_rule = priceRule;
    else if (initial?.price_rule) patch.price_rule_clear = true;
    if (accessRule) patch.access_rule = accessRule;
    else if (initial?.access_rule) patch.access_rule_clear = true;
    if (theme) patch.theme = theme;
    else if (initial?.theme?.base) patch.theme_clear = true;

    await onSubmitUpdate?.(patch);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" data-testid="storefront-form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {mode === 'create'
                ? t('admin.storefronts.createTitle')
                : t('admin.storefronts.editTitle')}
            </h1>
            {mode === 'edit' && initial?.id && (
              <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{initial.id}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">{headerExtras}</div>
      </div>

      {/* Basics */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('admin.storefronts.sectionBasics')}
        </h2>

        {mode === 'create' && (
          <div className="space-y-1.5">
            <Label htmlFor="sf-id">{t('admin.storefronts.idLabel')}</Label>
            <Input
              id="sf-id"
              data-testid="sf-id-input"
              value={state.id}
              onChange={e => updateField('id', e.target.value)}
              placeholder={t('admin.storefronts.idPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              required
            />
            <p className="text-xs text-muted-foreground">{t('admin.storefronts.idHint')}</p>
            {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="sf-name">{t('admin.storefronts.nameLabel')}</Label>
          <Input
            id="sf-name"
            data-testid="sf-name-input"
            value={state.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder={t('admin.storefronts.namePlaceholder')}
            required
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sf-slug">{t('admin.storefronts.slugLabel')}</Label>
          <Input
            id="sf-slug"
            data-testid="sf-slug-input"
            value={state.slug}
            onChange={e => updateField('slug', e.target.value)}
            placeholder={t('admin.storefronts.slugPlaceholder')}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">{t('admin.storefronts.slugHint')}</p>
          {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>{t('admin.storefronts.visibilityLabel')}</Label>
          <Select
            value={state.visibility}
            onValueChange={v => updateField('visibility', v as StorefrontVisibility)}
          >
            <SelectTrigger data-testid="sf-visibility-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{t('admin.storefronts.visibilityPublic')}</SelectItem>
              <SelectItem value="unlisted">{t('admin.storefronts.visibilityUnlisted')}</SelectItem>
              <SelectItem value="private">{t('admin.storefronts.visibilityPrivate')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {state.visibility === 'public' && t('admin.storefronts.visibilityPublicHint')}
            {state.visibility === 'unlisted' && t('admin.storefronts.visibilityUnlistedHint')}
            {state.visibility === 'private' && t('admin.storefronts.visibilityPrivateHint')}
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('admin.storefronts.sectionFilter')}
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="sf-tags">{t('admin.storefronts.filterTagsLabel')}</Label>
          <Input
            id="sf-tags"
            value={state.filterTags}
            onChange={e => updateField('filterTags', e.target.value)}
            placeholder="vip, summer-2026"
          />
          <p className="text-xs text-muted-foreground">{t('admin.storefronts.filterTagsHint')}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sf-exclude-tags">{t('admin.storefronts.filterExcludeTagsLabel')}</Label>
          <Input
            id="sf-exclude-tags"
            value={state.filterExcludeTags}
            onChange={e => updateField('filterExcludeTags', e.target.value)}
            placeholder="clearance"
          />
          <p className="text-xs text-muted-foreground">
            {t('admin.storefronts.filterExcludeTagsHint')}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sf-collections">{t('admin.storefronts.filterCollectionsLabel')}</Label>
          <Textarea
            id="sf-collections"
            value={state.filterCollections}
            onChange={e => updateField('filterCollections', e.target.value)}
            placeholder="collection-id-1, collection-id-2"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            {t('admin.storefronts.filterCollectionsHint')}
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('admin.storefronts.sectionPricing')}
        </h2>

        <div className="space-y-1.5">
          <Label>{t('admin.storefronts.priceRuleTypeLabel')}</Label>
          <Select
            value={state.priceRuleType === '' ? 'none' : state.priceRuleType}
            onValueChange={v =>
              updateField('priceRuleType', v === 'none' ? '' : (v as StorefrontPriceRuleType))
            }
          >
            <SelectTrigger data-testid="sf-price-rule-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('admin.storefronts.priceRuleTypeNone')}</SelectItem>
              <SelectItem value="flat_discount">
                {t('admin.storefronts.priceRuleTypeDiscount')}
              </SelectItem>
              <SelectItem value="flat_markup">
                {t('admin.storefronts.priceRuleTypeMarkup')}
              </SelectItem>
              <SelectItem value="fixed_surcharge">
                {t('admin.storefronts.priceRuleTypeSurcharge')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(state.priceRuleType === 'flat_discount' || state.priceRuleType === 'flat_markup') && (
          <div className="space-y-1.5">
            <Label htmlFor="sf-price-value">{t('admin.storefronts.priceRuleValuePctLabel')}</Label>
            <Input
              id="sf-price-value"
              type="number"
              min={0}
              max={100}
              step={1}
              value={state.priceRuleValuePct}
              onChange={e => updateField('priceRuleValuePct', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.storefronts.priceRuleValuePctHint')}
            </p>
            {errors.priceRuleValuePct && (
              <p className="text-xs text-destructive">{errors.priceRuleValuePct}</p>
            )}
          </div>
        )}

        {state.priceRuleType === 'fixed_surcharge' && (
          <div className="space-y-1.5">
            <Label htmlFor="sf-price-amount">{t('admin.storefronts.priceRuleAmountLabel')}</Label>
            <Input
              id="sf-price-amount"
              type="number"
              min={0}
              step={1}
              value={state.priceRuleAmountMinor}
              onChange={e => updateField('priceRuleAmountMinor', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.storefronts.priceRuleAmountHint')}
            </p>
            {errors.priceRuleAmountMinor && (
              <p className="text-xs text-destructive">{errors.priceRuleAmountMinor}</p>
            )}
          </div>
        )}
      </section>

      {/* Theme */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('admin.storefronts.sectionTheme')}
        </h2>

        <div className="space-y-1.5">
          <Label>{t('admin.storefronts.themeBaseLabel')}</Label>
          <Select
            value={state.themeBase === '' ? 'none' : state.themeBase}
            onValueChange={v => updateField('themeBase', v === 'none' ? '' : v)}
          >
            <SelectTrigger data-testid="sf-theme-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('admin.storefronts.themeBaseNone')}</SelectItem>
              <SelectItem value="minimal">{t('admin.storefronts.themeBaseMinimal')}</SelectItem>
              <SelectItem value="grid-v2">{t('admin.storefronts.themeBaseGridV2')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('admin.storefronts.themeBaseHint')}</p>
        </div>
      </section>

      {/* Access */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('admin.storefronts.sectionAccess')}
        </h2>

        <div className="space-y-1.5">
          <Label>{t('admin.storefronts.accessRuleTypeLabel')}</Label>
          <Select
            value={state.accessRuleType}
            onValueChange={v => updateField('accessRuleType', v as StorefrontAccessRuleType)}
          >
            <SelectTrigger data-testid="sf-access-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{t('admin.storefronts.accessRuleTypePublic')}</SelectItem>
              <SelectItem value="access_list">
                {t('admin.storefronts.accessRuleTypeList')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {state.accessRuleType === 'access_list' && (
          <div className="space-y-1.5">
            <Label htmlFor="sf-access-tags">{t('admin.storefronts.accessRuleTagsLabel')}</Label>
            <Input
              id="sf-access-tags"
              value={state.accessRuleTags}
              onChange={e => updateField('accessRuleTags', e.target.value)}
              placeholder="vip, partner"
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.storefronts.accessRuleTagsHint')}
            </p>
          </div>
        )}
      </section>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submitting} data-testid="sf-submit-btn">
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitting ? t('admin.storefronts.saving') : t('admin.storefronts.save')}
        </Button>
      </div>
    </form>
  );
}

export default StorefrontForm;
