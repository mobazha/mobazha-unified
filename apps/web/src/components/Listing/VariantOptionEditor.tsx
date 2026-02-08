'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { Plus, X, GripVertical, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useI18n,
  MAX_VARIANT_OPTIONS,
  MAX_OPTION_VALUES,
  validateVariantOptions,
} from '@mobazha/core';
import type { Image } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

// ─── 类型定义 ─────────────────────────────────────

export interface VariantOption {
  name: string;
  description?: string;
  variants: { name: string; image?: Image }[];
}

export interface VariantOptionEditorProps {
  options: VariantOption[];
  onChange: (options: VariantOption[]) => void;
  errors?: string[];
  className?: string;
}

// ─── Shopify 风格预设选项（i18n key） ──────────────

const SUGGESTED_OPTION_NAMES = [
  'listing.variant.suggestedOptions.size',
  'listing.variant.suggestedOptions.color',
  'listing.variant.suggestedOptions.material',
  'listing.variant.suggestedOptions.style',
];

// ─── 单个选项编辑器 ──────────────────────────────

interface OptionItemProps {
  option: VariantOption;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (option: VariantOption) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const OptionItem = React.memo(function OptionItem({
  option,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: OptionItemProps) {
  const { t } = useI18n();
  const [newValue, setNewValue] = useState('');

  const addValue = useCallback(
    (valueName: string) => {
      const trimmed = valueName.trim();
      if (!trimmed) return;
      if (option.variants.length >= MAX_OPTION_VALUES) return;
      if (option.variants.some(v => v.name.toLowerCase() === trimmed.toLowerCase())) return;

      onUpdate({
        ...option,
        variants: [...option.variants, { name: trimmed }],
      });
      setNewValue('');
    },
    [option, onUpdate]
  );

  const removeValue = useCallback(
    (valIndex: number) => {
      onUpdate({
        ...option,
        variants: option.variants.filter((_, i) => i !== valIndex),
      });
    },
    [option, onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addValue(newValue);
      }
    },
    [newValue, addValue]
  );

  const variantSummary = option.variants.map(v => v.name).join(', ');

  return (
    <Card className="border-border/60 overflow-hidden">
      {/* 折叠头部 - Shopify 风格 */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {/* 拖拽 & 排序 */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            aria-label={t('listing.variant.moveUp')}
            className="text-muted-foreground/50 hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            aria-label={t('listing.variant.moveDown')}
            className="text-muted-foreground/50 hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">
            {option.name || t('listing.variant.untitledOption')}
          </div>
          {!isExpanded && variantSummary && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">{variantSummary}</div>
          )}
        </div>

        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {option.variants.length} {t('listing.variant.valuesCount')}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={t('listing.variant.removeOption')}
          className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-3">
          {/* 选项名称 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('listing.variant.optionName')}
            </label>
            <Input
              value={option.name}
              onChange={e => onUpdate({ ...option, name: e.target.value })}
              placeholder={t('listing.variant.optionNamePlaceholder')}
              className="h-9"
            />
          </div>

          {/* 变体值 - Shopify 风格 chip + inline input */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('listing.variant.optionValues')}
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg min-h-[40px] items-center">
              {option.variants.map((v, valIndex) => (
                <span
                  key={`${option.name}-${v.name}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-background border border-border/60 text-foreground rounded-md text-sm shadow-sm"
                >
                  {v.name}
                  <button
                    type="button"
                    onClick={() => removeValue(valIndex)}
                    aria-label={t('listing.variant.removeValue')}
                    className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <Input
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (newValue.trim()) addValue(newValue);
                }}
                placeholder={
                  option.variants.length === 0
                    ? t('listing.variant.addFirstValue')
                    : t('listing.variant.addValuePlaceholder')
                }
                className="flex-1 min-w-[120px] bg-transparent border-none shadow-none outline-none text-sm placeholder:text-muted-foreground/60 py-1 h-auto"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('listing.variant.addValueHint')}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
});

// ─── 主组件 ───────────────────────────────────────

export function VariantOptionEditor({
  options,
  onChange,
  errors,
  className,
}: VariantOptionEditorProps) {
  const { t } = useI18n();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(options.length > 0 ? 0 : null);

  // 验证
  const validationErrors = validateVariantOptions(options);
  const allErrors = [...(errors || []), ...validationErrors];

  // 已用选项名，用于过滤建议
  const usedNames = useMemo(() => new Set(options.map(o => o.name.toLowerCase())), [options]);

  // ─── 选项操作 ──────────────────────────

  const addOption = useCallback(
    (name: string = '') => {
      if (options.length >= MAX_VARIANT_OPTIONS) return;
      const newOptions = [...options, { name, variants: [] }];
      onChange(newOptions);
      setExpandedIndex(newOptions.length - 1);
    },
    [options, onChange]
  );

  const removeOption = useCallback(
    (index: number) => {
      const newOptions = options.filter((_, i) => i !== index);
      onChange(newOptions);
      if (expandedIndex === index) {
        setExpandedIndex(newOptions.length > 0 ? Math.min(index, newOptions.length - 1) : null);
      } else if (expandedIndex !== null && expandedIndex > index) {
        setExpandedIndex(expandedIndex - 1);
      }
    },
    [options, onChange, expandedIndex]
  );

  const updateOption = useCallback(
    (index: number, option: VariantOption) => {
      const updated = [...options];
      updated[index] = option;
      onChange(updated);
    },
    [options, onChange]
  );

  const moveOption = useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= options.length) return;
      const updated = [...options];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      onChange(updated);
      if (expandedIndex === index) setExpandedIndex(newIndex);
      else if (expandedIndex === newIndex) setExpandedIndex(index);
    },
    [options, onChange, expandedIndex]
  );

  return (
    <div className={className}>
      {/* 错误提示 */}
      {allErrors.length > 0 && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            {allErrors.map((err, i) => (
              <p key={`${err}-${i}`}>{t(err)}</p>
            ))}
          </div>
        </div>
      )}

      {/* 选项列表 */}
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((option, index) => (
            <OptionItem
              key={`${option.name}-${index}`}
              option={option}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
              onUpdate={opt => updateOption(index, opt)}
              onRemove={() => removeOption(index)}
              onMoveUp={() => moveOption(index, -1)}
              onMoveDown={() => moveOption(index, 1)}
              isFirst={index === 0}
              isLast={index === options.length - 1}
            />
          ))}
        </div>
      )}

      {/* 添加选项区域 - Shopify 风格建议 */}
      {options.length < MAX_VARIANT_OPTIONS && (
        <div className="mt-4">
          {options.length === 0 ? (
            <>
              {/* 初始状态：显示预设建议 + 自定义按钮 */}
              <p className="text-sm text-muted-foreground mb-3">
                {t('listing.variant.chooseOption')}
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_OPTION_NAMES.map(nameKey => {
                  const name = t(nameKey);
                  if (usedNames.has(name.toLowerCase())) return null;
                  return (
                    <Button
                      key={nameKey}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(name)}
                      className="h-8"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {name}
                    </Button>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOption('')}
                  className="h-8 border-dashed"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t('listing.variant.customOption')}
                </Button>
              </div>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => addOption('')}>
              <Plus className="w-4 h-4 mr-1.5" />
              {t('listing.variant.addAnotherOption')}
            </Button>
          )}
        </div>
      )}

      {/* 限制提示 */}
      {options.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {t('listing.variant.limitHint', {
            maxOptions: MAX_VARIANT_OPTIONS,
            current: options.length,
          })}
        </p>
      )}
    </div>
  );
}
