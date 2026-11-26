import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/components/toast';
import { errorMessage } from '@/lib/format';

/**
 * Runs a change against the router with a busy flag and a toast for the outcome.
 * Resolves true when the change went through.
 */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (work: () => Promise<void>, successMessage?: string): Promise<boolean> => {
      setBusy(true);
      try {
        await work();
        if (successMessage) toast.success(successMessage);
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  return { busy, run };
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function confirm({ title, message, confirmLabel, destructive, onConfirm }: ConfirmOptions) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
