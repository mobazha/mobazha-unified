'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useI18n } from '@mobazha/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface ProcessingTimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Sentinel value for "custom" option */
const CUSTOM_KEY = '__custom__';

/** Standard processing time options */
const PRESET_KEYS = ['1day', '1to3days', '3to5days', '5to7days', '1to2weeks', '2to4weeks'] as const;

/**
 * Structured processing time selector with preset options and custom input.
 */
export function ProcessingTimeSelect({
  value,
  onChange,
  className = '',
}: ProcessingTimeSelectProps) {
  const { t } = useI18n();

  // Build preset map for matching
  const presetMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of PRESET_KEYS) {
      map[key] = t(`listing.processingTimeOptions.${key}`);
    }
    return map;
  }, [t]);

  // Determine if current value matches a preset
  const matchedPreset = useMemo(() => {
    for (const [key, label] of Object.entries(presetMap)) {
      if (value === label) return key;
    }
    return null;
  }, [value, presetMap]);

  const [isCustom, setIsCustom] = useState(!matchedPreset && value !== '');

  const selectedKey = matchedPreset || (isCustom || (value && !matchedPreset) ? CUSTOM_KEY : '');

  const handleSelectChange = useCallback(
    (key: string) => {
      if (key === CUSTOM_KEY) {
        setIsCustom(true);
        // Keep existing custom text if any, or clear
        if (matchedPreset) {
          onChange('');
        }
      } else {
        setIsCustom(false);
        onChange(presetMap[key] || '');
      }
    },
    [presetMap, onChange, matchedPreset]
  );

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <Select value={selectedKey} onValueChange={handleSelectChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('listing.processingTimeOptions.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {PRESET_KEYS.map(key => (
            <SelectItem key={key} value={key}>
              {t(`listing.processingTimeOptions.${key}`)}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_KEY}>{t('listing.processingTimeOptions.custom')}</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          value={value}
          onChange={handleCustomChange}
          placeholder={t('listing.processingTimePlaceholder')}
          autoFocus
        />
      )}
    </div>
  );
}

export default ProcessingTimeSelect;
