'use client';

/**
 * ThemeEditor — PG-201 Phase 4
 *
 * Three-layer theme customization:
 * 1. Palette cards (8 presets)
 * 2. Font selector with live preview
 * 3. Border radius selector
 * 4. Custom color inputs (when palette = custom)
 *
 * Grouped into a single-open accordion (PG-203): flat, these three lists run
 * well past a screen, so reaching border radius meant scrolling past nine fonts
 * every time.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useI18n } from '@mobazha/core';
import type { StoreTheme, ThemePalette, FontFamily, BorderRadius } from '@mobazha/core';
import {
  PALETTE_MAP,
  ALL_PALETTES,
  FONT_FAMILY_MAP,
  isValidHexColor,
  getContrastRatio,
  WCAG_AA_NORMAL_TEXT,
} from '@mobazha/core';
import { Check, ChevronDown, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeEditorProps {
  theme: StoreTheme;
  onUpdate: (updates: Partial<StoreTheme>) => void;
}

const PALETTE_ICONS: Record<string, string> = {
  ocean: '🌊',
  forest: '🌲',
  sunset: '🌅',
  midnight: '🌙',
  minimal: '⬜',
  earth: '🏜️',
  lavender: '💜',
  rose: '🌹',
};

const PALETTE_I18N_KEYS: Record<string, string> = {
  ocean: 'paletteOcean',
  forest: 'paletteForest',
  sunset: 'paletteSunset',
  midnight: 'paletteMidnight',
  minimal: 'paletteMinimal',
  earth: 'paletteEarth',
  lavender: 'paletteLavender',
  rose: 'paletteRose',
};

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'inter', label: 'Inter' },
  { value: 'dm-sans', label: 'DM Sans' },
  { value: 'space-grotesk', label: 'Space Grotesk' },
  { value: 'playfair', label: 'Playfair Display' },
  { value: 'lora', label: 'Lora' },
  { value: 'merriweather', label: 'Merriweather' },
  { value: 'josefin-sans', label: 'Josefin Sans' },
  { value: 'poppins', label: 'Poppins' },
];

const RADIUS_OPTIONS: { value: BorderRadius; i18nKey: string; preview: string }[] = [
  { value: 'none', i18nKey: 'optSharp', preview: '0' },
  { value: 'sm', i18nKey: 'optSmall', preview: '4px' },
  { value: 'md', i18nKey: 'optMedium', preview: '8px' },
  { value: 'lg', i18nKey: 'optLarge', preview: '16px' },
  { value: 'full', i18nKey: 'optPill', preview: '9999px' },
];

type ThemeGroup = 'colors' | 'typography' | 'layout';

/** Role tokens the seller can opt into; absent = inherit the app theme. */
const ROLE_FIELDS = [
  { field: 'backgroundColor', labelKey: 'pageBackground', starter: '#ffffff' },
  { field: 'textColor', labelKey: 'bodyText', starter: '#111827' },
  { field: 'surfaceColor', labelKey: 'cardSurface', starter: '#f3f4f6' },
] as const;

/**
 * Contrast guard (PG-203): every pair here is text that actually lands on that
 * background somewhere in the sections. Warns, never blocks — a seller may
 * accept low contrast deliberately (e.g. a decorative hero), but should never
 * discover it from a buyer complaint.
 */
function useContrastWarnings(theme: StoreTheme, t: ReturnType<typeof useI18n>['t']): string[] {
  return useMemo(() => {
    const warnings: string[] = [];
    const pairs: Array<{ fgKey: string; fg?: string; bgKey: string; bg?: string }> = [
      {
        fgKey: 'roleBodyText',
        fg: theme.textColor,
        bgKey: 'rolePageBackground',
        bg: theme.backgroundColor,
      },
      {
        fgKey: 'rolePrimary',
        fg: theme.primaryColor,
        bgKey: 'rolePageBackground',
        bg: theme.backgroundColor,
      },
      {
        fgKey: 'roleBodyText',
        fg: theme.textColor,
        bgKey: 'roleCardSurface',
        bg: theme.surfaceColor,
      },
    ];
    for (const { fgKey, fg, bgKey, bg } of pairs) {
      if (!fg || !bg) continue;
      const ratio = getContrastRatio(fg, bg);
      if (ratio !== null && ratio < WCAG_AA_NORMAL_TEXT) {
        warnings.push(
          t('admin.storeBranding.contrastWarning', {
            fg: t(`admin.storeBranding.${fgKey}` as Parameters<typeof t>[0]),
            bg: t(`admin.storeBranding.${bgKey}` as Parameters<typeof t>[0]),
            ratio: ratio.toFixed(1),
          })
        );
      }
    }
    // A dark page background with no explicit text color inherits the app's
    // (usually near-black) text — flag it before a buyer does.
    if (theme.backgroundColor && !theme.textColor) {
      const ratio = getContrastRatio('#111827', theme.backgroundColor);
      if (ratio !== null && ratio < WCAG_AA_NORMAL_TEXT) {
        warnings.push(t('admin.storeBranding.contrastHintSetText'));
      }
    }
    return warnings;
  }, [theme.textColor, theme.backgroundColor, theme.primaryColor, theme.surfaceColor, t]);
}

export function ThemeEditor({ theme, onUpdate }: ThemeEditorProps) {
  const { t } = useI18n();
  const [openGroup, setOpenGroup] = useState<ThemeGroup>('colors');
  const toggleGroup = useCallback(
    (group: ThemeGroup) => setOpenGroup(prev => (prev === group ? ('' as ThemeGroup) : group)),
    []
  );

  const handlePaletteSelect = useCallback(
    (palette: ThemePalette) => {
      const colors = PALETTE_MAP[palette as keyof typeof PALETTE_MAP];
      if (colors) {
        onUpdate({
          palette,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          accentColor: colors.accent,
        });
      }
    },
    [onUpdate]
  );

  const handleCustomColor = useCallback(
    (field: 'primaryColor' | 'secondaryColor' | 'accentColor', value: string) => {
      if (isValidHexColor(value) || value.length <= 7) {
        onUpdate({ palette: 'custom', [field]: value });
      }
    },
    [onUpdate]
  );

  const handleRoleColor = useCallback(
    (field: (typeof ROLE_FIELDS)[number]['field'], value: string | undefined) => {
      // Role tokens are places, not palette members: setting one must not
      // flip the palette to "custom" the way brand-color edits do.
      if (value === undefined || isValidHexColor(value) || value.length <= 7) {
        onUpdate({ [field]: value });
      }
    },
    [onUpdate]
  );

  const contrastWarnings = useContrastWarnings(theme, t);

  const isCustomPalette =
    theme.palette === 'custom' ||
    !ALL_PALETTES.includes(theme.palette as Exclude<ThemePalette, 'custom'>);

  return (
    <div className="space-y-2" data-testid="theme-editor">
      {/* Colors */}
      <ThemeGroupSection
        title={t('admin.storeBranding.colorPalette')}
        expanded={openGroup === 'colors'}
        onToggle={() => toggleGroup('colors')}
        testId="theme-group-colors"
      >
        <div className="grid grid-cols-2 gap-2">
          {ALL_PALETTES.map(palette => {
            const colors = PALETTE_MAP[palette];
            const isSelected = theme.palette === palette;
            return (
              <button
                key={palette}
                type="button"
                onClick={() => handlePaletteSelect(palette)}
                className={cn(
                  'relative flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <div className="flex gap-0.5 shrink-0">
                  <div
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <div
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                    style={{ backgroundColor: colors.secondary }}
                  />
                  <div
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                  />
                </div>
                <span
                  className="text-xs truncate"
                  title={`${PALETTE_ICONS[palette] || ''} ${t(`admin.storeBranding.${PALETTE_I18N_KEYS[palette]}` as Parameters<typeof t>[0])}`}
                >
                  {PALETTE_ICONS[palette] || ''}{' '}
                  {t(
                    `admin.storeBranding.${PALETTE_I18N_KEYS[palette]}` as Parameters<typeof t>[0]
                  )}
                </span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary absolute top-1 right-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom color toggle */}
        <button
          type="button"
          onClick={() => onUpdate({ palette: 'custom' })}
          className={cn(
            'mt-2 w-full flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left',
            isCustomPalette
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/30'
          )}
        >
          <span className="text-xs">⚙️ {t('admin.storeBranding.customColors')}</span>
          {isCustomPalette && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
        </button>

        {/* Custom color inputs */}
        {isCustomPalette && (
          <div className="mt-3 space-y-2">
            <ColorInput
              label={t('admin.storeBranding.primaryColor')}
              value={theme.primaryColor}
              onChange={v => handleCustomColor('primaryColor', v)}
            />
            <ColorInput
              label={t('admin.storeBranding.secondaryColor')}
              value={theme.secondaryColor || '#6b7280'}
              onChange={v => handleCustomColor('secondaryColor', v)}
            />
            <ColorInput
              label={t('admin.storeBranding.accentColor')}
              value={theme.accentColor || '#9ca3af'}
              onChange={v => handleCustomColor('accentColor', v)}
            />
          </div>
        )}

        {/* Role tokens: page/text/card colors, opt-in per role */}
        <div className="mt-4 pt-3 border-t border-border" data-testid="theme-role-colors">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t('admin.storeBranding.pageColors')}
          </p>
          <div className="space-y-2">
            {ROLE_FIELDS.map(({ field, labelKey, starter }) => {
              const value = theme[field];
              const label = t(`admin.storeBranding.${labelKey}` as Parameters<typeof t>[0]);
              if (value === undefined) {
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => handleRoleColor(field, starter)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg border border-dashed border-border text-left hover:border-muted-foreground/40 transition-colors"
                    data-testid={`role-color-set-${field}`}
                  >
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-[11px] text-muted-foreground/70">
                      {t('admin.storeBranding.useDefault')}
                    </span>
                  </button>
                );
              }
              return (
                <div key={field} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <ColorInput
                      label={label}
                      value={value}
                      onChange={v => handleRoleColor(field, v)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRoleColor(field, undefined)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    aria-label={t('admin.storeBranding.clearColor')}
                    title={t('admin.storeBranding.clearColor')}
                    data-testid={`role-color-clear-${field}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contrast guard — warns, never blocks */}
        {contrastWarnings.length > 0 && (
          <div
            className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 space-y-1.5"
            data-testid="contrast-warnings"
            role="status"
          >
            {contrastWarnings.map(w => (
              <p
                key={w}
                className="flex items-start gap-1.5 text-[11px] leading-4 text-amber-800 dark:text-amber-300"
              >
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                {w}
              </p>
            ))}
          </div>
        )}
      </ThemeGroupSection>

      {/* Typography */}
      <ThemeGroupSection
        title={t('admin.storeBranding.fontFamily')}
        expanded={openGroup === 'typography'}
        onToggle={() => toggleGroup('typography')}
        testId="theme-group-typography"
      >
        <div className="space-y-1">
          {FONT_OPTIONS.map(opt => {
            const isSelected = theme.fontFamily === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdate({ fontFamily: opt.value })}
                className={cn(
                  'w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left',
                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                )}
              >
                <span className="text-sm" style={{ fontFamily: FONT_FAMILY_MAP[opt.value] }}>
                  {opt.label}
                </span>
                <span
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: FONT_FAMILY_MAP[opt.value] }}
                >
                  The quick brown fox
                </span>
              </button>
            );
          })}
        </div>
      </ThemeGroupSection>

      {/* Layout */}
      <ThemeGroupSection
        title={t('admin.storeBranding.borderRadius')}
        expanded={openGroup === 'layout'}
        onToggle={() => toggleGroup('layout')}
        testId="theme-group-layout"
      >
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map(opt => {
            const isSelected = theme.borderRadius === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdate({ borderRadius: opt.value })}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <div
                  className="w-8 h-8 bg-foreground/10 border border-foreground/20"
                  style={{ borderRadius: opt.preview }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {t(`admin.storeBranding.${opt.i18nKey}` as Parameters<typeof t>[0])}
                </span>
              </button>
            );
          })}
        </div>
      </ThemeGroupSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accordion group
// ---------------------------------------------------------------------------

function ThemeGroupSection({
  title,
  expanded,
  onToggle,
  testId,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        data-testid={testId}
      >
        {title}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Color Input (hex + swatch)
// ---------------------------------------------------------------------------

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isValid = isValidHexColor(value);

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-md border border-border shrink-0 relative overflow-hidden"
        style={{ backgroundColor: isValid ? value : '#ccc' }}
      >
        <input
          type="color"
          value={isValid ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label={label}
        />
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-xs text-muted-foreground block mb-0.5">{label}</label>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className={cn(
            'w-full text-xs px-2 py-1 rounded border bg-background',
            isValid ? 'border-border' : 'border-destructive'
          )}
        />
      </div>
    </div>
  );
}
