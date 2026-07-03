'use client';

import { useCapabilities } from '../context';
import type { ScanQRCapability } from '../types';

/**
 * Platform-abstract QR code scanning.
 *
 * Telegram → native `showScanQrPopup` (Bot API 6.4+).
 * Web      → `isSupported: false`, scan() resolves `'unsupported'`.
 *
 * Result codes:
 *   - `'scanned'`     : successfully read a QR code, `data` contains the text
 *   - `'closed'`      : user closed the scanner without scanning
 *   - `'unsupported'` : platform does not support QR scanning
 */
export function useScanQR(): ScanQRCapability {
  return useCapabilities().scanQR;
}
