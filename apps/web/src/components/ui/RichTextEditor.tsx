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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const [hasSelectionOnOpen, setHasSelectionOnOpen] = useState(false);
  const savedSelectionRef = useRef<globalThis.Range | null>(null);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  // Execute formatting command
  const execCommand = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
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

  // Save current selection before opening dialog
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore selection after dialog closes
  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current) {
      try {
        const range = savedSelectionRef.current;
        if (range.startContainer.isConnected && range.endContainer.isConnected) {
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      } catch {
        // Range may be detached if DOM changed; fallback to focusing editor
        editorRef.current?.focus();
      }
    }
  }, []);

  // Handle link insertion - open dialog instead of window.prompt
  const handleLink = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';
    const hasSelection = selectedText.length > 0;

    saveSelection();
    setHasSelectionOnOpen(hasSelection);
    setLinkUrl('https://');
    setLinkText(hasSelection ? selectedText : '');
    setLinkDialogOpen(true);
  }, [saveSelection]);

  // Validate URL: only allow http/https protocols
  const isValidUrl = useCallback((url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);

  // Escape HTML entities to prevent XSS
  const escapeHtml = useCallback((str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }, []);

  // Insert link when dialog is confirmed
  const handleLinkConfirm = useCallback(() => {
    if (!linkUrl || linkUrl === 'https://' || !isValidUrl(linkUrl)) {
      setLinkDialogOpen(false);
      return;
    }

    // Restore the selection first
    restoreSelection();

    if (hasSelectionOnOpen) {
      // Has selection: wrap selected text with link
      execCommand('createLink', linkUrl);
    } else {
      // No selection: insert link with custom text (escaped to prevent XSS)
      const safeText = escapeHtml(linkText || linkUrl);
      const safeUrl = escapeHtml(linkUrl);
      execCommand('insertHTML', `<a href="${safeUrl}" rel="noopener noreferrer">${safeText}</a>`);
    }

    handleInput();
    setLinkDialogOpen(false);
  }, [
    linkUrl,
    linkText,
    hasSelectionOnOpen,
    restoreSelection,
    execCommand,
    handleInput,
    isValidUrl,
    escapeHtml,
  ]);

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
    <>
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

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('listing.richEditor.insertLink') || 'Insert Link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="link-url" className="text-sm font-medium text-foreground">
                {t('listing.richEditor.enterUrl') || 'URL'}
              </label>
              <input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLinkConfirm()}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                placeholder={t('common.urlPlaceholder')}
                autoFocus
                data-testid="link-url-input"
              />
            </div>
            {!hasSelectionOnOpen && (
              <div className="space-y-2">
                <label htmlFor="link-text" className="text-sm font-medium text-foreground">
                  {t('listing.richEditor.enterLinkText') || 'Link text'}
                </label>
                <input
                  id="link-text"
                  type="text"
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLinkConfirm()}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  placeholder={t('listing.richEditor.enterLinkText') || 'Link text'}
                  data-testid="link-text-input"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleLinkConfirm}>{t('common.confirm') || 'Insert'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RichTextEditor;
