'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VStack, HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

export type ContractType = 'PHYSICAL_GOOD' | 'DIGITAL_GOOD' | 'SERVICE' | 'RWA_TOKEN';

export interface FulfillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FulfillmentData) => Promise<void>;
  contractType: ContractType;
  isLoading?: boolean;
}

export interface FulfillmentData {
  physicalDelivery?: {
    shipper: string;
    trackingNumber: string;
  };
  digitalDelivery?: {
    url?: string;
    password?: string;
  };
  cryptocurrencyDelivery?: {
    transactionID: string;
  };
  note?: string;
}

/**
 * 发货模态框
 * 支持物理商品、数字商品、服务和 RWA Token
 */
export const FulfillModal: React.FC<FulfillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contractType,
  isLoading = false,
}) => {
  const { t } = useI18n();

  // Form states
  const [shipper, setShipper] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [filePassword, setFilePassword] = useState('');
  const [transactionID, setTransactionID] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = useCallback(async () => {
    const data: FulfillmentData = { note: note.trim() || undefined };

    switch (contractType) {
      case 'PHYSICAL_GOOD':
        if (!trackingNumber.trim()) {
          window.alert(t('order.fulfill.trackingRequired'));
          return;
        }
        data.physicalDelivery = {
          shipper: shipper.trim(),
          trackingNumber: trackingNumber.trim(),
        };
        break;

      case 'DIGITAL_GOOD':
        if (!fileUrl.trim()) {
          window.alert(t('order.fulfill.urlRequired'));
          return;
        }
        data.digitalDelivery = {
          url: fileUrl.trim(),
          password: filePassword.trim() || undefined,
        };
        break;

      case 'RWA_TOKEN':
        if (!transactionID.trim()) {
          window.alert(t('order.fulfill.transactionRequired'));
          return;
        }
        data.cryptocurrencyDelivery = {
          transactionID: transactionID.trim(),
        };
        break;

      case 'SERVICE':
        // Service only needs a note
        break;
    }

    await onSubmit(data);
  }, [
    contractType,
    shipper,
    trackingNumber,
    fileUrl,
    filePassword,
    transactionID,
    note,
    onSubmit,
    t,
  ]);

  const handleClose = useCallback(() => {
    // Reset form
    setShipper('');
    setTrackingNumber('');
    setFileUrl('');
    setFilePassword('');
    setTransactionID('');
    setNote('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const renderPhysicalGoodForm = () => (
    <>
      <div>
        <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
          {t('order.fulfill.carrier')}
        </label>
        <input
          type="text"
          value={shipper}
          onChange={e => setShipper(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          placeholder={t('order.fulfill.carrierPlaceholder')}
        />
      </div>
      <div>
        <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
          {t('order.fulfill.trackingNumber')} *
        </label>
        <input
          type="text"
          value={trackingNumber}
          onChange={e => setTrackingNumber(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          placeholder={t('order.fulfill.trackingPlaceholder')}
        />
      </div>
    </>
  );

  const renderDigitalGoodForm = () => (
    <>
      <div>
        <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
          {t('order.fulfill.fileUrl')} *
        </label>
        <input
          type="url"
          value={fileUrl}
          onChange={e => setFileUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          placeholder={t('order.fulfill.fileUrlPlaceholder')}
        />
      </div>
      <div>
        <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
          {t('order.fulfill.password')}
        </label>
        <input
          type="text"
          value={filePassword}
          onChange={e => setFilePassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          placeholder={t('order.fulfill.passwordPlaceholder')}
        />
      </div>
    </>
  );

  const renderRwaTokenForm = () => (
    <div>
      <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
        {t('order.fulfill.transactionId')} *
      </label>
      <input
        type="text"
        value={transactionID}
        onChange={e => setTransactionID(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
        placeholder={t('order.fulfill.transactionPlaceholder')}
      />
      <p className="text-xs text-muted-foreground mt-1.5">{t('order.fulfill.transactionHint')}</p>
    </div>
  );

  const renderServiceForm = () => (
    <p className="text-sm text-muted-foreground">{t('order.fulfill.serviceHint')}</p>
  );

  const getTitle = () => {
    switch (contractType) {
      case 'PHYSICAL_GOOD':
        return t('order.fulfill.shipOrder');
      case 'DIGITAL_GOOD':
        return t('order.fulfill.deliverDigital');
      case 'RWA_TOKEN':
        return t('order.fulfill.transferToken');
      case 'SERVICE':
        return t('order.fulfill.completeService');
      default:
        return t('order.fulfill.fulfillOrder');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <Card className="w-full max-w-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">{getTitle()}</h2>

        <VStack gap="sm">
          {contractType === 'PHYSICAL_GOOD' && renderPhysicalGoodForm()}
          {contractType === 'DIGITAL_GOOD' && renderDigitalGoodForm()}
          {contractType === 'RWA_TOKEN' && renderRwaTokenForm()}
          {contractType === 'SERVICE' && renderServiceForm()}

          {/* Note field for all types */}
          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
              {t('order.fulfill.note')}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              placeholder={t('order.fulfill.notePlaceholder')}
            />
          </div>
        </VStack>

        <HStack justify="end" gap="sm" className="mt-4">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t('common.loading') : t('order.fulfill.confirm')}
          </Button>
        </HStack>
      </Card>
    </div>
  );
};

export default FulfillModal;
