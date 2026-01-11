export { Header } from './Header';
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

// Access Control Components
export { StoreAccessGuard } from './StoreAccessGuard';

// Settings Components
export { SettingsSidebar } from './SettingsSidebar';

// Auth Components
export { AuthGuard } from './AuthGuard';
