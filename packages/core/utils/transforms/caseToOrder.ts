/**
 * Maps GET /v1/cases/{orderID} (pb.Case JSON) into the Order shape used by transformCoreOrder.
 */
import type { Order, OrderContract, OrderState } from '../../types/order';

type CaseDetailPayload = Record<string, unknown>;

function pickContract(payload: CaseDetailPayload): OrderContract | undefined {
  const buyer = payload.buyerContract as OrderContract | undefined;
  const vendor = payload.vendorContract as OrderContract | undefined;
  const preferred = buyer?.orderOpen ? buyer : vendor?.orderOpen ? vendor : buyer || vendor;
  if (!preferred) return undefined;

  const contract: OrderContract = { ...preferred };
  if (payload.disputeOpen) {
    contract.disputeOpen = payload.disputeOpen as OrderContract['disputeOpen'];
  }
  if (payload.disputeClose) {
    contract.disputeClose = payload.disputeClose as OrderContract['disputeClose'];
  }
  const orderID =
    (typeof payload.orderID === 'string' && payload.orderID) ||
    (typeof payload.orderId === 'string' && payload.orderId) ||
    '';
  if (orderID) {
    (contract as OrderContract & { OrderID?: string }).OrderID = orderID;
  }
  return contract;
}

export function caseDetailToOrder(payload: CaseDetailPayload): Order | null {
  const contract = pickContract(payload);
  if (!contract) return null;

  const state = (typeof payload.state === 'string' ? payload.state : 'DISPUTED') as OrderState;
  const read = typeof payload.read === 'boolean' ? payload.read : false;
  const unread =
    typeof payload.unreadChatMessages === 'number'
      ? payload.unreadChatMessages
      : typeof payload.unreadChatMessages === 'string'
        ? Number(payload.unreadChatMessages) || 0
        : 0;

  return {
    contract,
    state,
    read,
    funded: true,
    unreadChatMessages: unread,
    paymentAddressTransactions: [],
  };
}
