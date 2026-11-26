import { useColorScheme } from 'react-native';

export interface Colors {
  scheme: 'light' | 'dark';
  bg: string;
  card: string;
  input: string;
  border: string;
  text: string;
  sub: string;
  faint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  /** Line colour for single-series charts; checked for contrast against `card`. */
  chart: string;
}

export const light: Colors = {
  scheme: 'light',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  input: '#F1F3F6',
  border: '#E6E8EC',
  text: '#0F172A',
  sub: '#64748B',
  faint: '#94A3B8',
  accent: '#4F46E5',
  accentSoft: '#EEF2FF',
  onAccent: '#FFFFFF',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warn: '#D97706',
  warnSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  chart: '#4F46E5',
};

export const dark: Colors = {
  scheme: 'dark',
  bg: '#0A0D14',
  card: '#141924',
  input: '#1B2230',
  border: '#222A38',
  text: '#F1F5F9',
  sub: '#94A3B8',
  faint: '#64748B',
  accent: '#818CF8',
  accentSoft: '#1E2140',
  onAccent: '#0A0D14',
  success: '#34D399',
  successSoft: '#0F2A22',
  warn: '#FBBF24',
  warnSoft: '#2E2410',
  danger: '#F87171',
  dangerSoft: '#321618',
  chart: '#7C87F7',
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

/** Colour for a 0–4 bar signal level. */
export function signalColor(c: Colors, level: number): string {
  if (level >= 3) return c.success;
  if (level === 2) return c.warn;
  return c.danger;
}
