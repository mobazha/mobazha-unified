'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '../services/api/wallet';
import type { ReceivingAccountInput } from '../services/api/wallet';
import { queryKeys } from './queryKeys';

export function useReceivingAccounts() {
  return useQuery({
    queryKey: queryKeys.receivingAccounts.list(),
    queryFn: () => walletApi.getReceivingAccounts(),
  });
}

export function useAddReceivingAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReceivingAccountInput) => walletApi.addReceivingAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receivingAccounts.all });
    },
  });
}

export function useUpdateReceivingAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ReceivingAccountInput }) =>
      walletApi.updateReceivingAccount(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receivingAccounts.all });
    },
  });
}

export function useDeleteReceivingAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => walletApi.deleteReceivingAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receivingAccounts.all });
    },
  });
}
