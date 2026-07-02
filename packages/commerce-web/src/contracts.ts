import type { ComponentType } from 'react';

export type CommerceAuthRequirement = 'public' | 'buyer' | 'seller' | 'admin';
export type CommerceNavigationArea = 'primary' | 'account' | 'admin' | 'settings';

export interface CommerceRuntimePolicy {
  hasCapability(capability: string): boolean;
}

export interface CommerceRouteDescriptor {
  id: string;
  path: string;
  auth: CommerceAuthRequirement;
  capability?: string;
  load: () => Promise<{ default: ComponentType }>;
}

export interface CommerceNavigationItem {
  id: string;
  area: CommerceNavigationArea;
  labelKey: string;
  href: string;
  capability?: string;
  order?: number;
}

export interface CommerceSlotContribution {
  id: string;
  slot: string;
  component: ComponentType;
  capability?: string;
  order?: number;
}

export interface CommerceFeaturePackage {
  id: string;
  routes?: readonly CommerceRouteDescriptor[];
  navigation?: readonly CommerceNavigationItem[];
  slots?: readonly CommerceSlotContribution[];
}

export interface ComposedCommerceFeatures {
  routes: readonly CommerceRouteDescriptor[];
  navigation: readonly CommerceNavigationItem[];
  slots: ReadonlyMap<string, readonly CommerceSlotContribution[]>;
}
