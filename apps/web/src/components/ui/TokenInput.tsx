'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TokenInputProps {
  /** 已选中的 token 列表 */
  tokens: string[];
  /** token 变化回调 */
  onTokensChange: (tokens: string[]) => void;
  /** 自动补全建议列表 */
  suggestions?: string[];
  /** 输入框占位文本 */
  placeholder?: string;
  /** token 显示前缀（如标签的 '#'） */
  prefix?: string;
  /** 输入规范化函数（如标签的小写、连字符转换） */
  normalize?: (input: string) => string;
  /** "创建新项"的文本模板，{{name}} 会被替换为输入值 */
  createLabel?: string;
  /** 自定义类名 */
  className?: string;
  /** token chip 样式 */
  tokenClassName?: string;
}

/**
 * 通用 Token/Chip 输入组件
 *
 * 支持：
 * - 多 token 输入（Enter/逗号添加，Backspace 删除）
 * - 自动补全建议下拉（可选）
 * - 输入规范化（可选）
 * - 自由输入新值
 */
export function TokenInput({
  tokens,
  onTokensChange,
  suggestions,
  placeholder,
  prefix,
  normalize,
  createLabel,
  className,
  tokenClassName,
}: TokenInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 过滤建议列表：排除已选中项，匹配输入
  const filteredSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    const query = inputValue.toLowerCase().trim();
    return suggestions.filter(s => {
      if (tokens.includes(s)) return false;
      if (!query) return true;
      return s.toLowerCase().includes(query);
    });
  }, [suggestions, tokens, inputValue]);

  // 输入值是否与建议列表中某项完全匹配
  const exactMatch = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return false;
    const normalized = normalize ? normalize(trimmed) : trimmed;
    return suggestions?.some(s => s.toLowerCase() === normalized.toLowerCase()) || false;
  }, [inputValue, suggestions, normalize]);

  // 是否显示"创建新项"选项
  const showCreateOption = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return false;
    const normalized = normalize ? normalize(trimmed) : trimmed;
    if (!normalized) return false;
    // 已存在于 tokens 中
    if (tokens.includes(normalized)) return false;
    // 如果有建议列表且完全匹配某项，则不显示创建选项
    if (exactMatch) return false;
    return true;
  }, [inputValue, tokens, normalize, exactMatch]);

  // 下拉列表总项数
  const totalDropdownItems = filteredSuggestions.length + (showCreateOption ? 1 : 0);
  const showDropdown = isFocused && totalDropdownItems > 0;

  // 添加 token
  const addToken = useCallback(
    (value: string) => {
      const normalized = normalize ? normalize(value) : value.trim();
      if (normalized && !tokens.includes(normalized)) {
        onTokensChange([...tokens, normalized]);
      }
      setInputValue('');
      setHighlightIndex(-1);
    },
    [tokens, onTokensChange, normalize]
  );

  // 移除 token
  const removeToken = useCallback(
    (value: string) => {
      onTokensChange(tokens.filter(t => t !== value));
    },
    [tokens, onTokensChange]
  );

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (showDropdown && highlightIndex >= 0) {
          // 选中高亮项
          if (highlightIndex < filteredSuggestions.length) {
            addToken(filteredSuggestions[highlightIndex]);
          } else {
            // "创建新项" 选项
            addToken(inputValue);
          }
        } else if (inputValue.trim()) {
          addToken(inputValue);
        }
        return;
      }

      if (e.key === 'Backspace' && !inputValue && tokens.length > 0) {
        removeToken(tokens[tokens.length - 1]);
        return;
      }

      if (e.key === 'Escape') {
        setIsFocused(false);
        inputRef.current?.blur();
        return;
      }

      if (showDropdown) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightIndex(prev => (prev < totalDropdownItems - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightIndex(prev => (prev > 0 ? prev - 1 : totalDropdownItems - 1));
        }
      }
    },
    [
      inputValue,
      tokens,
      showDropdown,
      highlightIndex,
      filteredSuggestions,
      totalDropdownItems,
      addToken,
      removeToken,
    ]
  );

  // 输入变化时重置高亮
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setHighlightIndex(-1);
  }, []);

  // 点击容器聚焦输入框
  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as globalThis.Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 高亮项滚动到可见区域
  useEffect(() => {
    if (highlightIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Token 输入区域 */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-background min-h-[44px] cursor-text transition-shadow',
          isFocused && 'ring-2 ring-primary/50'
        )}
        onClick={handleContainerClick}
      >
        {tokens.map(token => (
          <span
            key={token}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm',
              tokenClassName || 'bg-muted text-foreground'
            )}
          >
            {prefix}
            {token}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                removeToken(token);
              }}
              className="w-4 h-4 rounded hover:bg-muted-foreground/20 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={tokens.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* 自动补全下拉列表 */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-popover shadow-md"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors',
                highlightIndex === index && 'bg-accent text-accent-foreground'
              )}
              onMouseDown={e => {
                e.preventDefault(); // 防止 blur
                addToken(suggestion);
              }}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              {suggestion}
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              className={cn(
                'w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors border-t border-border',
                highlightIndex === filteredSuggestions.length && 'bg-accent text-accent-foreground'
              )}
              onMouseDown={e => {
                e.preventDefault();
                addToken(inputValue);
              }}
              onMouseEnter={() => setHighlightIndex(filteredSuggestions.length)}
            >
              {createLabel
                ? createLabel.replace('{{name}}', inputValue.trim())
                : `+ ${inputValue.trim()}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
