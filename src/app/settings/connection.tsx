import { Text } from 'react-native';

import { Button, Card, Field, LoadGate, Screen, ToggleRow } from '@/components/ui';
import { useAction } from '@/hooks/useAction';
import { useDraft } from '@/hooks/useDraft';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import type { ConDetect } from '@/lib/types';
import { space, useColors } from '@/theme';

const ADDRESS = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;

function addressError(value: string): string | null {
  return ADDRESS.test(value.trim()) ? null : 'Enter an IP address or host name.';
}

export default function ConnectionScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh } = useRouterData(api.conDetect);
  const { draft, dirty, patch, commit } = useDraft(data);
  const { busy, run } = useAction();

  const errors = draft
    ? [addressError(draft.ipaddr1), addressError(draft.ipaddr2), addressError(draft.ipaddr3)]
    : [null, null, null];
  const valid = errors.every((e) => e === null);

  function save() {
    if (!draft) return;
    const cleaned: ConDetect = {
      ...draft,
      ipaddr1: draft.ipaddr1.trim(),
      ipaddr2: draft.ipaddr2.trim(),
      ipaddr3: draft.ipaddr3.trim(),
    };
    void run(async () => {
      await api.setConDetect(cleaned);
      commit(cleaned);
    }, 'Connection check saved');
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={draft !== null} onRetry={refresh}>
        {draft ? (
          <>
            <Card style={{ gap: space.lg }}>
              <ToggleRow
                title="Connection check"
                detail="The router regularly tests these addresses to notice when mobile data has dropped."
                value={draft.state === '1'}
                onValueChange={(on) => patch({ state: on ? '1' : '0' })}
              />
            </Card>
            <Card style={{ gap: space.lg }}>
              <Field
                label="Address 1"
                value={draft.ipaddr1}
                onChangeText={(ipaddr1) => patch({ ipaddr1 })}
                error={errors[0]}
                keyboardType="url"
              />
              <Field
                label="Address 2"
                value={draft.ipaddr2}
                onChangeText={(ipaddr2) => patch({ ipaddr2 })}
                error={errors[1]}
                keyboardType="url"
              />
              <Field
                label="Address 3"
                value={draft.ipaddr3}
                onChangeText={(ipaddr3) => patch({ ipaddr3 })}
                error={errors[2]}
                keyboardType="url"
              />
              <Text style={{ color: c.sub, fontSize: 13, lineHeight: 18 }}>
                Use addresses that are always online, such as public DNS servers.
              </Text>
            </Card>
            <Button title="Save changes" onPress={save} loading={busy} disabled={!dirty || !valid} />
          </>
        ) : null}
      </LoadGate>
    </Screen>
  );
}
