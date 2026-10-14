import { createContext, useContext } from "react";

export interface LocalServerDiscovery {
  isAvailable: boolean;
  processors: string[];
}

export const LocalServerContext = createContext<LocalServerDiscovery>({
  isAvailable: false,
  processors: [],
});

export function useLocalServerDiscovery() {
  return useContext(LocalServerContext);
}
