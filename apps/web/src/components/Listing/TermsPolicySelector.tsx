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

interface TermsPolicySelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CUSTOM_KEY = '__custom__';

const TEMPLATE_KEYS = ['standard', 'digital', 'handmade'] as const;

export function TermsPolicySelector({
  value,
  onChange,
  placeholder,
  className = '',
}: TermsPolicySelectorProps) {
  const { t } = useI18n();

  const templateMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of TEMPLATE_KEYS) {
      map[key] = t(`listing.termsTemplates.${key}`);
    }
    return map;
  }, [t]);

  const matchedTemplate = useMemo(() => {
    for (const [key, text] of Object.entries(templateMap)) {
      if (value === text) return key;
    }
    return null;
  }, [value, templateMap]);

  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    matchedTemplate || (value ? CUSTOM_KEY : '')
  );

  const handleTemplateChange = useCallback(
    (key: string) => {
      setSelectedTemplate(key);
      if (key !== CUSTOM_KEY) {
        onChange(templateMap[key] || '');
      }
    },
    [templateMap, onChange]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      const editedValue = e.target.value;
      const isStillTemplate = Object.entries(templateMap).some(([, text]) => text === editedValue);
      if (!isStillTemplate && selectedTemplate !== CUSTOM_KEY) {
        setSelectedTemplate(CUSTOM_KEY);
      }
    },
    [onChange, templateMap, selectedTemplate]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('listing.termsTemplates.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {TEMPLATE_KEYS.map(key => (
            <SelectItem key={key} value={key}>
              {t(`listing.termsTemplates.${key}Label`)}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_KEY}>{t('listing.termsTemplates.custom')}</SelectItem>
        </SelectContent>
      </Select>
      <textarea
        value={value}
        onChange={handleTextChange}
        rows={8}
        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        placeholder={placeholder || t('settingsExtended.termsPlaceholder')}
      />
    </div>
  );
}

export default TermsPolicySelector;
