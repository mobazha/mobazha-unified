'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Code,
} from 'lucide-react';
import { useI18n } from '@mobazha/core';

interface RichTextEditorProps {
  /** HTML content */
  value: string;
  /** Called with updated HTML content */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum height in pixels */
  minHeight?: number;
  /** CSS class name */
  className?: string;
}

interface ToolbarButton {
  command: string;
  icon: React.ReactNode;
  label: string;
  value?: string;
}

/**
 * Rich text editor using contentEditable with basic formatting toolbar.
 * Outputs HTML string compatible with backend bluemonday sanitization.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 200,
  className = '',
}: RichTextEditorProps) {
  const { t } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isInternalUpdate = useRef(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  // Execute formatting command
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
      // Reset on next tick
      requestAnimationFrame(() => {
        isInternalUpdate.current = false;
      });
    }
  }, [onChange]);

  // Handle link insertion
  const handleLink = useCallback(() => {
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;

    if (hasSelection) {
      const url = window.prompt(t('listing.richEditor.enterUrl') || 'Enter URL:', 'https://');
      if (url) {
        execCommand('createLink', url);
      }
    } else {
      const url = window.prompt(t('listing.richEditor.enterUrl') || 'Enter URL:', 'https://');
      if (url) {
        const text = window.prompt(
          t('listing.richEditor.enterLinkText') || 'Enter link text:',
          url
        );
        if (text) {
          execCommand('insertHTML', `<a href="${url}" rel="noopener noreferrer">${text}</a>`);
        }
      }
    }
  }, [execCommand, t]);

  // Handle paste - strip unwanted formatting
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
      // Insert as HTML, let browser handle basic sanitization
      document.execCommand('insertHTML', false, text);
      handleInput();
    },
    [handleInput]
  );

  const toolbarButtons: ToolbarButton[] = [
    { command: 'bold', icon: <Bold className="w-4 h-4" />, label: 'Bold' },
    { command: 'italic', icon: <Italic className="w-4 h-4" />, label: 'Italic' },
    {
      command: 'formatBlock',
      icon: <Heading2 className="w-4 h-4" />,
      label: 'Heading 2',
      value: 'h2',
    },
    {
      command: 'formatBlock',
      icon: <Heading3 className="w-4 h-4" />,
      label: 'Heading 3',
      value: 'h3',
    },
    {
      command: 'insertUnorderedList',
      icon: <List className="w-4 h-4" />,
      label: 'Bullet List',
    },
    {
      command: 'insertOrderedList',
      icon: <ListOrdered className="w-4 h-4" />,
      label: 'Numbered List',
    },
    {
      command: 'formatBlock',
      icon: <Quote className="w-4 h-4" />,
      label: 'Blockquote',
      value: 'blockquote',
    },
    { command: 'code', icon: <Code className="w-4 h-4" />, label: 'Code' },
    { command: 'link', icon: <LinkIcon className="w-4 h-4" />, label: 'Link' },
    { command: 'undo', icon: <Undo className="w-4 h-4" />, label: 'Undo' },
    { command: 'redo', icon: <Redo className="w-4 h-4" />, label: 'Redo' },
  ];

  const handleToolbarClick = useCallback(
    (btn: ToolbarButton) => {
      if (btn.command === 'link') {
        handleLink();
      } else if (btn.command === 'code') {
        execCommand('formatBlock', 'pre');
      } else if (btn.value) {
        execCommand(btn.command, btn.value);
      } else {
        execCommand(btn.command);
      }
      handleInput();
    },
    [handleLink, execCommand, handleInput]
  );

  const showPlaceholder = !value || value === '<br>' || value === '<div><br></div>';

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        isFocused ? 'border-primary ring-2 ring-primary/50' : 'border-border'
      } ${className}`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        {toolbarButtons.map((btn, i) => (
          <button
            key={`${btn.command}-${btn.value || i}`}
            type="button"
            onClick={() => handleToolbarClick(btn)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={btn.label}
            aria-label={btn.label}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="relative">
        {showPlaceholder && !isFocused && (
          <div className="absolute inset-0 px-4 py-3 text-muted-foreground pointer-events-none">
            {placeholder || t('listing.descriptionPlaceholder')}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPaste={handlePaste}
          className="px-4 py-3 bg-background text-foreground focus:outline-none prose prose-sm max-w-none dark:prose-invert"
          style={{ minHeight }}
          role="textbox"
          aria-multiline="true"
          aria-label={t('listing.description')}
          data-testid="rich-text-editor"
        />
      </div>
    </div>
  );
}

export default RichTextEditor;
