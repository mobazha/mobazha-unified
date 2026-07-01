'use client';

/**
 * SectionListEditor — PG-201 Phase 4
 *
 * Sortable list of sections with drag-and-drop reordering (@dnd-kit),
 * visibility toggle, delete, and expand/collapse for inline property editing.
 */

import React, { useState, useMemo } from 'react';
import { useI18n } from '@mobazha/core';
import type { StoreSection } from '@mobazha/core';
import { MAX_SECTIONS } from '@mobazha/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, Trash2, GripVertical, ChevronRight, Plus } from 'lucide-react';
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

interface SortableItemProps {
  section: StoreSection;
  isExpanded: boolean;
  onExpandToggle: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateProps: (props: Record<string, unknown>) => void;
}

function SortableItem({
  section,
  isExpanded,
  onExpandToggle,
  onToggle,
  onRemove,
  onUpdateProps,
}: SortableItemProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const meta = getSectionMeta(section.type);
  const localizedLabel = meta?.labelKey ? t(meta.labelKey) : (meta?.label ?? section.type);
  const label = meta?.icon ? `${meta.icon} ${localizedLabel}` : localizedLabel;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border transition-colors',
        !section.visible && 'opacity-50',
        isDragging && 'z-50 shadow-lg opacity-90',
        isExpanded ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
      )}
    >
      <div className="flex items-center gap-1 px-2 py-2">
        {/* Drag handle */}
        <button
          type="button"
          className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-muted transition-colors touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={onExpandToggle}
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
          onClick={onExpandToggle}
          className="flex-1 text-left text-sm font-medium truncate"
        >
          {label}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label={section.visible ? 'Hide section' : 'Show section'}
          >
            {section.visible ? (
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Remove section"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border px-3 py-3">
          <SectionPropsEditor section={section} onUpdate={onUpdateProps} />
        </div>
      )}
    </div>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sectionIds = useMemo(() => sections.map(s => s.id), [sections]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex(s => s.id === active.id);
    const to = sections.findIndex(s => s.id === over.id);
    if (from !== -1 && to !== -1) onMove(from, to);
  }

  return (
    <div className="space-y-2" data-testid="section-list-editor">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          {sections.map(section => (
            <SortableItem
              key={section.id}
              section={section}
              isExpanded={expandedId === section.id}
              onExpandToggle={() =>
                setExpandedId(prev => (prev === section.id ? null : section.id))
              }
              onToggle={() => onToggle(section.id)}
              onRemove={() => onRemove(section.id)}
              onUpdateProps={props => onUpdateProps(section.id, props)}
            />
          ))}
        </SortableContext>
      </DndContext>

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
