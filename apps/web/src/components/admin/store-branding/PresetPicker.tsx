'use client';

import React from 'react';
import type { StoreConfig } from '@mobazha/core';
import { getPaletteColors } from '@mobazha/core';
import { STORE_PRESETS, type StorePreset } from '@/components/store-sections';

interface PresetPickerProps {
  onSelect: (config: StoreConfig) => void;
}

export function PresetPicker({ onSelect }: PresetPickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Quick Start Presets</h3>
      <div className="grid grid-cols-2 gap-3">
        {STORE_PRESETS.map((preset: StorePreset) => {
          const palette = getPaletteColors(preset.config.theme.palette);
          const primary = palette?.primary || preset.config.theme.primaryColor || '#888';
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => onSelect(preset.config)}
              className="flex flex-col items-start gap-2 p-3 border border-border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all text-left"
            >
              <div className="flex gap-1">
                <span
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: primary }}
                />
                <span
                  className="w-4 h-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: palette?.secondary || '#ccc' }}
                />
              </div>
              <div>
                <div className="text-sm font-medium">{preset.name}</div>
                <div className="text-xs text-muted-foreground">{preset.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
