import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, useColors } from '@/theme';

type ToastTone = 'success' | 'error';

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({ success: () => {}, error: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone; id: number } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, tone: ToastTone) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone, id: Date.now() });
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(
        () => {
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
            ({ finished }) => {
              if (finished) setToast(null);
            }
          );
        },
        tone === 'error' ? 4200 : 2600
      );
    },
    [opacity]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + 84,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 13,
            borderRadius: radius.md,
            backgroundColor: c.scheme === 'dark' ? '#F1F5F9' : '#0F172A',
            opacity,
            transform: [
              { translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
            elevation: 6,
          }}>
          <Ionicons
            name={toast.tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color={toast.tone === 'success' ? '#22C55E' : '#EF4444'}
          />
          <Text
            style={{
              flex: 1,
              color: c.scheme === 'dark' ? '#0F172A' : '#F8FAFC',
              fontSize: 14,
              fontWeight: '500',
              lineHeight: 19,
            }}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
