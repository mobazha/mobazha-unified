'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

export interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractData?: Record<string, any>;
}

/**
 * 合约详情模态框
 * 显示订单合约的原始 JSON 数据
 */
export const ContractModal: React.FC<ContractModalProps> = ({ isOpen, onClose, contractData }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const formattedJson = contractData ? JSON.stringify(contractData, null, 2) : '{}';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{t('order.contract.title')}</h2>
          <HStack gap="sm">
            <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
              {copied ? (
                <>
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {t('common.copied')}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {t('common.copy')}
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </HStack>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono text-foreground bg-muted rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words">
            {formattedJson}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {t('order.contract.description')}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ContractModal;
