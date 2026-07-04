import { describe, expect, it } from 'vitest';
import { composeCommerceFeatures } from './compose';

const allow = (...capabilities: string[]) => ({
  hasCapability: (capability: string) => capabilities.includes(capability),
});

describe('composeCommerceFeatures', () => {
  it('filters optional contributions using runtime capabilities', () => {
    const result = composeCommerceFeatures(
      [
        {
          id: 'example',
          navigation: [
            { id: 'public', area: 'admin', labelKey: 'public', href: '/public' },
            {
              id: 'optional',
              area: 'admin',
              labelKey: 'optional',
              href: '/optional',
              capability: 'example.optional',
            },
          ],
        },
      ],
      allow()
    );
    expect(result.navigation.map(item => item.id)).toEqual(['public']);
  });

  it('rejects route collisions across applications', () => {
    const load = async () => ({ default: () => null });
    expect(() =>
      composeCommerceFeatures(
        [
          { id: 'one', routes: [{ id: 'one.route', path: '/same', auth: 'public', load }] },
          { id: 'two', routes: [{ id: 'two.route', path: '/same', auth: 'admin', load }] },
        ],
        allow()
      )
    ).toThrow('duplicate commerce route path: /same');
  });
});
