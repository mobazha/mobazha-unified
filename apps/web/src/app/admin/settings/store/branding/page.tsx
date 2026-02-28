'use client';

import React, { useState, useCallback } from 'react';
import type { StoreConfig, StoreTheme, StoreSection } from '@mobazha/core';
import { useStorefrontConfig } from '@mobazha/core';
import { DEFAULT_STORE_CONFIG } from '@/components/store-sections';
import { ThemeEditor, SectionList, PresetPicker } from '@/components/admin/store-branding';
import { Save, Eye, Undo2, Loader2 } from 'lucide-react';

export default function BrandingPage() {
  const { config: serverConfig, isLoading, isSaving, error, save } = useStorefrontConfig();
  const [localConfig, setLocalConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'theme' | 'sections' | 'presets'>('theme');
  const [prevServer, setPrevServer] = useState(serverConfig);

  if (serverConfig && serverConfig !== prevServer) {
    setPrevServer(serverConfig);
    setLocalConfig(serverConfig);
    setHasChanges(false);
  }

  const updateTheme = useCallback((theme: StoreTheme) => {
    setLocalConfig(prev => ({ ...prev, theme }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const updateSections = useCallback((sections: StoreSection[]) => {
    setLocalConfig(prev => ({ ...prev, sections }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const applyPreset = useCallback((preset: StoreConfig) => {
    setLocalConfig(preset);
    setHasChanges(true);
    setSaveSuccess(false);
    setActiveTab('theme');
  }, []);

  const handleSave = useCallback(
    async (status: 'draft' | 'published') => {
      try {
        await save({ ...localConfig, status });
        setHasChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch {
        // error is surfaced via the hook's error state
      }
    },
    [save, localConfig]
  );

  const handleRevert = useCallback(() => {
    if (serverConfig) {
      setLocalConfig(serverConfig);
      setHasChanges(false);
    }
  }, [serverConfig]);

  if (isLoading && !serverConfig) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Store Branding</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your store appearance and layout
          </p>
        </div>
        <StatusBadge status={localConfig.status} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {/* Success */}
      {saveSuccess && (
        <div className="mb-4 p-3 text-sm text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 rounded-md">
          Changes saved successfully
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-border mb-6">
        {(['theme', 'sections', 'presets'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'theme' ? 'Theme' : tab === 'sections' ? 'Sections' : 'Presets'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'theme' && <ThemeEditor theme={localConfig.theme} onChange={updateTheme} />}
        {activeTab === 'sections' && (
          <SectionList sections={localConfig.sections} onChange={updateSections} />
        )}
        {activeTab === 'presets' && <PresetPicker onSelect={applyPreset} />}
      </div>

      {/* Action Bar */}
      <div className="sticky bottom-0 bg-background border-t border-border -mx-4 px-4 py-3 mt-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              type="button"
              onClick={handleRevert}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              Revert
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-input rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Eye className="w-4 h-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
        status === 'published'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
      }`}
    >
      {status === 'published' ? 'Published' : 'Draft'}
    </span>
  );
}
