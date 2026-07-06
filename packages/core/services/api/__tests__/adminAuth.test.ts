import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NODE_API } from '../../../config/apiPaths';
import { nodeAuthPost } from '../helpers';
import { changeAdminPassword } from '../adminAuth';

vi.mock('../helpers', () => ({
  nodeAuthPost: vi.fn(),
}));

describe('changeAdminPassword', () => {
  beforeEach(() => {
    vi.mocked(nodeAuthPost).mockReset();
  });

  it('uses the local authenticated Node admin endpoint', async () => {
    vi.mocked(nodeAuthPost).mockResolvedValue({ success: true });
    const input = { currentPassword: 'current-password', newPassword: 'new-password' };

    await expect(changeAdminPassword(input)).resolves.toEqual({ success: true });
    expect(nodeAuthPost).toHaveBeenCalledWith(NODE_API.ADMIN_PASSWORD, input);
  });
});
