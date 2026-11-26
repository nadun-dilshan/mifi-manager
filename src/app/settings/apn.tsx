import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  Button,
  Card,
  Chips,
  Field,
  ListCard,
  LoadGate,
  Notice,
  Screen,
  SectionLabel,
} from '@/components/ui';
import { confirm, useAction } from '@/hooks/useAction';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { APN_AUTH_OPTIONS, PDP_OPTIONS } from '@/lib/format';
import type { Apn } from '@/lib/types';
import { space, useColors } from '@/theme';

function pdpLabel(pdptype: string): string {
  return PDP_OPTIONS.find((o) => o.value === pdptype)?.label ?? pdptype;
}

const EMPTY_FORM = {
  apnname: '',
  apn: '',
  pdptype: 'IP',
  auth: '0',
  username: '',
  passw: '',
  proxy: '',
  port: '',
};

export default function ApnScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh, reload } = useRouterData(api.apns);
  const { busy, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const list = data?.apnlist ?? [];
  const currentIndex = data?.apncurrent ?? -1;
  const current: Apn | undefined = list[currentIndex];

  const portError =
    form.port.length > 0 && !/^\d{1,5}$/.test(form.port) ? 'Enter a port number.' : null;
  const canCreate = form.apnname.trim().length > 0 && form.apn.trim().length > 0 && !portError;

  function select(apn: Apn, index: number) {
    if (index === currentIndex || busy) return;
    confirm({
      title: `Use “${apn.apnname}”?`,
      message: `Mobile data will reconnect using the access point “${apn.apn}”.`,
      confirmLabel: 'Use this APN',
      onConfirm: async () => {
        const ok = await run(() => api.useApn(apn), 'APN changed');
        if (ok) await reload();
      },
    });
  }

  async function create() {
    // New entries inherit the operator codes of the APN in use, as the router's own page does.
    const apn: Apn = {
      id: '0',
      apnname: form.apnname.trim(),
      apn: form.apn.trim(),
      pdptype: form.pdptype,
      mmc: current?.mmc ?? '-1',
      mnc: current?.mnc ?? '-1',
      auth: form.auth,
      username: form.auth === '0' ? '' : form.username,
      passw: form.auth === '0' ? '' : form.passw,
      proxy: form.proxy.trim(),
      port: form.port.trim(),
    };
    const ok = await run(() => api.createApn(apn), 'APN added');
    if (ok) {
      setAdding(false);
      setForm(EMPTY_FORM);
      await reload();
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={data !== null} onRetry={refresh}>
        <SectionLabel>Access points</SectionLabel>
        {list.length === 0 ? (
          <Card>
            <Text style={{ color: c.sub, fontSize: 15 }}>The router has no APNs for this SIM.</Text>
          </Card>
        ) : (
          <ListCard>
            {list.map((apn, index) => {
              const selected = index === currentIndex;
              return (
                <Pressable
                  key={`${apn.id}-${index}`}
                  onPress={() => select(apn, index)}
                  android_ripple={{ color: c.border }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    padding: space.lg,
                    borderBottomWidth: index === list.length - 1 ? 0 : 1,
                    borderBottomColor: c.border,
                  }}>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? c.accent : c.faint}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{apn.apnname}</Text>
                    <Text style={{ color: c.sub, fontSize: 13 }}>
                      {apn.apn} · {pdpLabel(apn.pdptype)}
                    </Text>
                  </View>
                  {selected ? (
                    <Text style={{ color: c.accent, fontSize: 12, fontWeight: '700' }}>IN USE</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ListCard>
        )}

        {adding ? (
          <>
            <SectionLabel>New APN</SectionLabel>
            <Card style={{ gap: space.lg }}>
              <Notice tone="warn">
                The router offers no way to delete an APN afterwards, so add only ones you need.
              </Notice>
              <Field
                label="Name"
                value={form.apnname}
                onChangeText={(apnname) => setForm((f) => ({ ...f, apnname }))}
                placeholder="My operator"
              />
              <Field
                label="APN"
                value={form.apn}
                onChangeText={(apn) => setForm((f) => ({ ...f, apn }))}
                placeholder="internet"
              />
              <Chips
                label="IP type"
                options={PDP_OPTIONS}
                value={form.pdptype}
                onChange={(pdptype) => setForm((f) => ({ ...f, pdptype }))}
              />
              <Chips
                label="Authentication"
                options={APN_AUTH_OPTIONS}
                value={form.auth}
                onChange={(auth) => setForm((f) => ({ ...f, auth }))}
              />
              {form.auth !== '0' ? (
                <>
                  <Field
                    label="Username"
                    value={form.username}
                    onChangeText={(username) => setForm((f) => ({ ...f, username }))}
                  />
                  <Field
                    label="Password"
                    value={form.passw}
                    onChangeText={(passw) => setForm((f) => ({ ...f, passw }))}
                    secret
                  />
                </>
              ) : null}
              <Field
                label="Proxy (optional)"
                value={form.proxy}
                onChangeText={(proxy) => setForm((f) => ({ ...f, proxy }))}
              />
              <Field
                label="Port (optional)"
                value={form.port}
                onChangeText={(port) => setForm((f) => ({ ...f, port }))}
                keyboardType="number-pad"
                error={portError}
              />
              <Button title="Add APN" onPress={create} loading={busy} disabled={!canCreate} />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setAdding(false);
                  setForm(EMPTY_FORM);
                }}
                disabled={busy}
              />
            </Card>
          </>
        ) : (
          <Button title="Add an APN" variant="secondary" icon="add" onPress={() => setAdding(true)} />
        )}
      </LoadGate>
    </Screen>
  );
}
