'use client';

import React from 'react';
import type { StoreTheme, ThemePalette, FontFamily, BorderRadius } from '@mobazha/core';
import { PALETTE_MAP, FONT_FAMILY_MAP, RADIUS_MAP, isValidHexColor } from '@mobazha/core';

interface ThemeEditorProps {
  theme: StoreTheme;
  onChange: (theme: StoreTheme) => void;
}

const PALETTE_OPTIONS: ThemePalette[] = [
  'minimal',
  'ocean',
  'forest',
  'sunset',
  'midnight',
  'earth',
  'lavender',
  'rose',
  'custom',
];
const FONT_OPTIONS: FontFamily[] = [
  'inter',
  'poppins',
  'dm-sans',
  'space-grotesk',
  'playfair',
  'lora',
];
const RADIUS_OPTIONS: BorderRadius[] = ['none', 'sm', 'md', 'lg', 'full'];

export function ThemeEditor({ theme, onChange }: ThemeEditorProps) {
  const update = <K extends keyof StoreTheme>(key: K, value: StoreTheme[K]) => {
    onChange({ ...theme, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Color Palette */}
      <section>
        <h3 className="text-sm font-medium mb-3">Color Palette</h3>
        <div className="grid grid-cols-3 gap-2">
          {PALETTE_OPTIONS.map(palette => {
            const colors = palette !== 'custom' ? PALETTE_MAP[palette] : null;
            const isActive = theme.palette === palette;
            return (
              <button
                key={palette}
                type="button"
                onClick={() => update('palette', palette)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-colors ${
                  isActive ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted'
                }`}
              >
                {colors ? (
                  <div className="flex gap-1">
                    <span
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: colors.secondary }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <span className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300" />
                    <span className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300" />
                    <span className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300" />
                  </div>
                )}
                <span className="text-xs capitalize">{palette}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom Primary Color */}
      {theme.palette === 'custom' && (
        <section>
          <h3 className="text-sm font-medium mb-2">Primary Color</h3>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={theme.primaryColor || '#000000'}
              onChange={e => update('primaryColor', e.target.value)}
              className="w-10 h-10 rounded-md cursor-pointer border border-input"
            />
            <input
              type="text"
              value={theme.primaryColor || ''}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || val.startsWith('#')) {
                  update('primaryColor', val);
                }
              }}
              placeholder="#3B82F6"
              className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
            />
            {theme.primaryColor && !isValidHexColor(theme.primaryColor) && (
              <span className="text-xs text-destructive">Invalid hex</span>
            )}
          </div>
        </section>
      )}

      {/* Font */}
      <section>
        <h3 className="text-sm font-medium mb-2">Font</h3>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map(font => (
            <button
              key={font}
              type="button"
              onClick={() => update('fontFamily', font)}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                theme.fontFamily === font
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-input hover:border-muted-foreground/30'
              }`}
              style={{ fontFamily: FONT_FAMILY_MAP[font] }}
            >
              {font
                .split('-')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')}
            </button>
          ))}
        </div>
      </section>

      {/* Border Radius */}
      <section>
        <h3 className="text-sm font-medium mb-2">Border Radius</h3>
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map(radius => (
            <button
              key={radius}
              type="button"
              onClick={() => update('borderRadius', radius)}
              className={`flex-1 py-2 text-xs rounded-md border transition-colors ${
                theme.borderRadius === radius
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-input hover:border-muted-foreground/30'
              }`}
            >
              <span
                className="inline-block w-6 h-6 bg-primary/20 mb-1"
                style={{ borderRadius: RADIUS_MAP[radius] }}
              />
              <br />
              {radius}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
