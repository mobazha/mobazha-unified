'use client';

import React from 'react';
import type { StoreSection, SectionType } from '@mobazha/core';
import { SYSTEM_SECTION_TYPES, ADDABLE_SECTION_TYPES, MAX_SECTIONS } from '@mobazha/core';
import { getSectionMeta, createSection } from '@/components/store-sections';
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';

interface SectionListProps {
  sections: StoreSection[];
  onChange: (sections: StoreSection[]) => void;
}

export function SectionList({ sections, onChange }: SectionListProps) {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const toggleVisible = (index: number) => {
    const next = [...sections];
    const section = next[index];
    if (SYSTEM_SECTION_TYPES.includes(section.type)) return;
    next[index] = { ...section, visible: !section.visible } as StoreSection;
    onChange(next);
  };

  const remove = (index: number) => {
    const section = sections[index];
    if (SYSTEM_SECTION_TYPES.includes(section.type)) return;
    onChange(sections.filter((_, i) => i !== index));
  };

  const addSection = (type: SectionType) => {
    if (sections.length >= MAX_SECTIONS) return;
    const section = createSection(type);
    if (!section) return;
    onChange([...sections, section]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {sections.map((section, i) => {
          const meta = getSectionMeta(section.type);
          const isSystem = SYSTEM_SECTION_TYPES.includes(section.type);
          return (
            <div
              key={section.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                section.visible
                  ? 'border-border bg-background'
                  : 'border-border/50 bg-muted/30 opacity-60'
              }`}
            >
              <span className="text-base">{meta?.icon || '📦'}</span>
              <span className="flex-1 truncate font-medium">
                {meta?.label || section.type}
                {isSystem && <span className="ml-1 text-xs text-muted-foreground">(system)</span>}
              </span>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === sections.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {!isSystem && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleVisible(i)}
                      className="p-1 rounded hover:bg-muted"
                      title={section.visible ? 'Hide section' : 'Show section'}
                    >
                      {section.visible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sections.length < MAX_SECTIONS && <AddSectionButton onAdd={addSection} />}
    </div>
  );
}

function AddSectionButton({ onAdd }: { onAdd: (type: SectionType) => void }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-dashed border-muted-foreground/30 rounded-md hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Section
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {ADDABLE_SECTION_TYPES.map(type => {
            const meta = getSectionMeta(type);
            if (!meta) return null;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAdd(type);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
              >
                <span className="text-base">{meta.icon}</span>
                <div>
                  <div className="font-medium">{meta.label}</div>
                  <div className="text-xs text-muted-foreground">{meta.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
