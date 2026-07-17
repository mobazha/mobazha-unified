'use client';

/**
 * StoreBrandingEditor — PG-201 Phase 4
 *
 * Main admin editor for store branding. Left panel has theme controls
 * and section list; right panel shows a live inline preview.
 * Responsive: stacked on mobile, side-by-side on md+.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useI18n, useStorefrontConfig, useUserStore } from '@mobazha/core';
import type { StoreConfig, StoreTheme, StoreSection, SectionType } from '@mobazha/core';
import {
  ChevronLeft,
  History,
  Loader2,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Share2,
  Sparkles,
  RotateCcw,
  Maximize2,
  X,
} from 'lucide-react';
import Link from 'next/link';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  DEFAULT_STORE_CONFIG,
  STORE_PRESETS,
  StoreThemeProvider,
} from '@/components/store-sections';
import { EditableSectionRenderer } from './EditableSectionRenderer';
import { useBrokenReferences } from './useBrokenReferences';
import { SharePreviewDialog } from './SharePreviewDialog';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import { ThemeEditor } from './ThemeEditor';
import { SectionListEditor } from './SectionListEditor';
import { PresetPicker } from './PresetPicker';
import { AddSectionPicker } from './AddSectionPicker';
import { AIStoreBuilderDialog } from './AIStoreBuilderDialog';
import { FullscreenPreview } from './FullscreenPreview';
import { createSection } from '@/components/store-sections';

type EditorTab = 'theme' | 'sections';
type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<PreviewViewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const VIEWPORT_OPTIONS: {
  key: PreviewViewport;
  icon: typeof Monitor;
  labelKey: string;
}[] = [
  { key: 'desktop', icon: Monitor, labelKey: 'admin.storeBranding.viewportDesktop' },
  { key: 'tablet', icon: Tablet, labelKey: 'admin.storeBranding.viewportTablet' },
  { key: 'mobile', icon: Smartphone, labelKey: 'admin.storeBranding.viewportMobile' },
];

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

type TFn = ReturnType<typeof useI18n>['t'];

const SECTION_TITLE_KEYS: Record<string, string> = {
  hero: 'admin.storeBranding.defaultHeroTitle',
  'featured-products': 'admin.storeBranding.defaultFeaturedTitle',
  'product-grid': 'admin.storeBranding.defaultProductGridTitle',
  about: 'admin.storeBranding.defaultAboutTitle',
  testimonials: 'admin.storeBranding.defaultTestimonialsTitle',
  faq: 'admin.storeBranding.defaultFaqTitle',
  collections: 'admin.storeBranding.defaultCollectionsTitle',
  contact: 'admin.storeBranding.defaultContactTitle',
};

/**
 * Replaces generic section titles/subtitles with locale-aware defaults.
 * Mutates `config.sections` in place — callers must pass a deep-cloned config.
 */
function localizePresetConfig(config: StoreConfig, t: TFn): StoreConfig {
  for (const section of config.sections) {
    const props = section.props as unknown as Record<string, unknown>;
    const titleKey = SECTION_TITLE_KEYS[section.type];
    if (titleKey && typeof props.title === 'string') {
      props.title = t(titleKey as Parameters<TFn>[0]);
    }
    if (section.type === 'hero' && typeof props.subtitle === 'string') {
      props.subtitle = t('admin.storeBranding.defaultHeroSubtitle');
    }
  }
  return config;
}

/**
 * Plain-language diff of what publishing would change for buyers. Publishing is
 * the one irreversible step in the editor, so the seller sees this before it
 * happens rather than a toast after.
 */
function summarizeChanges(from: StoreConfig | null | undefined, to: StoreConfig, t: TFn): string[] {
  if (!from) return [t('admin.storeBranding.changeFirstPublish')];

  const lines: string[] = [];
  if (JSON.stringify(from.theme) !== JSON.stringify(to.theme)) {
    lines.push(t('admin.storeBranding.changeTheme'));
  }

  const fromById = new Map(from.sections.map(s => [s.id, s]));
  const toById = new Map(to.sections.map(s => [s.id, s]));

  const added = to.sections.filter(s => !fromById.has(s.id)).length;
  const removed = from.sections.filter(s => !toById.has(s.id)).length;
  const updated = to.sections.filter(s => {
    const before = fromById.get(s.id);
    return before && JSON.stringify(before) !== JSON.stringify(s);
  }).length;

  if (added) lines.push(t('admin.storeBranding.changeSectionsAdded', { count: added }));
  if (removed) lines.push(t('admin.storeBranding.changeSectionsRemoved', { count: removed }));
  if (updated) lines.push(t('admin.storeBranding.changeSectionsUpdated', { count: updated }));

  // Reordering is only meaningful among sections present on both sides.
  const commonOrder = (c: StoreConfig) =>
    c.sections.filter(s => fromById.has(s.id) && toById.has(s.id)).map(s => s.id);
  if (JSON.stringify(commonOrder(from)) !== JSON.stringify(commonOrder(to))) {
    lines.push(t('admin.storeBranding.changeSectionsReordered'));
  }

  return lines;
}

interface StoreBrandingEditorProps {
  backHref?: string;
}

export function StoreBrandingEditor({ backHref }: StoreBrandingEditorProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const {
    config: savedConfig,
    draft: serverDraft,
    isLoading,
    isSaving,
    error,
    saveDraft,
    publish,
    discardDraft,
  } = useStorefrontConfig();
  const { profile } = useUserStore();
  // Real store data in the preview (PG-203): sections fetch the owner's actual
  // products/collections. Falls back to placeholder mode until profile loads.
  const previewPeerID = profile?.peerID || 'preview';

  // Local edit state lives in ONE object so every transition is a single,
  // pure setState updater — StrictMode double-invocation and concurrent
  // rebasing replay them safely (nested setState inside updaters is not).
  const [editState, setEditState] = useState<{
    draft: StoreConfig | null;
    history: StoreConfig[];
    future: StoreConfig[];
  }>({ draft: null, history: [], future: [] });
  const { draft, history, future } = editState;
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('theme');
  const [showAddSection, setShowAddSection] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [aiCooldown, setAiCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const config = useMemo(() => {
    if (draft) return draft;
    if (serverDraft) return serverDraft;
    if (savedConfig) return savedConfig;
    return localizePresetConfig(deepClone(DEFAULT_STORE_CONFIG), t);
  }, [draft, serverDraft, savedConfig, t]);

  const isDirty = draft !== null;
  const hasServerDraft = !!serverDraft;

  /** Base config an edit starts from when there is no local draft yet. */
  const pristineConfig = useCallback((): StoreConfig => {
    const saved = serverDraft || savedConfig;
    const base = deepClone(saved || DEFAULT_STORE_CONFIG);
    return saved ? base : localizePresetConfig(base, t);
  }, [serverDraft, savedConfig, t]);

  const MAX_HISTORY = 50;

  /** Every edit flows through here so undo/redo sees a linear history. */
  const applyChange = useCallback(
    (produce: (base: StoreConfig) => StoreConfig) => {
      setEditState(prev => {
        const base = prev.draft || pristineConfig();
        return {
          draft: produce(deepClone(base)),
          history: [...prev.history.slice(-(MAX_HISTORY - 1)), deepClone(base)],
          future: [],
        };
      });
    },
    [pristineConfig]
  );

  const undo = useCallback(() => {
    setEditState(prev => {
      if (prev.history.length === 0) return prev;
      const snapshot = prev.history[prev.history.length - 1];
      return {
        // Bottom of the stack is the pristine base — undoing it clears the draft.
        draft: prev.history.length === 1 ? null : snapshot,
        history: prev.history.slice(0, -1),
        future: prev.draft ? [...prev.future, deepClone(prev.draft)] : prev.future,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setEditState(prev => {
      if (prev.future.length === 0) return prev;
      const snapshot = prev.future[prev.future.length - 1];
      return {
        draft: snapshot,
        history: [...prev.history, prev.draft ? deepClone(prev.draft) : pristineConfig()],
        future: prev.future.slice(0, -1),
      };
    });
  }, [pristineConfig]);

  // Cmd/Ctrl+Z to undo, Shift+Cmd/Ctrl+Z to redo — skipped while typing so
  // native text-field undo keeps working.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const updateTheme = useCallback(
    (updates: Partial<StoreTheme>) => {
      applyChange(base => ({ ...base, theme: { ...base.theme, ...updates } }));
    },
    [applyChange]
  );

  const updateSections = useCallback(
    (sections: StoreSection[]) => {
      applyChange(base => ({ ...base, sections }));
    },
    [applyChange]
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
      setSelectedSectionId(prev => (prev === id ? null : prev));
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

  const renameSection = useCallback(
    (id: string, name: string) => {
      updateSections(
        config.sections.map(s =>
          s.id === id ? { ...s, name: name || undefined } : s
        ) as StoreSection[]
      );
    },
    [config.sections, updateSections]
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = STORE_PRESETS.find(p => p.id === presetId);
      if (preset) {
        applyChange(() => localizePresetConfig(deepClone(preset.config), t));
        setShowPresets(false);
      }
    },
    [applyChange, t]
  );

  const handleAIApply = useCallback(
    (config: StoreConfig) => {
      applyChange(() => config);
      setShowAIBuilder(false);
      toast({ title: t('admin.storeBranding.aiGenerateSuccess') });
      setAiCooldown(true);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => setAiCooldown(false), 10_000);
    },
    [applyChange, toast, t]
  );

  const resetEditState = useCallback(() => {
    setEditState({ draft: null, history: [], future: [] });
  }, []);

  // ---------------------------------------------------------------------
  // Autosave (PG-203). Edits used to live only in memory until the seller
  // pressed "save draft" — closing the tab silently threw away the session.
  // Now the draft flows to the server a few seconds after the last edit.
  // Unlike manual save it must NOT reset the edit state: clearing it would
  // wipe the undo stack mid-session, turning a background convenience into
  // a destructive act.
  // ---------------------------------------------------------------------
  const draftJson = useMemo(() => (draft ? JSON.stringify(draft) : null), [draft]);
  const [lastSavedJson, setLastSavedJson] = useState<string | null>(null);
  const hasUnsavedEdits = draftJson !== null && draftJson !== lastSavedJson;
  const autoSaved = draftJson !== null && draftJson === lastSavedJson;

  useEffect(() => {
    if (!draftJson || draftJson === lastSavedJson) return;
    const timer = setTimeout(() => {
      // Autosave failures stay silent: the seller did not ask for this save,
      // and the next edit retries it. The beforeunload guard still has their
      // back because lastSavedJson only advances on success.
      saveDraft(JSON.parse(draftJson) as StoreConfig)
        .then(() => setLastSavedJson(draftJson))
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [draftJson, lastSavedJson, saveDraft]);

  useEffect(() => {
    if (!hasUnsavedEdits) return;
    const onBeforeUnload = (event: Event) => {
      event.preventDefault();
      // Required by Chrome for the confirmation dialog to appear.
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedEdits]);

  const handleSaveDraft = useCallback(async () => {
    if (!draft) return;
    try {
      await saveDraft(draft);
      resetEditState();
      setLastSavedJson(null);
      toast({ title: t('admin.storeBranding.draftSaved') });
    } catch {
      toast({
        title: t('admin.storeBranding.saveFailed'),
        variant: 'destructive',
      });
    }
  }, [draft, saveDraft, resetEditState, toast, t]);

  const pendingPublish = draft || serverDraft;

  /** What buyers will actually notice — shown before publishing, not after. */
  const publishSummary = useMemo(
    () => (pendingPublish ? summarizeChanges(savedConfig, pendingPublish, t) : []),
    [pendingPublish, savedConfig, t]
  );

  // Stale product/collection references surface in the publish dialog, where
  // the seller can still fix them — not as a buyer-visible hole afterwards.
  const { broken: brokenRefs } = useBrokenReferences(pendingPublish ?? null);

  const handlePublish = useCallback(async () => {
    if (!pendingPublish) return;
    try {
      await publish(pendingPublish);
      resetEditState();
      toast({ title: t('admin.storeBranding.publishSuccess') });
    } catch {
      toast({
        title: t('admin.storeBranding.saveFailed'),
        variant: 'destructive',
      });
    }
  }, [pendingPublish, publish, resetEditState, toast, t]);

  const handleDiscardDraft = useCallback(async () => {
    try {
      if (hasServerDraft) await discardDraft();
      resetEditState();
    } catch {
      toast({
        title: t('admin.storeBranding.saveFailed'),
        variant: 'destructive',
      });
    }
  }, [hasServerDraft, discardDraft, resetEditState, toast, t]);

  const handleDiscard = useCallback(() => {
    resetEditState();
  }, [resetEditState]);

  // Wiping the layout is an edit like any other: it lands in the draft, is
  // undoable, and only reaches buyers once the seller publishes. It used to
  // publish straight to the live store, which was the one hole in the
  // draft/publish model.
  const handleResetClassic = useCallback(() => {
    applyChange(() => ({ ...deepClone(DEFAULT_STORE_CONFIG), sections: [] }));
  }, [applyChange]);

  // Restoring an old revision is deliberately NOT a publish: it flows into
  // the local draft so the seller reviews it (and can undo) before buyers
  // see anything.
  const handleRestoreVersion = useCallback(
    (restored: StoreConfig) => {
      applyChange(() => deepClone(restored));
      setShowHistory(false);
      toast({ title: t('admin.storeBranding.versionRestored') });
    },
    [applyChange, toast, t]
  );

  const hasSavedConfig = !!savedConfig?.sections?.length;

  // Block editing until BOTH the live config and the draft slot have loaded:
  // editing against the live config while the server draft is still in flight
  // would silently shadow (and later overwrite) the stored draft.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 h-[calc(100dvh-10rem)] flex-col md:h-[calc(100dvh-6.5rem)]"
      data-testid="store-branding-editor"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </Link>
          )}
          <span className="text-sm font-medium">{t('admin.storeBranding.pageTitle')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t('admin.storeBranding.sharePreview')}
            title={t('admin.storeBranding.sharePreview')}
            data-testid="share-preview-open"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t('admin.storeBranding.versionHistory')}
            title={t('admin.storeBranding.versionHistory')}
            data-testid="version-history-open"
          >
            <History className="w-4 h-4" />
          </button>
          <div className="flex items-center border border-border rounded-md">
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              className="p-1.5 rounded-l-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label={t('admin.storeBranding.undo')}
              title={`${t('admin.storeBranding.undo')} (⌘Z)`}
              data-testid="editor-undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={future.length === 0}
              className="p-1.5 rounded-r-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label={t('admin.storeBranding.redo')}
              title={`${t('admin.storeBranding.redo')} (⇧⌘Z)`}
              data-testid="editor-redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          {(isDirty || hasServerDraft) && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {t('admin.storeBranding.draftBadge')}
            </span>
          )}
          {autoSaved && (
            <span
              className="hidden md:inline text-[11px] text-muted-foreground"
              data-testid="autosaved-indicator"
            >
              {t('admin.storeBranding.autoSaved')}
            </span>
          )}
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              <X className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{t('common.discard')}</span>
            </Button>
          )}
          {!isDirty && hasServerDraft && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  {t('admin.storeBranding.discardDraft')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('admin.storeBranding.discardDraftTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('admin.storeBranding.discardDraftMessage')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDiscardDraft}>
                    {t('admin.storeBranding.discardDraft')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={!isDirty || isSaving}
            data-testid="save-draft"
          >
            {t('admin.storeBranding.saveDraft')}
          </Button>
          {/* Publishing is the only step buyers feel immediately — confirm it,
              and say what actually changes. */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                disabled={(!isDirty && !hasServerDraft) || isSaving}
                data-testid="publish"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {t('admin.storeBranding.publish')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('admin.storeBranding.publishConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('admin.storeBranding.publishConfirmMessage')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ul
                className="text-sm text-foreground list-disc pl-5 space-y-1"
                data-testid="publish-summary"
              >
                {publishSummary.map(line => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {brokenRefs.length > 0 && (
                <div
                  className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 space-y-1"
                  data-testid="broken-references"
                  role="status"
                >
                  {brokenRefs.map(ref => (
                    <p
                      key={`${ref.sectionLabel}-${ref.kind}`}
                      className="text-xs leading-4 text-amber-800 dark:text-amber-300"
                    >
                      {t(
                        ref.kind === 'listing'
                          ? 'admin.storeBranding.brokenListingRefs'
                          : 'admin.storeBranding.brokenCollectionRefs',
                        { section: ref.sectionLabel, count: ref.missing.length }
                      )}
                    </p>
                  ))}
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handlePublish} data-testid="publish-confirm">
                  {t('admin.storeBranding.publishConfirmAction')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {error && (
        <div role="alert" className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Main content: split panel (stacked on mobile, side-by-side on md+) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left: Editor Panel */}
        <div
          ref={editorScrollRef}
          className="min-h-0 w-full shrink-0 max-h-[50vh] overflow-y-auto border-b border-border bg-card md:max-h-none md:w-80 md:border-r md:border-b-0 lg:w-96"
        >
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

          {/* "Where do I start" actions, not header actions: they belong next
              to the thing they rewrite, and the header was carrying nine. */}
          <div className="px-4 pt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => setShowAIBuilder(true)}
              disabled={aiCooldown}
              data-testid="ai-generate"
            >
              <Sparkles className="w-4 h-4" />
              {t('admin.storeBranding.aiGenerate')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowPresets(true)}
              data-testid="use-template"
            >
              {t('admin.storeBranding.useTemplate')}
            </Button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'theme' && <ThemeEditor theme={config.theme} onUpdate={updateTheme} />}
            {activeTab === 'sections' && (
              <>
                <SectionListEditor
                  sections={config.sections}
                  expandedId={selectedSectionId}
                  onExpandedChange={setSelectedSectionId}
                  onToggle={toggleSection}
                  onRemove={removeSection}
                  onMove={moveSection}
                  onUpdateProps={updateSectionProps}
                  onRename={renameSection}
                  onAddClick={() => setShowAddSection(true)}
                  scrollContainerRef={editorScrollRef}
                />
                {hasSavedConfig && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 w-full text-muted-foreground gap-1"
                        data-testid="reset-classic"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {t('admin.storeBranding.resetClassicLayout')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t('admin.storeBranding.resetClassicTitle')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.storeBranding.resetClassicMessage')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetClassic}>
                          {t('admin.storeBranding.resetClassicConfirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/30">
          {/* Viewport toolbar */}
          <div className="flex items-center gap-1 py-2 px-4 border-b border-border bg-card/50 shrink-0">
            <div className="flex-1" />
            {VIEWPORT_OPTIONS.map(({ key, icon: Icon, labelKey }) => {
              const label = t(labelKey as Parameters<TFn>[0]);
              return (
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
              );
            })}
            <div className="flex-1 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullscreen(true)}
                className="gap-1 text-muted-foreground"
                data-testid="fullscreen-preview-open"
              >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden lg:inline">
                  {t('admin.storeBranding.fullscreenPreview')}
                </span>
              </Button>
            </div>
          </div>

          {/* Preview container */}
          <div ref={previewScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-8">
            <div
              className="mx-auto bg-background rounded-lg shadow-sm border border-border overflow-hidden transition-all duration-300"
              style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}
            >
              <StoreThemeProvider theme={config.theme}>
                <EditableSectionRenderer
                  sections={config.sections}
                  peerId={previewPeerID}
                  selectedId={selectedSectionId}
                  scrollContainerRef={previewScrollRef}
                  onSelect={id => {
                    setSelectedSectionId(id);
                    setActiveTab('sections');
                  }}
                />
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
        currentSections={config.sections}
        onSelect={applyPreset}
        onClose={() => setShowPresets(false)}
      />

      <AIStoreBuilderDialog
        open={showAIBuilder}
        onApply={handleAIApply}
        onClose={() => setShowAIBuilder(false)}
      />

      <FullscreenPreview
        open={showFullscreen}
        config={config}
        peerId={previewPeerID}
        isDraft={isDirty || hasServerDraft}
        onClose={() => setShowFullscreen(false)}
      />

      <SharePreviewDialog
        open={showShare}
        peerID={profile?.peerID || null}
        onClose={() => setShowShare(false)}
      />

      <VersionHistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onRestore={handleRestoreVersion}
      />
    </div>
  );
}
