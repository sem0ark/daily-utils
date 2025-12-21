import { useNavigate, useLocation } from "react-router";

import { useCallback, useEffect, useState } from "react";

const ROUTE_PATHS = ["/echo", "/prompts", "/markdown"];

export function useKeyboardNavigation(routes_list: string[]) {
  const navigate = useNavigate();
  const location = useLocation();

  const [lastEntryPath, setLastEntryPath] = useState<string | null>(null);
  useEffect(() => {
    const currentPath = location.pathname.replace(/\/$/, "");
    if (ROUTE_PATHS.includes(currentPath)) {
      setLastEntryPath(currentPath);
    }
  }, [location.pathname]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!event.ctrlKey) return;

      const currentPath = location.pathname.replace(/\/$/, "");
      const currentIndex = routes_list.indexOf(currentPath);

      let nextPath: string | null = null;
      let handled = true;

      if (event.key === "ArrowUp") {
        // Ctrl + Up: Go to Home
        event.preventDefault(); // Prevent default action for cleaner handling
        nextPath = "/";
      } else if (event.key === "ArrowDown") {
        // Ctrl + Down: Go to last visited entry OR first entry
        if (
          currentPath === "/" ||
          currentPath === "/home" ||
          currentIndex === -1
        ) {
          event.preventDefault(); // Prevent default action
          // Navigate to the last entry path, or the default first entry (/echo)
          nextPath = lastEntryPath || routes_list[0];
        } else {
          handled = false; // Only handle Ctrl+Down when at Home
        }
      } else if (event.key === "ArrowRight") {
        // Ctrl + Right: Next entry (Cyclical)
        event.preventDefault();
        if (currentIndex === -1) return;

        const nextIndex = (currentIndex + 1) % routes_list.length;
        nextPath = routes_list[nextIndex];
      } else if (event.key === "ArrowLeft") {
        // Ctrl + Left: Previous entry (Cyclical)
        event.preventDefault();
        if (currentIndex === -1) return;

        const prevIndex =
          (currentIndex - 1 + routes_list.length) % routes_list.length;
        nextPath = routes_list[prevIndex];
      } else {
        handled = false;
      }

      if (handled && nextPath && nextPath !== currentPath) {
        navigate(nextPath);
      }
    },
    [location.pathname, navigate, lastEntryPath, routes_list],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
