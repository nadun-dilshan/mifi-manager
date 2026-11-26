import { Button, Card, Field, LoadGate, Notice, Screen, ToggleRow } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { confirm, useAction } from '@/hooks/useAction';
import { useDraft } from '@/hooks/useDraft';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { replaceHost } from '@/lib/client';
import { compareIp, isIPv4, isNetmask, sameSubnet } from '@/lib/format';
import type { DhcpInfo } from '@/lib/types';
import { space } from '@/theme';

function validate(d: DhcpInfo) {
  const gwip = isIPv4(d.gwip) ? null : 'Enter a valid IP address.';
  const netmask = isNetmask(d.netmask) ? null : 'Enter a valid subnet mask.';
  let start = isIPv4(d.ippoolstart) ? null : 'Enter a valid IP address.';
  let end = isIPv4(d.ippoolend) ? null : 'Enter a valid IP address.';
  if (!gwip && !netmask) {
    if (!start && !sameSubnet(d.ippoolstart, d.gwip, d.netmask)) {
      start = 'Must be in the same network as the router address.';
    }
    if (!end && !sameSubnet(d.ippoolend, d.gwip, d.netmask)) {
      end = 'Must be in the same network as the router address.';
    }
  }
  if (!start && !end && compareIp(d.ippoolstart, d.ippoolend) > 0) {
    end = 'Must not be lower than the first address.';
  }
  const lease = /^[1-9]\d{0,3}$/.test(d.leasetime.trim()) ? null : 'Enter a number of hours.';
  return { gwip, netmask, start, end, lease };
}

export default function LanScreen() {
  const auth = useAuth();
  const { data, error, loading, refreshing, refresh } = useRouterData(api.dhcp);
  const { draft, dirty, patch, commit } = useDraft(data);
  const { busy, run } = useAction();

  const errors = draft ? validate(draft) : null;
  const valid = errors !== null && Object.values(errors).every((e) => e === null);
  const addressChanged = draft !== null && data !== null && draft.gwip.trim() !== data.gwip;

  function save() {
    if (!draft) return;
    const cleaned: DhcpInfo = {
      ...draft,
      gwip: draft.gwip.trim(),
      netmask: draft.netmask.trim(),
      ippoolstart: draft.ippoolstart.trim(),
      ippoolend: draft.ippoolend.trim(),
      leasetime: draft.leasetime.trim(),
    };
    confirm({
      title: 'Apply LAN changes?',
      message: addressChanged
        ? `The router will move to ${cleaned.gwip} and restart its network. Every device will be disconnected for about a minute. The app will follow the router to its new address.`
        : 'The router will restart its network. Every device will be disconnected for about a minute.',
      confirmLabel: 'Apply',
      destructive: true,
      onConfirm: () =>
        run(async () => {
          await api.setDhcp(cleaned);
          commit(cleaned);
          if (addressChanged) {
            await replaceHost(cleaned.gwip);
            auth.setHost(cleaned.gwip);
          }
        }, 'LAN settings saved. The network is restarting.'),
    });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={draft !== null} onRetry={refresh}>
        {draft && errors ? (
          <>
            <Card style={{ gap: space.lg }}>
              <Field
                label="Router address"
                value={draft.gwip}
                onChangeText={(gwip) => patch({ gwip })}
                error={errors.gwip}
                keyboardType="numeric"
              />
              <Field
                label="Subnet mask"
                value={draft.netmask}
                onChangeText={(netmask) => patch({ netmask })}
                error={errors.netmask}
                keyboardType="numeric"
              />
            </Card>

            <Card style={{ gap: space.lg }}>
              <ToggleRow
                title="DHCP server"
                detail="Hands out IP addresses to devices that join. Turn off only if every device has a manual address."
                value={draft.dhcpserver}
                onValueChange={(dhcpserver) => patch({ dhcpserver })}
              />
              <Field
                label="First address"
                value={draft.ippoolstart}
                onChangeText={(ippoolstart) => patch({ ippoolstart })}
                error={errors.start}
                keyboardType="numeric"
              />
              <Field
                label="Last address"
                value={draft.ippoolend}
                onChangeText={(ippoolend) => patch({ ippoolend })}
                error={errors.end}
                keyboardType="numeric"
              />
              <Field
                label="Lease time (hours)"
                value={draft.leasetime}
                onChangeText={(leasetime) => patch({ leasetime })}
                error={errors.lease}
                keyboardType="number-pad"
              />
            </Card>

            {dirty ? (
              <Notice tone="warn">
                Saving restarts the router&apos;s network and disconnects every device for about a minute.
              </Notice>
            ) : null}
            <Button title="Save changes" onPress={save} loading={busy} disabled={!dirty || !valid} />
          </>
        ) : null}
      </LoadGate>
    </Screen>
  );
}
