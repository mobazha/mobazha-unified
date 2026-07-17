'use client';

import * as React from 'react';
import { EntityCombobox } from './entity-combobox';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

const getOptionValue = (option: SearchableSelectOption) => option.value;
const getOptionText = (option: SearchableSelectOption) => option.label;

export interface SearchableSelectProps {
  /** 选项列表 */
  options: SearchableSelectOption[];
  /** 当前选中值 */
  value?: string;
  /** 值变化回调 */
  onValueChange?: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 无结果文本 */
  emptyText?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 可搜索的下拉选择组件
 */
export const SearchableSelect = React.memo(function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found',
  className,
  disabled = false,
}: SearchableSelectProps) {
  return (
    <EntityCombobox
      items={options}
      value={value}
      onValueChange={onValueChange}
      getItemValue={getOptionValue}
      getItemText={getOptionText}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      className={className}
      disabled={disabled}
    />
  );
});
