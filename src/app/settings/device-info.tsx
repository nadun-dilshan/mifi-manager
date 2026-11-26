import * as Clipboard from 'expo-clipboard';
import { Text } from 'react-native';

import { useToast } from '@/components/toast';
import { Card, LoadGate, Row, Screen, SectionLabel } from '@/components/ui';
import { useRouterData } from '@/hooks/useRouterData';
import { api } from '@/lib/api';
import { formatUptime, toNumber } from '@/lib/format';
import { space, useColors } from '@/theme';

async function loadInfo() {
  const overview = await api.overview();
  const sys = await api.sysInfo();
  const produce = await api.produceInfo().catch(() => null);
  return { overview, sys, produce };
}

export default function DeviceInfoScreen() {
  const c = useColors();
  const toast = useToast();
  const { data, error, loading, refreshing, refresh } = useRouterData(loadInfo);
  const o = data?.overview;
  const sys = data?.sys;
  const produce = data?.produce;
  const temperature = toNumber(sys?.cputemp);

  const copy = (label: string, value: string | undefined) =>
    value
      ? async () => {
          await Clipboard.setStringAsync(value);
          toast.success(`${label} copied`);
        }
      : undefined;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <LoadGate loading={loading} error={error} hasData={data !== null} onRetry={refresh}>
        <SectionLabel>Router</SectionLabel>
        <Card style={{ paddingVertical: space.xs }}>
          <Row label="Firmware" value={o?.SYSVER} onLongPress={copy('Firmware version', o?.SYSVER)} />
          <Row label="Hardware" value={o?.HWVER} />
          <Row label="Web interface" value={o?.WEBVER} />
          <Row label="Serial number" value={o?.SN1} onLongPress={copy('Serial number', o?.SN1)} last />
        </Card>

        <SectionLabel>Mobile</SectionLabel>
        <Card style={{ paddingVertical: space.xs }}>
          <Row label="IMEI" value={o?.IMEI} onLongPress={copy('IMEI', o?.IMEI)} />
          <Row label="IMSI" value={o?.IMSI} onLongPress={copy('IMSI', o?.IMSI)} />
          <Row label="ICCID" value={o?.ICCID} onLongPress={copy('ICCID', o?.ICCID)} />
          <Row label="WAN IP" value={o?.WANIP} onLongPress={copy('WAN IP', o?.WANIP)} />
          <Row label="Cell ID" value={sys?.cellid} />
          <Row label="Base station ID" value={sys?.bsid} last />
        </Card>

        <SectionLabel>Status</SectionLabel>
        <Card style={{ paddingVertical: space.xs }}>
          <Row label="Router time" value={sys?.systime} />
          <Row label="Uptime" value={formatUptime(sys?.sysruntime)} />
          <Row label="CPU temperature" value={temperature !== null ? `${temperature}°C` : null} last />
        </Card>

        {produce ? (
          <>
            <SectionLabel>Factory checks</SectionLabel>
            <Card style={{ paddingVertical: space.xs }}>
              <Row
                label="Radio calibration"
                value={produce.calstatus === '1' ? 'Calibrated' : 'Not calibrated'}
              />
              <Row
                label="Wi-Fi test"
                value={produce.wificheckstatus === '1' ? 'Passed' : 'Not tested'}
                last
              />
            </Card>
          </>
        ) : null}

        <Text style={{ color: c.faint, fontSize: 13, textAlign: 'center' }}>
          Press and hold a value to copy it
        </Text>
      </LoadGate>
    </Screen>
  );
}
