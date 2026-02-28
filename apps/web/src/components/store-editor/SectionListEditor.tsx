'use client';

/**
 * SectionListEditor — PG-201 Phase 4
 *
 * Sortable list of sections with visibility toggle, delete, expand/collapse
 * for inline property editing. Uses button-based move up/down for reordering
 * (no drag-and-drop dependency needed for MVP).
 */

import React, { useState } from 'react';
import { useI18n } from '@mobazha/core';
import type { StoreSection, SectionType } from '@mobazha/core';
import { SYSTEM_SECTION_TYPES, MAX_SECTIONS } from '@mobazha/core';
import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSectionMeta } from '@/components/store-sections';
import { SectionPropsEditor } from './SectionPropsEditor';

interface SectionListEditorProps {
  sections: StoreSection[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onUpdateProps: (id: string, props: Record<string, unknown>) => void;
  onAddClick: () => void;
}

export function SectionListEditor({
  sections,
  onToggle,
  onRemove,
  onMove,
  onUpdateProps,
  onAddClick,
}: SectionListEditorProps) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canAdd = sections.length < MAX_SECTIONS;
  const isSystem = (type: SectionType) => SYSTEM_SECTION_TYPES.includes(type);

  return (
    <div className="space-y-2" data-testid="section-list-editor">
      {sections.map((section, index) => {
        const meta = getSectionMeta(section.type);
        const isExpanded = expandedId === section.id;
        const label = meta?.icon ? `${meta.icon} ${meta.label}` : section.type;

        return (
          <div
            key={section.id}
            className={cn(
              'rounded-lg border transition-colors',
              !section.visible && 'opacity-50',
              isExpanded ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
            )}
          >
            {/* Section header row */}
            <div className="flex items-center gap-1 px-2 py-2">
              {/* Expand toggle */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronRight
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                />
              </button>

              {/* Label */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
                className="flex-1 text-left text-sm font-medium truncate"
              >
                {label}
              </button>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                {/* Move up */}
                <button
                  type="button"
                  onClick={() => onMove(index, index - 1)}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                {/* Move down */}
                <button
                  type="button"
                  onClick={() => onMove(index, index + 1)}
                  disabled={index === sections.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {/* Visibility */}
                <button
                  type="button"
                  onClick={() => onToggle(section.id)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  aria-label={section.visible ? 'Hide section' : 'Show section'}
                >
                  {section.visible ? (
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
                {/* Delete (non-system only) */}
                {!isSystem(section.type) && (
                  <button
                    type="button"
                    onClick={() => onRemove(section.id)}
                    className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Remove section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded: Section props editor */}
            {isExpanded && (
              <div className="border-t border-border px-3 py-3">
                <SectionPropsEditor
                  section={section}
                  onUpdate={props => onUpdateProps(section.id, props)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Add section button */}
      {canAdd && (
        <button
          type="button"
          onClick={onAddClick}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">{t('admin.storeBranding.addSection')}</span>
        </button>
      )}
    </div>
  );
}
