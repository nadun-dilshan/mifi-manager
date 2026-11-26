import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { qrMatrix } from '@/lib/wifi-qr';

/** Blank border, in modules, that scanners need around a code. */
const QUIET_ZONE = 4;

interface QrCodeProps {
  value: string;
  size: number;
}

/** A QR code. Always black on white, whatever the theme, so cameras read it reliably. */
export function QrCode({ value, size }: QrCodeProps) {
  const drawing = useMemo(() => {
    try {
      const matrix = qrMatrix(value);
      const total = matrix.length + QUIET_ZONE * 2;
      let path = '';
      matrix.forEach((row, r) => {
        row.forEach((dark, col) => {
          if (dark) path += `M${col + QUIET_ZONE} ${r + QUIET_ZONE}h1v1h-1z`;
        });
      });
      return { total, path };
    } catch {
      // The library throws when the text is too long to fit in a code.
      return null;
    }
  }, [value]);

  if (!drawing) {
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          padding: 16,
        }}>
        <Text style={{ color: '#0F172A', textAlign: 'center' }}>
          These details are too long to fit in a QR code.
        </Text>
      </View>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${drawing.total} ${drawing.total}`}
      accessibilityLabel="QR code for joining the Wi-Fi network">
      <Rect x={0} y={0} width={drawing.total} height={drawing.total} fill="#FFFFFF" />
      <Path d={drawing.path} fill="#000000" />
    </Svg>
  );
}
