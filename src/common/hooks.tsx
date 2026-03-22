import { useCallback, useEffect, useRef, useState } from "react";

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    window.addEventListener("online", () => setIsOnline(true), { signal });
    window.addEventListener("offline", () => setIsOnline(false), { signal });

    return () => controller.abort();
  }, []);

  return isOnline;
}

export function useThrottle<T>(value: T, interval = 500) {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();

    if (lastUpdated.current && now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const id = window.setTimeout(() => {
        lastUpdated.current = now;
        setThrottledValue(value);
      }, interval);

      return () => window.clearTimeout(id);
    }
  }, [value, interval]);

  return throttledValue;
}

export const usePasteFromClipboard = () => {
  const [isPasted, setIsPasted] = useState(false);
  const [text, setText] = useState("");

  const onClick = useCallback(async () => {
    try {
      const copiedText = await navigator.clipboard.readText();
      setIsPasted(true);
      setText(copiedText);
      setTimeout(() => setIsPasted(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [setIsPasted, setText]);

  return {
    onClick,
    isPasted,
    text,
  };
};
