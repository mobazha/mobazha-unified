'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { VStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

export interface AddressInfo {
  name: string;
  company?: string;
  addressLineOne: string;
  addressLineTwo?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phoneNumber?: string;
  email?: string;
  addressNotes?: string;
}

export interface ShippingAddressProps {
  address: AddressInfo;
  className?: string;
}

/**
 * 收货地址展示组件
 */
export const ShippingAddress: React.FC<ShippingAddressProps> = ({ address, className = '' }) => {
  const { t } = useI18n();

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {t('order.address.title')}
      </h3>

      <VStack gap="sm">
        {/* Name and Company */}
        <div>
          <p className="text-sm font-medium text-foreground">{address.name}</p>
          {address.company && <p className="text-sm text-muted-foreground">{address.company}</p>}
        </div>

        {/* Address Lines */}
        <div className="text-sm text-foreground">
          <p>{address.addressLineOne}</p>
          {address.addressLineTwo && <p>{address.addressLineTwo}</p>}
        </div>

        {/* City, State, Postal */}
        <div className="text-sm text-foreground">
          <p>
            {address.city}
            {address.state && `, ${address.state}`}
            {address.postalCode && ` ${address.postalCode}`}
          </p>
          <p>{address.country}</p>
        </div>

        {/* Contact Info */}
        {(address.phoneNumber || address.email) && (
          <div className="pt-2 border-t border-border">
            {address.phoneNumber && (
              <p className="text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {address.phoneNumber}
                </span>
              </p>
            )}
            {address.email && (
              <p className="text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {address.email}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Address Notes */}
        {address.addressNotes && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">{t('order.address.notes')}</p>
            <p className="text-sm text-foreground">{address.addressNotes}</p>
          </div>
        )}
      </VStack>
    </Card>
  );
};

export default ShippingAddress;
