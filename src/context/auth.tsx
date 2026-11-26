import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as client from '@/lib/client';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  host: string;
  username: string;
  /** Last "Remember me" choice, used to pre-set the switch on the sign-in screen. */
  remember: boolean;
  /** Shown on the sign-in screen when the app had to sign the user out itself. */
  notice: string | null;
}

interface AuthApi extends AuthState {
  signIn: (creds: client.Credentials, remember: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  /** Update the displayed router address after it has been changed. */
  setHost: (host: string) => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    host: client.DEFAULT_HOST,
    username: 'admin',
    remember: true,
    notice: null,
  });

  // Restore a remembered login without asking for the password again.
  useEffect(() => {
    let cancelled = false;
    client.hydrate().then((stored) => {
      if (cancelled) return;
      setState({
        status: client.hasCredentials() ? 'signedIn' : 'signedOut',
        host: stored?.host ?? client.DEFAULT_HOST,
        username: stored?.username ?? 'admin',
        remember: stored?.remember ?? true,
        notice: null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A saved password that the router now rejects sends the user back to sign in.
  useEffect(
    () =>
      client.onAuthLost(() => {
        setState((s) => ({
          ...s,
          status: 'signedOut',
          notice: 'Your saved password no longer works. Please sign in again.',
        }));
      }),
    []
  );

  const signIn = useCallback(async (creds: client.Credentials, remember: boolean) => {
    await client.signIn(creds, remember);
    setState({
      status: 'signedIn',
      host: client.currentHost(),
      username: creds.username,
      remember,
      notice: null,
    });
  }, []);

  const signOut = useCallback(async () => {
    await client.signOut();
    setState((s) => ({ ...s, status: 'signedOut', notice: null }));
  }, []);

  const setHost = useCallback((host: string) => {
    setState((s) => ({ ...s, host }));
  }, []);

  const value = useMemo<AuthApi>(
    () => ({ ...state, signIn, signOut, setHost }),
    [state, signIn, signOut, setHost]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
