// Config
export * from './config';

// Theme (主题系统)
export * from './theme';

// Services
export * from './services';

// Data Service (unified API/Mock switch)
export { default as dataService } from './services/dataService';
export * from './services/dataService';

// Mock Services (for direct access if needed)
export { default as mockServices } from './services/mock';

// Stores
export * from './stores';

// Hooks
export * from './hooks';

// Types
export * from './types';

// Utils
export * from './utils';

// i18n (国际化)
export * from './i18n';

// Testing utilities (for E2E tests)
export * from './testing';
