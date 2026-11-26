import * as SecureStore from 'expo-secure-store';

/**
 * Low-level client for the hotspot's JSON API.
 *
 * Every command is a POST to `http://<host>/himiapi/json` with `{ cmdid, ...args, sessionId }`.
 * The device answers `{ reply: "ok", ... }`, `{ reply: "SessionOut" }` when the session is
 * missing or expired, and `{ reply: "error" }` when it refuses (for login: wrong credentials).
 *
 * The router's web server is single-threaded and locks up under bursts, so requests are
 * strictly serialised with a short pause between them.
 */

export const DEFAULT_HOST = '192.168.100.1';

const AUTH_KEY = 'mifi_auth';
const SESSION_KEY = 'mifi_session';
const REQUEST_GAP_MS = 150;
const DEFAULT_TIMEOUT_MS = 8000;

export type RouterErrorKind =
  /** Could not reach the router at all (wrong Wi-Fi, out of range, timed out). */
  | 'network'
  /** Reached it, but it sent nothing usable back. */
  | 'busy'
  /** The router refused the username or password. */
  | 'auth'
  /** No password available to sign in with. */
  | 'no-credentials'
  /** The router understood the command and refused it. */
  | 'rejected';

export class RouterError extends Error {
  readonly kind: RouterErrorKind;

  constructor(kind: RouterErrorKind, message: string) {
    super(message);
    this.name = 'RouterError';
    this.kind = kind;
  }
}

export interface Credentials {
  host: string;
  username: string;
  password: string;
}

export interface StoredAuth {
  host: string;
  username: string;
  /** Present only when "Remember me" was on. */
  password?: string;
  remember: boolean;
}

type ApiResponse = { reply?: string; [key: string]: unknown };

let credentials: Credentials | null = null;
let session = '';
let hydrated = false;
let chain: Promise<unknown> = Promise.resolve();
const authLostListeners = new Set<() => void>();

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs jobs one at a time, in order, regardless of whether earlier ones failed. */
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job);
  chain = run.then(
    () => delay(REQUEST_GAP_MS),
    () => delay(REQUEST_GAP_MS)
  );
  return run;
}

export function normalizeHost(input: string): string {
  const host = input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/[/#?].*$/, '');
  return host || DEFAULT_HOST;
}

async function post(
  host: string,
  body: Record<string, unknown>,
  sessionId: string,
  timeoutMs: number
): Promise<ApiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let text: string;
  try {
    const res = await fetch(`http://${host}/himiapi/json`, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
        Authorization: sessionId,
      },
      body: JSON.stringify({ ...body, sessionId }),
      signal: controller.signal,
    });
    text = await res.text();
  } catch {
    throw new RouterError(
      'network',
      "Can't reach the router. Make sure this phone is connected to the hotspot's Wi-Fi."
    );
  } finally {
    clearTimeout(timer);
  }

  if (!text.trim()) {
    throw new RouterError('busy', 'The router is busy and did not answer. Try again in a moment.');
  }
  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    throw new RouterError('busy', 'The router sent an answer the app could not read.');
  }
}

async function login(creds: Credentials, timeoutMs: number): Promise<string> {
  const res = await post(
    creds.host,
    { cmdid: 'login', username: creds.username, password: creds.password },
    '',
    timeoutMs
  );
  if (res.reply === 'ok' && typeof res.session === 'string' && res.session) {
    return res.session;
  }
  throw new RouterError('auth', 'The router did not accept that username or password.');
}

async function saveSession(host: string, value: string): Promise<void> {
  session = value;
  try {
    if (value) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ host, session: value }));
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  } catch {
    // The session is only a cache; losing it costs one extra login.
  }
}

export async function readStoredAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    if (typeof parsed.host !== 'string' || typeof parsed.username !== 'string') return null;
    return {
      host: parsed.host,
      username: parsed.username,
      password: typeof parsed.password === 'string' ? parsed.password : undefined,
      remember: parsed.remember === true,
    };
  } catch {
    return null;
  }
}

async function writeStoredAuth(auth: StoredAuth): Promise<void> {
  await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(auth));
}

/**
 * Loads the saved login (if any) into memory. Safe to call repeatedly; the app and the
 * widget task both call it before talking to the router.
 */
export async function hydrate(): Promise<StoredAuth | null> {
  const stored = await readStoredAuth();
  if (!hydrated) {
    hydrated = true;
    if (stored?.remember && stored.password) {
      credentials = { host: stored.host, username: stored.username, password: stored.password };
      try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        const saved = raw ? (JSON.parse(raw) as { host?: string; session?: string }) : null;
        if (saved?.host === stored.host && typeof saved.session === 'string') {
          session = saved.session;
        }
      } catch {
        // Start without a cached session.
      }
    }
  }
  return stored;
}

export function hasCredentials(): boolean {
  return credentials !== null;
}

/** True when the password in use is one of `candidates` (without exposing the password). */
export function passwordIsOneOf(candidates: string[]): boolean {
  return credentials !== null && candidates.includes(credentials.password);
}

export function currentHost(): string {
  return credentials?.host ?? DEFAULT_HOST;
}

/** Signs in with credentials the user just typed. Throws `RouterError` on failure. */
export function signIn(input: Credentials, remember: boolean): Promise<void> {
  const creds: Credentials = { ...input, host: normalizeHost(input.host) };
  return enqueue(async () => {
    const token = await login(creds, DEFAULT_TIMEOUT_MS);
    hydrated = true;
    credentials = creds;
    await saveSession(creds.host, token);
    await writeStoredAuth({
      host: creds.host,
      username: creds.username,
      password: remember ? creds.password : undefined,
      remember,
    });
  });
}

/** Drops the saved password so the next launch asks for it again. */
async function forgetPassword(): Promise<void> {
  const stored = await readStoredAuth();
  const host = credentials?.host ?? stored?.host ?? DEFAULT_HOST;
  const username = credentials?.username ?? stored?.username ?? 'admin';
  credentials = null;
  await saveSession(host, '');
  try {
    await writeStoredAuth({ host, username, remember: stored?.remember ?? true });
  } catch {
    // Nothing more we can do; the in-memory state is already cleared.
  }
}

export function signOut(): Promise<void> {
  return enqueue(async () => {
    if (credentials && session) {
      try {
        await post(credentials.host, { cmdid: 'logout' }, session, 4000);
      } catch {
        // Best effort: the session expires on its own.
      }
    }
    await forgetPassword();
  });
}

/** Called when a saved login stops working, so the UI can return to the sign-in screen. */
export function onAuthLost(listener: () => void): () => void {
  authLostListeners.add(listener);
  return () => {
    authLostListeners.delete(listener);
  };
}

async function reLogin(timeoutMs: number): Promise<void> {
  if (!credentials) {
    throw new RouterError('no-credentials', 'Sign in to continue.');
  }
  try {
    await saveSession(credentials.host, await login(credentials, timeoutMs));
  } catch (err) {
    if (err instanceof RouterError && err.kind === 'auth') {
      // The saved password no longer works: forget it and ask again.
      await forgetPassword();
      authLostListeners.forEach((listener) => listener());
    }
    throw err;
  }
}

export interface CallOptions {
  timeoutMs?: number;
}

/**
 * Sends one command, signing in first (or again) when the session is missing or expired.
 * Resolves with the full response when `reply` is "ok"; throws `RouterError` otherwise.
 */
export function call(
  cmdid: string,
  args: Record<string, unknown> = {},
  options: CallOptions = {}
): Promise<ApiResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return enqueue(async () => {
    const creds = credentials;
    if (!creds) {
      throw new RouterError('no-credentials', 'Sign in to continue.');
    }
    if (!session) {
      await reLogin(timeoutMs);
    }
    let res = await post(creds.host, { cmdid, ...args }, session, timeoutMs);
    if (res.reply === 'SessionOut') {
      await reLogin(timeoutMs);
      res = await post(creds.host, { cmdid, ...args }, session, timeoutMs);
    }
    if (res.reply !== 'ok') {
      throw new RouterError(
        'rejected',
        res.reply === 'SessionOut'
          ? 'The router keeps ending the session. Try again in a moment.'
          : 'The router refused that change.'
      );
    }
    return res;
  });
}

/** After the admin password is changed on the router, keep the saved login in step. */
export function replacePassword(password: string): Promise<void> {
  return enqueue(async () => {
    if (!credentials) return;
    credentials = { ...credentials, password };
    await saveSession(credentials.host, '');
    const stored = await readStoredAuth();
    if (stored?.remember) {
      await writeStoredAuth({ ...stored, password });
    }
  });
}

/** After the router's own address is changed, follow it to the new one. */
export function replaceHost(input: string): Promise<void> {
  const host = normalizeHost(input);
  return enqueue(async () => {
    if (!credentials) return;
    credentials = { ...credentials, host };
    await saveSession(host, '');
    const stored = await readStoredAuth();
    if (stored) {
      await writeStoredAuth({ ...stored, host });
    }
  });
}
