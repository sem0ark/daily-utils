import { useEffect, useState } from "react";

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
