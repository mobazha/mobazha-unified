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

interface ReturnPolicySelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Sentinel value for "custom" option */
const CUSTOM_KEY = '__custom__';

/** Template keys for return policy presets */
const TEMPLATE_KEYS = ['30day', '15day', 'noReturn'] as const;

/**
 * Return policy template selector with presets and custom text editing.
 * Selecting a template fills the textarea; user can further edit the text.
 */
export function ReturnPolicySelector({
  value,
  onChange,
  placeholder,
  className = '',
}: ReturnPolicySelectorProps) {
  const { t } = useI18n();

  // Build preset map for matching
  const templateMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of TEMPLATE_KEYS) {
      map[key] = t(`listing.returnPolicyTemplates.${key}`);
    }
    return map;
  }, [t]);

  // Determine if current value matches a template
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
      if (key === CUSTOM_KEY) {
        // If switching to custom from a template, keep existing text for editing
        // If already custom, don't change text
      } else {
        onChange(templateMap[key] || '');
      }
    },
    [templateMap, onChange]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // If user edits a template, switch to custom
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
          <SelectValue placeholder={t('listing.returnPolicyTemplates.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {TEMPLATE_KEYS.map(key => (
            <SelectItem key={key} value={key}>
              {t(`listing.returnPolicyTemplates.${key}Label`)}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_KEY}>{t('listing.returnPolicyTemplates.custom')}</SelectItem>
        </SelectContent>
      </Select>
      <textarea
        value={value}
        onChange={handleTextChange}
        rows={6}
        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        placeholder={placeholder || t('listing.returnPolicyPlaceholder')}
      />
    </div>
  );
}

export default ReturnPolicySelector;
