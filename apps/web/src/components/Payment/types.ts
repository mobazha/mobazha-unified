/**
 * Payment Component Types
 * 支付组件类型定义
 */

// 代币配置
export interface TokenConfig {
  id: string;
  token: string;
  chain: string;
  type?: string;
  isNative: boolean;
  decimals: number;
  disabled?: boolean;
}

// 链配置
export interface ChainConfig {
  id: string;
  name: string;
  iconCode?: string;
  icon?: string;
  color: string;
  type: 'filter' | 'blockchain';
  addressPrefix?: string;
  isExternalWallet?: boolean;
  comingSoon?: boolean;
}

// 法币支付方式
export interface FiatMethodConfig {
  id: string;
  providerID: string;
  name: string;
  icon: string;
  color: string;
  type: 'payment';
  brandLabels?: string[];
  comingSoon?: boolean;
  disabled?: boolean;
}

// 仲裁员信息（兼容 API 和本地类型）
export interface Moderator {
  id?: string;
  peerID: string;
  name: string;
  handle?: string;
  avatar?: string;
  avatarHashes?: {
    tiny?: string;
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  location?: string;
  shortDescription?: string;
  description?: string;
  languages?: string[];
  verified?: boolean;
  verifiedMod?: boolean;
  fee: {
    percentage?: number;
    fixedFee?: {
      amount: string | number;
      currency: string;
    };
    feeType: 'percentage' | 'fixed' | 'percentage_plus_fixed' | 'fixed_plus_percentage';
  };
  stats?: {
    rating: number;
    ratingCount: number;
    disputesHandled: number;
    averageResolutionTime: number;
    successRate: number;
  };
  termsAndConditions?: string;
  acceptedCurrencies?: string[];
  contactInfo?: {
    email?: string;
    website?: string;
    social?: {
      twitter?: string;
      telegram?: string;
    };
  };
}

// 选中的支付方式
export interface SelectedPaymentMethod {
  type: 'crypto' | 'fiat';
  tokenId?: string;
  fiatMethodId?: string;
  token?: TokenConfig;
  chain?: ChainConfig;
}

// 选中的仲裁员
export interface SelectedModerator {
  moderator: Moderator;
  enabled: boolean;
  protectionDays: number;
}

// 支付选择器 Props
export interface PaymentCryptoSelectorProps {
  selectedTokenId?: string;
  onSelect: (tokenId: string) => void;
  onSelectFiat?: (providerID: string) => void;
  selectedFiatProvider?: string;
  availableFiatProviders?: string[];
  disabled?: boolean;
  className?: string;
  isRwaTokenPurchase?: boolean;
  rwaBlockchain?: string;
  showFiatMethods?: boolean;
}

// 仲裁员选择器 Props
export interface ModeratorSelectorProps {
  selectedModerator?: Moderator;
  onSelect: (moderator: Moderator) => void;
  disabled?: boolean;
  className?: string;
  moderatorList?: Moderator[];
  isLoading?: boolean;
}

// 付款保护卡片 Props
export interface PaymentProtectionCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedModerator?: Moderator;
  onChangeModerator: () => void;
  protectionDays?: number;
  className?: string;
}
