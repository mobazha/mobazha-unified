/**
 * 折扣 API 服务
 *
 * 两类端点：
 *   - 管理端点（需认证）: CRUD + 折扣码管理 + 使用记录
 *   - 公开端点: 验证折扣码 + 查询可用自动折扣
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authPut, authDel, publicGet, publicPost } from './helpers';

// ========== 类型定义 ==========

export interface Discount {
  id: string;
  tenantID?: string;
  title: string;
  description: string;
  method: 'code' | 'automatic';
  valueType: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: string;
  currency: string;
  maxDiscountAmount?: string;
  scope: 'order' | 'product';
  appliesTo: 'all' | 'specific_products' | 'specific_collections';
  productIDs?: string[];
  collectionIDs?: string[];
  minPurchaseType: 'none' | 'min_amount' | 'min_quantity';
  minAmount?: string;
  minQuantity?: number;
  startsAt: string;
  endsAt?: string;
  usageLimit: number;
  usageCount: number;
  perCustomerLimit: number;
  combinesWithProduct: boolean;
  combinesWithOrder: boolean;
  combinesWithShipping: boolean;
  status: 'draft' | 'scheduled' | 'active' | 'expired';
  createdAt: string;
  updatedAt: string;
  codes?: DiscountCode[];
}

export interface DiscountCode {
  id: string;
  discountID: string;
  code: string;
  usageCount: number;
  createdAt: string;
}

export interface DiscountRedemption {
  id: string;
  discountID: string;
  codeID?: string;
  customerPeerID: string;
  orderID: string;
  discountAmount: string;
  currency: string;
  redeemedAt: string;
}

export interface DiscountListResponse {
  data: Discount[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ValidateDiscountRequest {
  code: string;
  customerPeerID?: string;
}

export interface ValidateDiscountResponse {
  valid: boolean;
  title: string;
  valueType: string;
  value: string;
  maxDiscountAmount?: string;
}

export interface ApplicableDiscount {
  title: string;
  valueType: string;
  value: string;
  currency: string;
  minPurchaseType?: string;
  minAmount?: string;
}

export interface CalculateDiscountsRequest {
  discountCodes?: string[];
  productIDs?: string[];
  customerPeerID?: string;
  subtotal: string;
  currency: string;
  itemQuantity?: number;
}

export interface CalculateDiscountsResponse {
  appliedDiscounts: {
    discountID: string;
    codeID?: string;
    title: string;
    code?: string;
    valueType: string;
    value: string;
    amount: string;
    auto?: boolean;
  }[];
  discountsTotal: string;
  shippingDiscount: boolean;
}

// ========== 管理 API (需认证) ==========

export async function createDiscount(data: Partial<Discount>): Promise<Discount> {
  return authPost<Discount>(NODE_API.DISCOUNTS, data);
}

export async function getDiscount(discountID: string): Promise<Discount> {
  return authGet<Discount>(NODE_API.DISCOUNT(discountID));
}

export async function listDiscounts(
  page = 1,
  pageSize = 20,
  status?: string
): Promise<DiscountListResponse> {
  let path = `${NODE_API.DISCOUNTS}?page=${page}&pageSize=${pageSize}`;
  if (status) path += `&status=${encodeURIComponent(status)}`;
  return authGet<DiscountListResponse>(path);
}

export async function updateDiscount(
  discountID: string,
  data: Partial<Discount>
): Promise<Discount> {
  return authPut<Discount>(NODE_API.DISCOUNT(discountID), data);
}

export async function deleteDiscount(discountID: string): Promise<void> {
  return authDel<void>(NODE_API.DISCOUNT(discountID));
}

export async function addDiscountCodes(
  discountID: string,
  codes: string[]
): Promise<DiscountCode[]> {
  return authPost<DiscountCode[]>(NODE_API.DISCOUNT_CODES(discountID), { codes });
}

export async function listDiscountCodes(discountID: string): Promise<DiscountCode[]> {
  return authGet<DiscountCode[]>(NODE_API.DISCOUNT_CODES(discountID));
}

export async function deleteDiscountCode(discountID: string, codeID: string): Promise<void> {
  return authDel<void>(NODE_API.DISCOUNT_CODE(discountID, codeID));
}

export async function listDiscountRedemptions(discountID: string): Promise<DiscountRedemption[]> {
  return authGet<DiscountRedemption[]>(NODE_API.DISCOUNT_REDEMPTIONS(discountID));
}

// ========== 公开 API (买家结账) ==========

export async function validateDiscountCode(
  data: ValidateDiscountRequest
): Promise<ValidateDiscountResponse> {
  return publicPost<ValidateDiscountResponse>(NODE_API.DISCOUNTS_VALIDATE, data);
}

export async function getApplicableDiscounts(): Promise<ApplicableDiscount[]> {
  return publicGet<ApplicableDiscount[]>(NODE_API.DISCOUNTS_APPLICABLE);
}

export async function calculateDiscounts(
  data: CalculateDiscountsRequest
): Promise<CalculateDiscountsResponse> {
  return publicPost<CalculateDiscountsResponse>(NODE_API.DISCOUNTS_CALCULATE, data);
}

// ========== 导出 ==========

export const discountsApi = {
  createDiscount,
  getDiscount,
  listDiscounts,
  updateDiscount,
  deleteDiscount,
  addDiscountCodes,
  listDiscountCodes,
  deleteDiscountCode,
  listDiscountRedemptions,
  validateDiscountCode,
  getApplicableDiscounts,
  calculateDiscounts,
};
