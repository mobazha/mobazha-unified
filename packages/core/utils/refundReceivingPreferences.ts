import { profileApi } from '../services/api';
import { mergeRefundReceivingAddress } from './buyerRefundAddress';

/** Best-effort load of buyer refund preferences; never throws. */
export async function loadRefundReceivingPreferencesSafe(): Promise<
  Record<string, string> | undefined
> {
  try {
    const settings = await profileApi.getSettings();
    return settings?.refundReceivingAddresses;
  } catch {
    return undefined;
  }
}

/** Best-effort persist of one coin default; never throws. Returns whether save succeeded. */
export async function persistRefundReceivingAddressBestEffort(
  paymentCoin: string,
  address: string
): Promise<boolean> {
  const coin = paymentCoin.trim();
  const addr = address.trim();
  if (!coin || !addr) return false;

  try {
    const settings = await profileApi.getSettings();
    const result = await profileApi.setSettings({
      refundReceivingAddresses: mergeRefundReceivingAddress(
        settings?.refundReceivingAddresses,
        coin,
        addr
      ),
    });
    return result.success;
  } catch {
    return false;
  }
}
