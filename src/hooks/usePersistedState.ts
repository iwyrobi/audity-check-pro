import { useState, useEffect, useCallback, useRef } from "react";

/**
 * A hook that persists state to sessionStorage so it survives
 * focus-loss, tab switches, and soft reloads (common on mobile PWAs).
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return initialValue;
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage full – ignore
    }
  }, [key, state]);

  // Also persist on visibility change (before browser may discard the page)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        try {
          sessionStorage.setItem(key, JSON.stringify(stateRef.current));
        } catch {
          // ignore
        }
      }
    };

    const handleBeforeUnload = () => {
      try {
        sessionStorage.setItem(key, JSON.stringify(stateRef.current));
      } catch {
        // ignore
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [key]);

  const clear = useCallback(() => {
    sessionStorage.removeItem(key);
  }, [key]);

  return [state, setState, clear];
}
