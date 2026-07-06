import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TokenIcon } from '@/components/Payment/TokenIcon';

describe('TokenIcon', () => {
  it('uses the bundled Monero brand icon for XMR', () => {
    render(<TokenIcon token="XMR" size={20} />);

    expect(screen.getByRole('img', { name: 'XMR' })).toHaveAttribute(
      'src',
      '/icons/crypto/XMR.svg'
    );
  });
});
