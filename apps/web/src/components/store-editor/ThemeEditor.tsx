'use client';

/**
 * ThemeEditor — PG-201 Phase 4
 *
 * Three-layer theme customization:
 * 1. Palette cards (8 presets)
 * 2. Font selector with live preview
 * 3. Border radius selector
 * 4. Custom color inputs (when palette = custom)
 */

import React, { useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import type { StoreTheme, ThemePalette, FontFamily, BorderRadius } from '@mobazha/core';
import { PALETTE_MAP, ALL_PALETTES, FONT_FAMILY_MAP, isValidHexColor } from '@mobazha/core';
import { Check } from 'lucide-react';
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

export function ThemeEditor({ theme, onUpdate }: ThemeEditorProps) {
  const { t } = useI18n();

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

  const isCustomPalette =
    theme.palette === 'custom' ||
    !ALL_PALETTES.includes(theme.palette as Exclude<ThemePalette, 'custom'>);

  return (
    <div className="space-y-6" data-testid="theme-editor">
      {/* Palette Selection */}
      <section>
        <h3 className="text-sm font-medium mb-3">{t('admin.storeBranding.colorPalette')}</h3>
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
      </section>

      {/* Font Selection */}
      <section>
        <h3 className="text-sm font-medium mb-3">{t('admin.storeBranding.fontFamily')}</h3>
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
      </section>

      {/* Border Radius */}
      <section>
        <h3 className="text-sm font-medium mb-3">{t('admin.storeBranding.borderRadius')}</h3>
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
      </section>
    </div>
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
