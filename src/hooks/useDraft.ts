import { useCallback, useState } from 'react';

export interface Draft<T> {
  /** The values being edited; null until the first load arrives. */
  draft: T | null;
  /** True when the draft differs from what the router last reported or accepted. */
  dirty: boolean;
  patch: (changes: Partial<T>) => void;
  /** Mark these values as saved. */
  commit: (saved: T) => void;
}

/**
 * Editable copy of settings loaded from the router. The first loaded value seeds the
 * draft; later background re-fetches never overwrite what the user is typing.
 */
export function useDraft<T extends object>(source: T | null): Draft<T> {
  const [base, setBase] = useState<T | null>(null);
  const [draft, setDraft] = useState<T | null>(null);

  if (source !== null && base === null) {
    setBase(source);
    setDraft(source);
  }

  const patch = useCallback((changes: Partial<T>) => {
    setDraft((current) => (current ? { ...current, ...changes } : current));
  }, []);

  const commit = useCallback((saved: T) => {
    setBase(saved);
    setDraft(saved);
  }, []);

  const dirty =
    draft !== null && base !== null && JSON.stringify(draft) !== JSON.stringify(base);

  return { draft, dirty, patch, commit };
}
