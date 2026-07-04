import type {
  CommerceFeaturePackage,
  CommerceNavigationItem,
  CommerceRouteDescriptor,
  CommerceRuntimePolicy,
  CommerceSlotContribution,
  ComposedCommerceFeatures,
} from './contracts';

function assertUnique(values: readonly string[], kind: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`duplicate commerce ${kind}: ${value}`);
    seen.add(value);
  }
}

function enabled<T extends { capability?: string }>(
  item: T,
  policy: CommerceRuntimePolicy
): boolean {
  return item.capability === undefined || policy.hasCapability(item.capability);
}

export function composeCommerceFeatures(
  packages: readonly CommerceFeaturePackage[],
  policy: CommerceRuntimePolicy
): ComposedCommerceFeatures {
  assertUnique(
    packages.map(item => item.id),
    'package id'
  );

  const routes: CommerceRouteDescriptor[] = [];
  const navigation: CommerceNavigationItem[] = [];
  const slots = new Map<string, CommerceSlotContribution[]>();
  for (const feature of packages) {
    routes.push(...(feature.routes ?? []).filter(item => enabled(item, policy)));
    navigation.push(...(feature.navigation ?? []).filter(item => enabled(item, policy)));
    for (const contribution of (feature.slots ?? []).filter(item => enabled(item, policy))) {
      const list = slots.get(contribution.slot) ?? [];
      list.push(contribution);
      slots.set(contribution.slot, list);
    }
  }

  assertUnique(
    routes.map(item => item.id),
    'route id'
  );
  assertUnique(
    routes.map(item => item.path),
    'route path'
  );
  assertUnique(
    navigation.map(item => item.id),
    'navigation id'
  );
  assertUnique(
    [...slots.values()].flatMap(items => items.map(item => item.id)),
    'slot contribution id'
  );

  navigation.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  for (const contributions of slots.values()) {
    contributions.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  }
  return { routes, navigation, slots };
}
