/**
 * Digital Asset & Entitlement types — Phase 1.0 Core MVP
 *
 * Mirrors backend `pkg/contracts/digital_asset.go`. All JSON field names
 * use camelCase to match Huma serialization.
 *
 * Three AssetType variants:
 * - `file`        — encrypted file delivered via HMAC-signed download URL
 * - `link`        — opaque URL revealed after purchase
 * - `license_key` — pool of pre-imported keys, atomically dispensed per order
 */

export type DigitalAssetType = 'file' | 'link' | 'license_key';

/**
 * Status values for a buyer-facing entitlement entry. Only `active` and
 * `protected` (MODERATED escrow window) reveal secrets; others omit them
 * and populate `restrictedReason`.
 */
export type BuyerAssetStatus = 'active' | 'protected' | 'frozen' | 'revoked' | 'expired';

/**
 * Seller-side asset record. Returned by:
 * - POST /v1/digital-assets/upload | /link | /license-key
 * - GET  /v1/digital-assets?listingSlug=...
 * - GET  /v1/digital-assets/{assetID}
 */
export interface DigitalAssetInfo {
  id: string;
  listingSlug: string;
  variantSku?: string;
  assetType: DigitalAssetType;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  /** Decrypted URL for link-type assets (seller-authenticated endpoints only). */
  url?: string;
  sortOrder: number;
  maxDownloads: number;
  expiryHours: number;
  createdAt: string;
  updatedAt: string;
}

/** Mutable fields for PATCH /v1/digital-assets/{assetID}. */
export interface AssetUpdateInput {
  maxDownloads?: number;
  expiryHours?: number;
  sortOrder?: number;
  /** Update the URL for link-type assets. */
  url?: string;
}

/** License key pool stats — GET /v1/digital-assets/license-keys/stats. */
export interface LicenseKeyPoolStats {
  available: number;
  dispensed: number;
  revoked: number;
  total: number;
}

/**
 * Masked license key — GET /v1/digital-assets/license-keys.
 * The raw key is never returned to the seller after import; only the
 * masked variant (e.g. "ABCD-****-****-XYZ9") is shown.
 */
export interface MaskedLicenseKey {
  id: string;
  status: 'available' | 'dispensed' | 'revoked' | 'expired';
  maskedKey: string;
  licenseType: string;
  maxActivations: number;
  orderId?: string;
  dispensedAt?: string;
  expiresAt?: string;
}

/**
 * Single license key allocated to a buyer (nested inside `BuyerAssetEntry`
 * when assetType === 'license_key').
 */
export interface BuyerLicenseEntry {
  licenseKey: string;
  licenseType?: string;
  activations: number;
  maxActivations?: number;
}

/**
 * Buyer-facing entitlement entry returned by
 * `GET /v1/orders/{orderID}/digital-assets`.
 *
 * `downloadURL` (for file), `deliveryURL` (for link), and `licenseKeys`
 * (for license_key) are populated only when the grant is accessible.
 */
export interface BuyerAssetEntry {
  assetId: string;
  assetType: DigitalAssetType;
  fileName?: string;
  fileSize?: number;
  downloadURL?: string;
  deliveryURL?: string;
  licenseKeys?: BuyerLicenseEntry[];
  downloadCount: number;
  maxDownloads: number;
  expiresAt?: string;
  status: BuyerAssetStatus;
  /** Human-readable reason when status is not `active` or `protected`. */
  restrictedReason?: string;
}

export type DigitalDeliveryOrderStatus =
  | 'not_digital'
  | 'ready'
  | 'delivered'
  | 'manual_required'
  | 'pending'
  | 'restricted';

export interface DigitalDeliveryStatus {
  orderId: string;
  isDigitalOrder: boolean;
  status: DigitalDeliveryOrderStatus;
  assetCount: number;
  grantCount: number;
  accessibleGrantCount: number;
  deliveryURL?: string;
  manualFallbackAllowed: boolean;
  reason?: string;
  listingSlugs?: string[];
  preconfiguredAssetHint: boolean;
}

/**
 * Public license validation result —
 * POST /v1/stores/{storeID}/licenses/validate.
 */
export interface LicenseValidationResult {
  valid: boolean;
  reason?: string;
  licenseId?: string;
  licenseType?: string;
  expiresAt?: string;
  activations?: number;
  maxActivations?: number;
}

/**
 * Public license activation result —
 * POST /v1/stores/{storeID}/licenses/activate.
 */
export interface LicenseActivationResult {
  id: string;
  licenseId: string;
  fingerprint: string;
  label?: string;
  isActive: boolean;
  lastSeenAt: string;
}

// ========== Request payload helpers ==========
//
// File uploads use streaming multipart at POST /v1/digital-assets/upload-stream;
// see `uploadDigitalFileStream` in services/api/digitalAssets.ts for the
// transport-level interface (`UploadDigitalFileStreamInput`).

export interface CreateLinkAssetRequest {
  listingSlug: string;
  /** @deprecated Phase 1 only supports listing-level digital delivery; setting this throws client-side. */
  variantSku?: string;
  url: string;
}

export interface CreateLicenseKeyAssetRequest {
  listingSlug: string;
  /** @deprecated Phase 1 only supports listing-level digital delivery; setting this throws client-side. */
  variantSku?: string;
  appId?: string;
}

export interface ImportLicenseKeysRequest {
  listingSlug: string;
  /** @deprecated Phase 1 only supports listing-level digital delivery; setting this throws client-side. */
  variantSku?: string;
  appId?: string;
  keys: string[];
  licenseType?: string;
  maxActivations?: number;
  /** RFC3339 timestamp. */
  expiresAt?: string;
}

export interface ImportLicenseKeysResponse {
  imported: number;
}

export interface LicenseValidateRequest {
  licenseKey: string;
  fingerprint?: string;
  appID?: string;
}

export interface LicenseActivateRequest {
  licenseKey: string;
  fingerprint: string;
  label?: string;
}

export interface LicenseDeactivateRequest {
  licenseKey: string;
  fingerprint: string;
}
