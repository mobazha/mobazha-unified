import { NODE_API } from '../../config/apiPaths';
import { nodeAuthPost } from './helpers';

export interface ChangeAdminPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeAdminPasswordResponse {
  success: boolean;
}

/** Rotate the local Node administrator password. */
export function changeAdminPassword(
  input: ChangeAdminPasswordRequest
): Promise<ChangeAdminPasswordResponse> {
  return nodeAuthPost<ChangeAdminPasswordResponse>(NODE_API.ADMIN_PASSWORD, input);
}
