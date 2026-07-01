/**
 * Providers 导出
 *
 * Community Edition uses CommunityWalletProvider (no-op) instead of AppKit
 * so closed wallet SDKs are not pulled into the production bundle.
 * AppKitProvider.tsx remains as dormant compatibility source.
 */

export {
  AppKitProvider,
  useAppKit,
  type AppKitContextValue,
  type AppKitProviderProps,
  type ConnectOptions,
  type ConnectResult,
  type DisconnectResult,
  type SwitchNetworkResult,
  type OpenModalOptions,
} from './CommunityWalletProvider';

export { RuntimeConfigProvider } from './RuntimeConfigProvider';
