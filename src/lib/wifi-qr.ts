import qrcode from 'qrcode-generator';

import type { WifiInfo } from './types';

/** UTF-8 bytes of a string, so non-Latin network names and passwords encode correctly. */
function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return bytes;
}

// The library defaults to Latin-1. Its built-in UTF-8 table exists only in some of its
// builds, so the encoder is supplied here instead of looked up.
qrcode.stringToBytes = utf8Bytes;

function escape(value: string): string {
  // Backslash, semicolon, comma, colon and double quote are special in the WIFI: format.
  return value.replace(/[\\;,:"]/g, (char) => `\\${char}`);
}

/** The text phones understand as "join this Wi-Fi network" when scanned. */
export function wifiQrPayload(wifi: Pick<WifiInfo, 'wifissid' | 'wifipass' | 'wifiauth' | 'wifibrocast'>): string {
  const open = wifi.wifiauth === '0';
  const parts = [`T:${open ? 'nopass' : 'WPA'}`, `S:${escape(wifi.wifissid)}`];
  if (!open) parts.push(`P:${escape(wifi.wifipass)}`);
  if (!wifi.wifibrocast) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}

/** QR modules as rows of booleans (true = dark). */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => qr.isDark(row, col))
  );
}
