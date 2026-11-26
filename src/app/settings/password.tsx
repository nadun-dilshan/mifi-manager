import { router } from 'expo-router';
import { useState } from 'react';

import { useToast } from '@/components/toast';
import { Button, Card, Field, Notice, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { replacePassword, RouterError } from '@/lib/client';
import { errorMessage } from '@/lib/format';
import { space } from '@/theme';

export default function PasswordScreen() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = again.length > 0 && again !== next ? 'The passwords do not match.' : null;
  const canSubmit = current.length > 0 && next.length > 0 && next === again;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      // Keep the saved login working so the app does not ask for the new password.
      await replacePassword(next);
      toast.success('Admin password changed');
      router.back();
    } catch (err) {
      setError(
        err instanceof RouterError && err.kind === 'rejected'
          ? 'The router refused the change. Check that the current password is right.'
          : errorMessage(err)
      );
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Notice>
        This is the password for signing in to the router&apos;s settings, not the Wi-Fi password.
      </Notice>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Card style={{ gap: space.lg }}>
        <Field
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secret
          editable={!busy}
        />
        <Field
          label="New password"
          value={next}
          onChangeText={setNext}
          secret
          editable={!busy}
          hint="Pick something other than the default printed on the router."
        />
        <Field
          label="Confirm new password"
          value={again}
          onChangeText={setAgain}
          secret
          editable={!busy}
          error={mismatch}
        />
      </Card>
      <Button title="Change password" onPress={submit} loading={busy} disabled={!canSubmit} />
    </Screen>
  );
}
