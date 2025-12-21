import { useEffect, useRef, useState } from "react";

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
