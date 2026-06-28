export { Header } from './Header';
export { MainContent } from './MainContent';
export { NonEmbedUI } from './NonEmbedUI';
export { Hero } from './Hero';
export { ProductSection } from './ProductSection';
export { Footer } from './Footer';
export { ChatList, ChatMessages } from './Chat';
export type { ChatListProps, ChatRoom, ChatMessagesProps, Message } from './Chat';
export { ChatDrawer } from './ChatDrawer';
export type { ChatDrawerProps } from './ChatDrawer';
export { ChatFloatingButton } from './ChatFloatingButton';
export type { ChatFloatingButtonProps } from './ChatFloatingButton';
export { ChatSystem } from './ChatSystem';
export { DevTools } from './DevTools';
export { MobileNav } from './MobileNav';
export { MobilePageHeader } from './MobilePageHeader';
export type { MobilePageHeaderProps } from './MobilePageHeader';
export { PWAInstall } from './PWAInstall';
export { ServiceWorkerProvider } from './ServiceWorkerProvider';
export { LanguageSwitcher } from './LanguageSwitcher';
export { ThemeProvider } from './ThemeProvider';
export { ThemeSwitcher } from './ThemeSwitcher';
export { ErrorBoundary, PageErrorBoundary } from './ErrorBoundary';
export { AuthProvider } from './AuthProvider';
export { CurrencyProvider } from './CurrencyProvider';
// SettingsModal removed - settings are now at /settings page

// Notification Components
export { NotificationBadge, NotificationDropdown } from './Notification';

// Payment Components
export {
  PaymentCryptoSelector,
  ModeratorSelector,
  ModeratorCard,
  CryptoTokenCard,
  PaymentProtectionCard,
  PaymentMethodSummary,
  CheckoutBottomBar,
  PaymentDrawer,
} from './Payment';
export type {
  TokenConfig,
  ChainConfig,
  FiatMethodConfig,
  Moderator,
  SelectedPaymentMethod,
  SelectedModerator,
  PaymentCryptoSelectorProps,
  ModeratorSelectorProps,
  PaymentProtectionCardProps,
} from './Payment';

// Query Provider (React Query)
export { QueryProvider } from './QueryProvider';

// Platform Provider
export { TGMiniAppProvider, useTGMiniApp } from './TGMiniAppProvider';
export { OuterProviders } from './OuterProviders';

// Access Control Components
export { StoreAccessGuard } from './StoreAccessGuard';

// Settings Components
export { SettingsSidebar } from './SettingsSidebar';

// Auth Components
export { AuthGuard } from './AuthGuard';
export { SessionExpiredDialog } from './SessionExpiredDialog';
// Note: ProtectedRoute is NOT exported here because it uses react-router-dom hooks
// and is only used in routes.tsx for Vite development. For Next.js, use AuthGuard instead.

// Wallet Components
export { AppKitProvider } from './AppKitProvider';
export { WalletButton } from './Wallet';
export type { WalletButtonProps } from './Wallet';

// Share Components
export { ShareButton } from './Share';
export type { ShareButtonProps } from './Share';

// Review Components
export { ReviewList } from './Review';

// Trust Components
export { SellerTrustBadge } from './Trust';

// RWA Token Components
export {
  AssetTypeSelector,
  PredefinedAssetList,
  SelectedAssetDetail,
  RwaPurchaseFlow,
  RwaFulfillFlow,
} from './RwaToken';
export type {
  AssetTypeSelectorProps,
  PredefinedAssetListProps,
  SelectedAssetDetailProps,
  RwaPurchaseFlowProps,
  RwaFulfillFlowProps,
} from './RwaToken';
