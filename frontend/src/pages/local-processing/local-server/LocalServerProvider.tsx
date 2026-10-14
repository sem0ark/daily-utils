import { PropsWithChildren, useEffect, useState } from "react";
import { localApi } from "./api";
import { LocalServerContext } from "./localServerContext";
import type { LocalServerHealthResponse } from "./types";

export function LocalServerProvider({ children }: PropsWithChildren) {
  const [health, setHealth] = useState<LocalServerHealthResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const response = await localApi.getHealth();
      if (mounted) setHealth(response);
    };
    void check();
    const interval = window.setInterval(check, 5000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <LocalServerContext.Provider
      value={{
        isAvailable: health !== null,
        processors: health?.processors ?? [],
      }}
    >
      {children}
    </LocalServerContext.Provider>
  );
}
