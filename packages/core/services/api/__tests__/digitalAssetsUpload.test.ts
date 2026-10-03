// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_DIGITAL_ASSET_UPLOAD_BYTES,
  UploadHttpError,
  uploadDigitalFileStream,
} from '../digitalAssets';

type XhrHandler = (() => void) | null;

/**
 * Minimal XMLHttpRequest double. The upload path uses XHR (not fetch) because
 * only XHR exposes request-body progress, so the tests drive it directly.
 */
class FakeXMLHttpRequest {
  static instances: FakeXMLHttpRequest[] = [];

  status = 0;
  responseText = '';
  responseType = '';
  timeout = 0;
  upload = { onprogress: null as XhrHandler } as unknown as XMLHttpRequestUpload; // eslint-disable-line no-undef

  onload: XhrHandler = null;
  onerror: XhrHandler = null;
  ontimeout: XhrHandler = null;
  onabort: XhrHandler = null;

  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();
  abort = vi.fn();

  constructor() {
    FakeXMLHttpRequest.instances.push(this);
  }

  respond(status: number, body: string): void {
    this.status = status;
    this.responseText = body;
    this.onload?.();
  }
}

function startUpload(): Promise<unknown> {
  const file = new File([new Uint8Array(16)], 'archive.zip', { type: 'application/zip' });
  return uploadDigitalFileStream({ listingSlug: 'test-listing', file });
}

async function captureError(err: unknown): Promise<UploadHttpError> {
  // `uploadDigitalFileStream` rejects with a plain Error | UploadHttpError, so
  // assert the concrete type here and let the caller inspect the fields.
  expect(err).toBeInstanceOf(UploadHttpError);
  return err as UploadHttpError;
}

describe('uploadDigitalFileStream', () => {
  beforeEach(() => {
    FakeXMLHttpRequest.instances = [];
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mirrors the 1 GiB gateway ceiling', () => {
    expect(MAX_DIGITAL_ASSET_UPLOAD_BYTES).toBe(1024 * 1024 * 1024);
  });

  it('exposes the HTTP status so callers can special-case a proxy 413', async () => {
    const promise = startUpload();
    FakeXMLHttpRequest.instances[0].respond(
      413,
      '<html><head><title>413 Payload Too Large</title></head><body><center>cloudflare</center></body></html>'
    );

    const error = await promise.then(
      () => null,
      (err: unknown) => captureError(err)
    );

    expect(error?.status).toBe(413);
    expect(error?.name).toBe('UploadHttpError');
    // The HTML body is preserved for diagnostics even though it is not JSON.
    expect(error?.responseText).toContain('413 Payload Too Large');
  });

  it('surfaces the API message when the gateway itself rejects the upload', async () => {
    const promise = startUpload();
    FakeXMLHttpRequest.instances[0].respond(
      413,
      JSON.stringify({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'file exceeds maximum upload size of 1 GiB' } })
    );

    const error = await promise.then(
      () => null,
      (err: unknown) => captureError(err)
    );

    expect(error?.message).toBe('file exceeds maximum upload size of 1 GiB');
    expect(error?.status).toBe(413);
  });

  it('falls back to a status-bearing message for an empty error body', async () => {
    const promise = startUpload();
    FakeXMLHttpRequest.instances[0].respond(500, '');

    const error = await promise.then(
      () => null,
      (err: unknown) => captureError(err)
    );

    expect(error?.message).toBe('Upload failed (HTTP 500)');
  });

  it('unwraps the {"data": ...} envelope on success', async () => {
    const promise = startUpload();
    FakeXMLHttpRequest.instances[0].respond(
      201,
      JSON.stringify({ data: { id: 'asset-1', fileName: 'archive.zip' } })
    );

    await expect(promise).resolves.toEqual({ id: 'asset-1', fileName: 'archive.zip' });
  });
});
