export const MAX_COMPOSER_FILE_DRAFTS = 10;
export const MAX_COMPOSER_FILE_DRAFT_BYTES = 10 * 1024 * 1024;

export interface ComposerFileDraft {
  id: string;
  file: File;
  previewUrl?: string;
}

export function composerFileDraftId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function isComposerImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function createComposerFileDraft(file: File): ComposerFileDraft {
  const draft: ComposerFileDraft = {
    id: composerFileDraftId(file),
    file,
  };
  if (isComposerImageFile(file)) {
    draft.previewUrl = URL.createObjectURL(file);
  }
  return draft;
}

export function revokeComposerFileDrafts(drafts: ComposerFileDraft[]): void {
  for (const draft of drafts) {
    if (draft.previewUrl) {
      URL.revokeObjectURL(draft.previewUrl);
    }
  }
}

export function composerFileDraftTotalBytes(drafts: ComposerFileDraft[]): number {
  return drafts.reduce((total, draft) => total + draft.file.size, 0);
}

export function mergeComposerFileDrafts(
  existing: ComposerFileDraft[],
  incoming: File[]
): {
  drafts: ComposerFileDraft[];
  added: number;
  skippedDuplicate: number;
  skippedLimit: number;
  skippedTotalBytes: number;
} {
  const byId = new Map(existing.map(draft => [draft.id, draft]));
  let added = 0;
  let skippedDuplicate = 0;
  let skippedLimit = 0;
  let skippedTotalBytes = 0;
  let totalBytes = composerFileDraftTotalBytes(existing);

  for (const file of incoming) {
    const id = composerFileDraftId(file);
    if (byId.has(id)) {
      skippedDuplicate += 1;
      continue;
    }
    if (byId.size >= MAX_COMPOSER_FILE_DRAFTS) {
      skippedLimit += 1;
      continue;
    }
    if (totalBytes + file.size > MAX_COMPOSER_FILE_DRAFT_BYTES) {
      skippedTotalBytes += 1;
      continue;
    }
    const draft = createComposerFileDraft(file);
    byId.set(id, draft);
    totalBytes += file.size;
    added += 1;
  }

  return {
    drafts: Array.from(byId.values()),
    added,
    skippedDuplicate,
    skippedLimit,
    skippedTotalBytes,
  };
}
