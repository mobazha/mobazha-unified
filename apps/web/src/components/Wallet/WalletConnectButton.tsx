'use client';

/**
 * 钱包连接按钮
 *
 * 使用 AppKit 原生 Web Component，自带余额显示、网络切换、钱包头像等完整功能
 */

import React from 'react';

// 声明 AppKit Web Component 类型
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          size?: 'sm' | 'md';
          label?: string;
          balance?: 'show' | 'hide';
          disabled?: boolean;
        },
        HTMLElement
      >;
      'appkit-network-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          disabled?: boolean;
        },
        HTMLElement
      >;
      'appkit-account-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          disabled?: boolean;
          balance?: 'show' | 'hide';
        },
        HTMLElement
      >;
    }
  }
}

export interface WalletConnectButtonProps {
  /** 自定义类名 */
  className?: string;
  /** 是否显示余额 */
  showBalance?: boolean;
}

export function WalletConnectButton({
  className = '',
  showBalance = true,
}: WalletConnectButtonProps) {
  return (
    <div className={className}>
      <appkit-button size="sm" balance={showBalance ? 'show' : 'hide'} />
    </div>
  );
}

export default WalletConnectButton;
