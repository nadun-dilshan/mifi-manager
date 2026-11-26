/** Response shapes of the hotspot's `himiapi/json` endpoint, as observed on firmware HMIFI_X8S1U1W1. */

export interface Overview {
  SYSVER: string;
  HWVER: string;
  WEBVER: string;
  SN1: string;
  IMEI: string;
  IMSI: string;
  ICCID: string;
  SSID: string;
  WANIP: string;
  SIGNAL: number;
}

export interface SysInfo {
  systime: string;
  bsid: string;
  cellid: string;
  cputemp: string;
  /** Seconds since boot. */
  sysruntime: number;
  wifinum: string;
  ethnum: string;
  batcap: string;
}

export interface AllStatus {
  signalStrength: number;
  carrier: string;
  internetState: string;
  imsi: string;
  simCardState: string;
  wifiapstatus: string;
}

export interface ConnectedDevice {
  devip: string;
  devname: string;
  devtype: number;
  devmac: string;
  devtypestr: string;
}

export interface WifiInfo {
  /** "open" or "close". */
  wifistate: string;
  wifissid: string;
  wifipass: string;
  wifichan: string;
  /** "0" none, "1" WPA-PSK, "4" WPA2-PSK. */
  wifiauth: string;
  wifibrocast: boolean;
}

export interface NetworkMode {
  /** "0" 4G/3G auto, "1" 4G only, "2" 3G only. */
  netmode: string;
}

export interface SimSet {
  spassw: string;
  /** Slot the router is set to use (0-based). */
  simset: number;
  /** Slot actually in use (0-based). */
  simcurrent: number;
}

export interface Apn {
  id: string;
  apnname: string;
  apn: string;
  pdptype: string;
  mmc: string;
  mnc: string;
  auth: string;
  username?: string;
  passw?: string;
  proxy?: string;
  port?: string;
}

export interface ApnInfo {
  apnlist: Apn[];
  /** Index into `apnlist`, or -1 when none is selected. */
  apncurrent: number;
}

export interface ConDetect {
  /** "0" disabled, "1" enabled. */
  state: string;
  ipaddr1: string;
  ipaddr2: string;
  ipaddr3: string;
}

export interface DhcpInfo {
  gwip: string;
  netmask: string;
  dhcpserver: boolean;
  ippoolstart: string;
  ippoolend: string;
  /** Lease time in hours. */
  leasetime: string;
}

export interface UsbTether {
  /** "0" off, "1" on. */
  usbstatus: string;
}

export interface ProduceInfo {
  calstatus: string;
  wificheckstatus: string;
}

export interface RouterConfig {
  simnum: number;
  simhaspwd: boolean;
  issdcard: boolean;
  isvpn: boolean;
  langindex: string;
}
