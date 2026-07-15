'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { imagesApi, getImageUrl, useI18n, useUserStore } from '@mobazha/core';
import { ImagePlus, Link2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-muted-foreground mb-1">{children}</label>;
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  debounceMs = 300,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    []
  );

  const handleChange = (v: string) => {
    setLocal(v);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChangeRef.current(v), debounceMs);
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={local}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm px-2.5 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  debounceMs = 300,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  debounceMs?: number;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    []
  );

  const handleChange = (v: string) => {
    setLocal(v);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChangeRef.current(v), debounceMs);
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={local}
        onChange={e => handleChange(e.target.value)}
        rows={rows}
        className="w-full text-sm px-2.5 py-1.5 rounded-md border border-border bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="w-full text-sm px-2.5 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ToggleInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors shrink-0',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </label>
  );
}

/**
 * ImageInput — PG-203 V2-P0
 *
 * Image field with real upload (node media pipeline) plus URL paste as the
 * secondary path. Stores a CID hash (uploads) or a full URL (paste); section
 * renderers resolve both through getImageUrl.
 */
export function ImageInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const previewUrl = getImageUrl(value, profile?.peerID || undefined);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setFailed(false);
      try {
        const base64 = await imagesApi.fileToBase64(file);
        const image = await imagesApi.uploadImage({ filename: file.name, image: base64 });
        if (image?.original) {
          onChange(image.original);
        } else {
          setFailed(true);
        }
      } catch {
        setFailed(true);
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {value && previewUrl ? (
        <div className="relative group rounded-md overflow-hidden border border-border">
          <img src={previewUrl} alt="" className="w-full h-24 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-2 py-1 rounded bg-white/90 text-xs font-medium text-gray-900 hover:bg-white"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t('admin.storeBranding.replaceImage')
              )}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 rounded bg-white/90 text-gray-900 hover:bg-white"
              aria-label={t('admin.storeBranding.removeItem')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-1 py-4 rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4" />
          )}
          <span className="text-xs">{t('admin.storeBranding.uploadImage')}</span>
        </button>
      )}
      {failed && (
        <p className="mt-1 text-[11px] text-destructive">{t('admin.storeBranding.uploadFailed')}</p>
      )}
      <div className="mt-1">
        {showUrlInput ? (
          <input
            type="text"
            defaultValue={value.startsWith('http') || value.startsWith('/') ? value : ''}
            onBlur={e => {
              const v = e.target.value.trim();
              if (v) onChange(v);
              setShowUrlInput(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="https://..."
            autoFocus
            className="w-full text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Link2 className="w-3 h-3" />
            {t('admin.storeBranding.useImageUrl')}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * DateTimeInput — native datetime-local control storing an ISO 8601 string
 * (what CountdownSection expects), replacing the raw-ISO text field.
 */
export function DateTimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (isoString: string) => void;
}) {
  // ISO (UTC) → local "YYYY-MM-DDTHH:mm" for the input; invalid/empty → ''.
  const toLocalInput = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="datetime-local"
        value={toLocalInput(value)}
        onChange={e => {
          const v = e.target.value;
          onChange(v ? new Date(v).toISOString() : '');
        }}
        className="w-full text-sm px-2.5 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-full text-sm px-2.5 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
