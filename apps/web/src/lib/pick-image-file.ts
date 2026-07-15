// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/** Matches the cover/avatar picker in store/[peerId], which writes the same profile fields. */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

export type ImagePickRejection = 'type' | 'size';

export type ImagePickResult = { file: File } | { rejected: ImagePickRejection };

/**
 * Pick the first usable image out of a picker/drop payload.
 *
 * Both entry points must run this: `accept` is only a hint every file dialog can
 * override, and a drag may carry no File at all (cross-tab image drags hand over a
 * URL). Size is checked because fileToBase64 only downscales by dimension, so a
 * heavy-but-small image would otherwise inflate ~33% and 413 at the node.
 */
export function pickImageFile(files: ArrayLike<File> | null | undefined): ImagePickResult {
  const image = Array.from(files ?? []).find(f => f.type.startsWith('image/'));
  if (!image) return { rejected: 'type' };
  if (image.size > MAX_IMAGE_SIZE) return { rejected: 'size' };
  return { file: image };
}
