import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  type StyleProp,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, signalColor, space, useColors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/* ---------- Layout ---------- */

interface ScreenProps {
  children: ReactNode;
  /** Large title rendered in the content, for tab screens without a native header. */
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({ children, title, subtitle, refreshing, onRefresh }: ScreenProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: space.lg,
          paddingTop: title ? insets.top + space.lg : space.lg,
          paddingBottom: insets.bottom + space.xxl,
          gap: space.lg,
        }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
              tintColor={c.accent}
              colors={[c.accent]}
              progressBackgroundColor={c.card}
            />
          ) : undefined
        }>
        {title ? (
          <View style={{ gap: 2, marginBottom: space.xs }}>
            <Text style={{ color: c.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 }}>
              {title}
            </Text>
            {subtitle ? <Text style={{ color: c.sub, fontSize: 15 }}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          padding: space.lg,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const c = useColors();
  return (
    <Text
      style={{
        color: c.sub,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: -space.sm,
        marginLeft: space.xs,
      }}>
      {children}
    </Text>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

/* ---------- Rows ---------- */

interface RowProps {
  label: string;
  value?: string | null;
  onLongPress?: () => void;
  last?: boolean;
}

/** A label/value line inside a card. */
export function Row({ label, value, onLongPress, last }: RowProps) {
  const c = useColors();
  return (
    <Pressable
      onLongPress={onLongPress}
      disabled={!onLongPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.lg,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}>
      <Text style={{ color: c.sub, fontSize: 15 }}>{label}</Text>
      <Text
        selectable={false}
        numberOfLines={1}
        style={{ color: c.text, fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right' }}>
        {value && value.length > 0 ? value : '—'}
      </Text>
    </Pressable>
  );
}

interface NavRowProps {
  icon: IconName;
  title: string;
  detail?: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  last?: boolean;
  chevron?: boolean;
  /** Shows an "opens elsewhere" icon instead of the chevron, for links that leave the app. */
  external?: boolean;
}

export function NavRow({
  icon,
  title,
  detail,
  onPress,
  tone = 'default',
  last,
  chevron = true,
  external,
}: NavRowProps) {
  const c = useColors();
  const color = tone === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: c.border }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: 14,
        paddingHorizontal: space.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone === 'danger' ? c.dangerSoft : c.accentSoft,
        }}>
        <Ionicons name={icon} size={18} color={tone === 'danger' ? c.danger : c.accent} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color, fontSize: 16, fontWeight: '500' }}>{title}</Text>
        {detail ? (
          <Text numberOfLines={1} style={{ color: c.sub, fontSize: 13 }}>
            {detail}
          </Text>
        ) : null}
      </View>
      {external ? (
        <Ionicons name="open-outline" size={17} color={c.faint} />
      ) : chevron ? (
        <Ionicons name="chevron-forward" size={18} color={c.faint} />
      ) : null}
    </Pressable>
  );
}

/** A card whose rows run edge to edge (used for navigation lists). */
export function ListCard({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <View
      style={{
        backgroundColor: c.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        overflow: 'hidden',
      }}>
      {children}
    </View>
  );
}

interface ToggleRowProps {
  title: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({ title, detail, value, onValueChange, disabled }: ToggleRowProps) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '500' }}>{title}</Text>
        {detail ? <Text style={{ color: c.sub, fontSize: 13, lineHeight: 18 }}>{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: c.border, true: c.accent }}
        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
      />
    </View>
  );
}

/* ---------- Inputs ---------- */

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
  secret?: boolean;
}

export function Field({ label, error, hint, secret, ...input }: FieldProps) {
  const c = useColors();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.sub, fontSize: 13, fontWeight: '500' }}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.input,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error ? c.danger : focused ? c.accent : 'transparent',
        }}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={c.faint}
          selectionColor={c.accent}
          {...input}
          secureTextEntry={secret ? hidden : false}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={{
            flex: 1,
            color: c.text,
            fontSize: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
            ...(input.multiline ? { minHeight: 120, textAlignVertical: 'top' as const } : null),
          }}
        />
        {secret ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={c.sub} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={{ color: c.danger, fontSize: 13 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: c.sub, fontSize: 13 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface ChipsProps<T extends string> {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Single-choice selector shown as pills. */
export function Chips<T extends string>({ label, options, value, onChange, disabled }: ChipsProps<T>) {
  const c = useColors();
  return (
    <View style={{ gap: 8, opacity: disabled ? 0.5 : 1 }}>
      {label ? <Text style={{ color: c.sub, fontSize: 13, fontWeight: '500' }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{
                minWidth: 44,
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: radius.pill,
                backgroundColor: selected ? c.accent : c.input,
              }}>
              <Text
                style={{
                  color: selected ? c.onAccent : c.text,
                  fontSize: 14,
                  fontWeight: selected ? '600' : '500',
                }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- Buttons ---------- */

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon }: ButtonProps) {
  const c = useColors();
  const inactive = disabled || loading;
  const bg = variant === 'primary' ? c.accent : variant === 'danger' ? c.dangerSoft : c.input;
  const fg = variant === 'primary' ? c.onAccent : variant === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 50,
        paddingHorizontal: space.lg,
        borderRadius: radius.md,
        backgroundColor: bg,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ---------- Feedback ---------- */

interface NoticeProps {
  tone?: 'info' | 'warn' | 'danger';
  children: string;
  action?: { label: string; onPress: () => void };
}

export function Notice({ tone = 'info', children, action }: NoticeProps) {
  const c = useColors();
  const fg = tone === 'danger' ? c.danger : tone === 'warn' ? c.warn : c.accent;
  const bg = tone === 'danger' ? c.dangerSoft : tone === 'warn' ? c.warnSoft : c.accentSoft;
  const icon: IconName =
    tone === 'danger' ? 'alert-circle' : tone === 'warn' ? 'warning' : 'information-circle';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: bg,
        borderRadius: radius.md,
        padding: space.md,
      }}>
      <Ionicons name={icon} size={18} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{children}</Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={{ color: fg, fontSize: 14, fontWeight: '600' }}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

interface LoadGateProps {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
  children: ReactNode;
}

/**
 * Shows a spinner until the first load finishes and an error with retry if it failed.
 * Once there is data, later errors appear as a banner above the (stale) content.
 */
export function LoadGate({ loading, error, hasData, onRetry, children }: LoadGateProps) {
  const c = useColors();
  if (!hasData) {
    if (loading) {
      return (
        <View style={{ paddingVertical: 64, alignItems: 'center' }}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      );
    }
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center', gap: space.md }}>
        <Ionicons name="cloud-offline-outline" size={40} color={c.faint} />
        <Text style={{ color: c.sub, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
          {error ?? 'Nothing to show.'}
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="Try again" variant="secondary" onPress={onRetry} icon="refresh" />
        </View>
      </View>
    );
  }
  return (
    <>
      {error ? (
        <Notice tone="warn" action={{ label: 'Try again', onPress: onRetry }}>
          {error}
        </Notice>
      ) : null}
      {children}
    </>
  );
}

/* ---------- Data display ---------- */

export function SignalBars({ level, size = 28, known = true }: { level: number; size?: number; known?: boolean }) {
  const c = useColors();
  const on = known ? signalColor(c, level) : c.faint;
  const width = size * 0.17;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.09, height: size }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width,
            height: size * (0.34 + 0.22 * i),
            borderRadius: width * 0.35,
            backgroundColor: i < level ? on : c.border,
          }}
        />
      ))}
    </View>
  );
}

interface StatProps {
  icon: IconName;
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'danger';
  /** Small extra line under the label, e.g. an estimate. */
  detail?: string;
}

export function Stat({ icon, label, value, tone = 'default', detail }: StatProps) {
  const c = useColors();
  const valueColor = tone === 'danger' ? c.danger : tone === 'warn' ? c.warn : c.text;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        padding: space.lg,
        gap: space.sm,
      }}>
      <Ionicons name={icon} size={20} color={c.accent} />
      <Text style={{ color: valueColor, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>
        {value}
      </Text>
      <Text style={{ color: c.sub, fontSize: 13 }}>{label}</Text>
      {detail ? <Text style={{ color: c.faint, fontSize: 12 }}>{detail}</Text> : null}
    </View>
  );
}

export function Pill({ label, tone }: { label: string; tone: 'success' | 'warn' | 'danger' | 'neutral' }) {
  const c = useColors();
  const fg =
    tone === 'success' ? c.success : tone === 'warn' ? c.warn : tone === 'danger' ? c.danger : c.sub;
  const bg =
    tone === 'success'
      ? c.successSoft
      : tone === 'warn'
        ? c.warnSoft
        : tone === 'danger'
          ? c.dangerSoft
          : c.input;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: bg,
      }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Text style={{ color: fg, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
