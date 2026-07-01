'use client';

import React, { useState, useMemo } from 'react';
import { useI18n } from '@mobazha/core';
import type { StoreSection } from '@mobazha/core';
import { STORE_PRESETS, type StorePreset } from '@/components/store-sections';
import { getSectionMeta } from '@/components/store-sections/registry';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Wireframe Preview — structural mini-layout per section type
// ---------------------------------------------------------------------------

function WireframeBlock({ type }: { type: string }) {
  switch (type) {
    case 'hero':
      return (
        <div className="h-8 rounded-sm bg-foreground/12 flex flex-col items-center justify-center gap-0.5 px-3">
          <div className="w-12 h-1 rounded-full bg-foreground/20" />
          <div className="w-8 h-0.5 rounded-full bg-foreground/12" />
        </div>
      );

    case 'announcement-bar':
      return (
        <div className="h-2.5 rounded-sm bg-foreground/8 flex items-center justify-center">
          <div className="w-16 h-0.5 rounded-full bg-foreground/15" />
        </div>
      );

    case 'featured-products':
      return (
        <div className="rounded-sm bg-foreground/4 p-1 space-y-0.5">
          <div className="w-8 h-0.5 rounded-full bg-foreground/15" />
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex-1 h-3 rounded-[1px] bg-foreground/10" />
            ))}
          </div>
        </div>
      );

    case 'product-grid':
      return (
        <div className="rounded-sm bg-foreground/4 p-1 space-y-0.5">
          <div className="flex gap-1 mb-0.5">
            <div className="w-6 h-0.5 rounded-full bg-foreground/12" />
            <div className="flex-1" />
            <div className="w-3 h-0.5 rounded-full bg-foreground/8" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-2 rounded-[1px] bg-foreground/8" />
            ))}
          </div>
        </div>
      );

    case 'trust-badges':
      return (
        <div className="h-3 rounded-sm bg-foreground/4 flex items-center justify-center gap-1.5 px-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/15" />
          ))}
        </div>
      );

    case 'about':
      return (
        <div className="rounded-sm bg-foreground/4 p-1 flex gap-1">
          <div className="flex-1 space-y-0.5">
            <div className="w-6 h-0.5 rounded-full bg-foreground/15" />
            <div className="w-full h-0.5 rounded-full bg-foreground/8" />
            <div className="w-10 h-0.5 rounded-full bg-foreground/8" />
          </div>
          <div className="w-5 h-4 rounded-[1px] bg-foreground/10 shrink-0" />
        </div>
      );

    case 'testimonials':
      return (
        <div className="rounded-sm bg-foreground/4 p-1 space-y-0.5">
          <div className="w-8 h-0.5 rounded-full bg-foreground/15" />
          <div className="flex gap-0.5">
            {[0, 1].map(i => (
              <div key={i} className="flex-1 h-2.5 rounded-[1px] bg-foreground/8 p-0.5">
                <div className="w-3 h-0.5 rounded-full bg-foreground/12" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'faq':
      return (
        <div className="rounded-sm bg-foreground/4 p-1 space-y-[2px]">
          <div className="w-6 h-0.5 rounded-full bg-foreground/15 mb-0.5" />
          {[0, 1, 2].map(i => (
            <div key={i} className="h-1 rounded-[1px] bg-foreground/8 flex items-center px-0.5">
              <div className="w-4 h-px bg-foreground/15" />
            </div>
          ))}
        </div>
      );

    case 'collections':
      return (
        <div className="rounded-sm bg-foreground/4 p-1 space-y-0.5">
          <div className="w-8 h-0.5 rounded-full bg-foreground/15" />
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="flex-1 h-3 rounded-[1px] bg-foreground/10 flex flex-col justify-end p-px"
              >
                <div className="w-3 h-0.5 rounded-full bg-foreground/15" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'gallery':
      return (
        <div className="rounded-sm bg-foreground/4 p-1">
          <div className="grid grid-cols-3 gap-0.5">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="aspect-square rounded-[1px] bg-foreground/10" />
            ))}
          </div>
        </div>
      );

    case 'contact':
      return (
        <div className="rounded-sm bg-foreground/4 p-1 space-y-0.5">
          <div className="w-6 h-0.5 rounded-full bg-foreground/15" />
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-foreground/10" />
            <div className="w-2 h-2 rounded-full bg-foreground/10" />
            <div className="w-2 h-2 rounded-full bg-foreground/10" />
          </div>
        </div>
      );

    case 'store-tabs':
      return (
        <div className="h-2.5 rounded-sm bg-foreground/4 flex items-center gap-1 px-1">
          <div className="w-4 h-0.5 rounded-full bg-foreground/18" />
          <div className="w-3 h-0.5 rounded-full bg-foreground/8" />
          <div className="w-3 h-0.5 rounded-full bg-foreground/8" />
        </div>
      );

    default:
      return <div className="h-3 rounded-sm bg-foreground/6" />;
  }
}

function WireframePreview({ sections }: { sections: StoreSection[] }) {
  return (
    <div className="w-full rounded border border-border/60 bg-background overflow-hidden flex flex-col gap-[2px] p-1.5">
      {sections.map(section => (
        <WireframeBlock key={section.id} type={section.type} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section summary chip list (for confirm dialog)
// ---------------------------------------------------------------------------

function SectionChips({
  sections,
  t,
}: {
  sections: StoreSection[];
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {sections.map(s => {
        const meta = getSectionMeta(s.type);
        const label = meta
          ? t(meta.labelKey as Parameters<typeof t>[0], { defaultValue: meta.label })
          : s.type;
        return (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground"
          >
            {meta?.icon} {label}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PresetPicker
// ---------------------------------------------------------------------------

interface PresetPickerProps {
  open: boolean;
  currentSections?: StoreSection[];
  onSelect: (presetId: string) => void;
  onClose: () => void;
}

export function PresetPicker({ open, currentSections, onSelect, onClose }: PresetPickerProps) {
  const { t } = useI18n();
  const [pendingPresetId, setPendingPresetId] = useState<string | null>(null);

  const pendingPreset = useMemo(
    () => (pendingPresetId ? STORE_PRESETS.find(p => p.id === pendingPresetId) : null),
    [pendingPresetId]
  );

  const handlePresetClick = (presetId: string) => {
    setPendingPresetId(presetId);
  };

  const handleConfirm = () => {
    if (pendingPresetId) {
      onSelect(pendingPresetId);
      setPendingPresetId(null);
    }
  };

  const handleCancelConfirm = () => {
    setPendingPresetId(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={v => {
          if (!v) onClose();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.storeBranding.chooseTemplate')}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STORE_PRESETS.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  t={t}
                  onClick={() => handlePresetClick(preset.id)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingPresetId}
        onOpenChange={v => {
          if (!v) handleCancelConfirm();
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.storeBranding.presetConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t('admin.storeBranding.presetConfirmMessage')}</p>

                {currentSections && currentSections.length > 0 && pendingPreset && (
                  <div className="flex items-start gap-2 text-xs">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-foreground">
                        {t('admin.storeBranding.presetCurrentSections')}
                      </p>
                      <SectionChips sections={currentSections} t={t} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-4" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-foreground">
                        {t('admin.storeBranding.presetNewSections')}
                      </p>
                      <SectionChips sections={pendingPreset.config.sections} t={t} />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirm}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t('admin.storeBranding.applyPreset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Preset Card — wireframe layout + name + description
// ---------------------------------------------------------------------------

function PresetCard({
  preset,
  t,
  onClick,
}: {
  preset: StorePreset;
  t: ReturnType<typeof useI18n>['t'];
  onClick: () => void;
}) {
  const { sections } = preset.config;
  const name = t(preset.nameKey as Parameters<typeof t>[0], { defaultValue: preset.name });
  const desc = t(preset.descriptionKey as Parameters<typeof t>[0], {
    defaultValue: preset.description,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:bg-primary/5 transition-all group"
    >
      <div className="p-2.5 pb-2">
        <WireframePreview sections={sections} />
      </div>
      <div className="px-3 pb-3">
        <h3 className="text-sm font-medium group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{desc}</p>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {t('admin.storeBranding.sectionCountLabel', {
            count: String(sections.length),
            font: preset.config.theme.fontFamily,
          })}
        </p>
      </div>
    </button>
  );
}
