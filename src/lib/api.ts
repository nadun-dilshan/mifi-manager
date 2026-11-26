import { call, type CallOptions } from './client';
import type {
  AllStatus,
  Apn,
  ApnInfo,
  ConDetect,
  ConnectedDevice,
  DhcpInfo,
  NetworkMode,
  Overview,
  ProduceInfo,
  RouterConfig,
  SimSet,
  SysInfo,
  UsbTether,
  WifiInfo,
} from './types';

async function read<T>(cmdid: string, options?: CallOptions): Promise<T> {
  const res = await call(cmdid, {}, options);
  return res.params as T;
}

async function write(cmdid: string, args: Record<string, unknown> = {}): Promise<void> {
  await call(cmdid, args);
}

export const api = {
  // Status
  config: async (): Promise<RouterConfig> => (await call('getconfig')) as unknown as RouterConfig,
  overview: (o?: CallOptions) => read<Overview>('getoverview', o),
  sysInfo: (o?: CallOptions) => read<SysInfo>('getsysinfo', o),
  allStatus: (o?: CallOptions) => read<AllStatus>('getallstatus', o),
  devices: async (o?: CallOptions): Promise<ConnectedDevice[]> => {
    const list = await read<ConnectedDevice[] | null>('getconnectedsta', o);
    return Array.isArray(list) ? list : [];
  },
  produceInfo: () => read<ProduceInfo>('getproduceinfo'),

  // Wi-Fi hotspot
  wifi: () => read<WifiInfo>('getwifiinfo'),
  setWifi: (params: WifiInfo) => write('setwifiinfo', { params }),
  openWifi: () => write('openwifiap'),
  closeWifi: () => write('closewifiap'),

  // Mobile network
  networkMode: () => read<NetworkMode>('getnetworkmode'),
  setNetworkMode: (netmode: string) => write('setnetworkmode', { params: { netmode } }),
  sim: () => read<SimSet>('getsimset'),
  setSim: (slot: number, password: string) =>
    write('setsimnum', { params: slot, params1: password }),
  usbTether: () => read<UsbTether>('gethimiusbtether'),
  setUsbTether: (on: boolean) => write('sethimiusbtether', { params: on ? '1' : '0' }),

  // APN
  apns: () => read<ApnInfo>('getapninfo'),
  useApn: (apn: Apn) => write('setcurrentapn', { params: apn }),
  createApn: (apn: Apn) => write('setnewapn', { params: apn }),

  // Connection check
  conDetect: () => read<ConDetect>('getcondetect'),
  setConDetect: (params: ConDetect) => write('setcondetect', { params }),

  // LAN
  dhcp: () => read<DhcpInfo>('getdhcpinfo'),
  setDhcp: (params: DhcpInfo) => write('setdhcpinfo', { params }),

  // System
  changePassword: (oldPwd: string, newPwd: string) =>
    write('changepwd', { params: { oldPwd, newPwd, confirmPwd: newPwd } }),
  reboot: () => write('rebootcmd', { params: 'reboot' }),
  factoryReset: () => write('rebootcmd', { params: 'freset' }),
};
