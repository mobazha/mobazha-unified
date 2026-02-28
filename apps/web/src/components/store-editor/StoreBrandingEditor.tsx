'use client';

/**
 * StoreBrandingEditor — PG-201 Phase 4
 *
 * Main admin editor for store branding. Left panel has theme controls
 * and section list; right panel shows a live inline preview.
 * Responsive: stacked on mobile, side-by-side on md+.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useI18n, useStorefrontConfig } from '@mobazha/core';
import type { StoreConfig, StoreTheme, StoreSection, SectionType } from '@mobazha/core';
import { ChevronLeft, Loader2, Undo2, Monitor, Tablet, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  DEFAULT_STORE_CONFIG,
  STORE_PRESETS,
  StoreThemeProvider,
} from '@/components/store-sections';
import { SectionRenderer } from '@/components/store-sections/SectionRenderer';
import { ThemeEditor } from './ThemeEditor';
import { SectionListEditor } from './SectionListEditor';
import { PresetPicker } from './PresetPicker';
import { AddSectionPicker } from './AddSectionPicker';
import { createSection } from '@/components/store-sections';

type EditorTab = 'theme' | 'sections';
type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<PreviewViewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function StoreBrandingEditor() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { config: savedConfig, isLoading, isSaving, error, save } = useStorefrontConfig();

  const [draft, setDraft] = useState<StoreConfig | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('theme');
  const [showAddSection, setShowAddSection] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');

  const config = useMemo(() => {
    if (draft) return draft;
    if (savedConfig) return savedConfig;
    return DEFAULT_STORE_CONFIG;
  }, [draft, savedConfig]);

  const isDirty = draft !== null;

  const initDraft = useCallback(() => {
    if (!draft) {
      setDraft(deepClone(savedConfig || DEFAULT_STORE_CONFIG));
    }
  }, [draft, savedConfig]);

  const updateTheme = useCallback(
    (updates: Partial<StoreTheme>) => {
      initDraft();
      setDraft(prev => {
        const base = prev || deepClone(savedConfig || DEFAULT_STORE_CONFIG);
        return { ...base, theme: { ...base.theme, ...updates } };
      });
    },
    [initDraft, savedConfig]
  );

  const updateSections = useCallback(
    (sections: StoreSection[]) => {
      initDraft();
      setDraft(prev => {
        const base = prev || deepClone(savedConfig || DEFAULT_STORE_CONFIG);
        return { ...base, sections };
      });
    },
    [initDraft, savedConfig]
  );

  const addSection = useCallback(
    (type: SectionType) => {
      const section = createSection(type);
      updateSections([...config.sections, section]);
      setShowAddSection(false);
    },
    [config.sections, updateSections]
  );

  const removeSection = useCallback(
    (id: string) => {
      updateSections(config.sections.filter(s => s.id !== id));
    },
    [config.sections, updateSections]
  );

  const toggleSection = useCallback(
    (id: string) => {
      updateSections(
        config.sections.map(s =>
          s.id === id ? { ...s, visible: !s.visible } : s
        ) as StoreSection[]
      );
    },
    [config.sections, updateSections]
  );

  const moveSection = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newSections = [...config.sections];
      const [moved] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, moved);
      updateSections(newSections);
    },
    [config.sections, updateSections]
  );

  const updateSectionProps = useCallback(
    (id: string, props: Record<string, unknown>) => {
      updateSections(
        config.sections.map(s =>
          s.id === id ? { ...s, props: { ...s.props, ...props } } : s
        ) as StoreSection[]
      );
    },
    [config.sections, updateSections]
  );

  const applyPreset = useCallback((presetId: string) => {
    const preset = STORE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setDraft(deepClone(preset.config));
      setShowPresets(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    try {
      await save(draft);
      setDraft(null);
      toast({ title: t('admin.storeBranding.saveSuccess') });
    } catch {
      toast({
        title: t('admin.storeBranding.saveFailed'),
        variant: 'destructive',
      });
    }
  }, [draft, save, toast, t]);

  const handleDiscard = useCallback(() => {
    setDraft(null);
  }, []);

  if (isLoading && !savedConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="store-branding-editor">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings/store"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Link>
          <span className="text-sm font-medium">{t('admin.storeBranding.pageTitle')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPresets(true)}
            className="hidden sm:inline-flex"
          >
            {t('admin.storeBranding.useTemplate')}
          </Button>
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              <Undo2 className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{t('common.discard')}</span>
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {t('common.save')}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Main content: split panel (stacked on mobile, side-by-side on md+) */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: Editor Panel */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border bg-card overflow-y-auto shrink-0 max-h-[50vh] md:max-h-none">
          {/* Tab switcher */}
          <div className="flex border-b border-border sticky top-0 bg-card z-10">
            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === 'theme'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              🎨 {t('admin.storeBranding.tabTheme')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sections')}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === 'sections'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              📋 {t('admin.storeBranding.tabSections')}
            </button>
          </div>

          {/* Mobile-only: template button */}
          <div className="sm:hidden px-4 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowPresets(true)}
            >
              {t('admin.storeBranding.useTemplate')}
            </Button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'theme' && <ThemeEditor theme={config.theme} onUpdate={updateTheme} />}
            {activeTab === 'sections' && (
              <SectionListEditor
                sections={config.sections}
                onToggle={toggleSection}
                onRemove={removeSection}
                onMove={moveSection}
                onUpdateProps={updateSectionProps}
                onAddClick={() => setShowAddSection(true)}
              />
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 overflow-y-auto bg-muted/30 flex flex-col">
          {/* Viewport toolbar */}
          <div className="flex items-center justify-center gap-1 py-2 px-4 border-b border-border bg-card/50 shrink-0">
            {[
              { key: 'desktop' as const, icon: Monitor, label: 'Desktop' },
              { key: 'tablet' as const, icon: Tablet, label: 'Tablet' },
              { key: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewport(key)}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewport === key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-label={label}
                aria-pressed={viewport === key}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Preview container */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div
              className="mx-auto bg-background rounded-lg shadow-sm border border-border overflow-hidden transition-all duration-300"
              style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}
            >
              <StoreThemeProvider theme={config.theme}>
                <SectionRenderer sections={config.sections} peerId="preview" />
              </StoreThemeProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Modals (Dialog-based, with Escape + focus trap + overlay) */}
      <AddSectionPicker
        open={showAddSection}
        existingSections={config.sections}
        onAdd={addSection}
        onClose={() => setShowAddSection(false)}
      />

      <PresetPicker
        open={showPresets}
        onSelect={applyPreset}
        onClose={() => setShowPresets(false)}
      />
    </div>
  );
}
