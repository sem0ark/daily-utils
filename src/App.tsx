import {
  HashRouter,
  Outlet,
  Route,
  Routes,
  Link,
  useNavigate,
  useLocation,
} from "react-router";

import { EchoText } from "./pages/EchoText";

import { HomeIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { TextToPrompt } from "./pages/TextToPrompt";
import { FormatMarkdown } from "./pages/FormatMarkdown";

const ROUTE_PATHS = ["/echo", "/prompts", "/markdown"];

function useKeyboardNavigation(routes_list: string[]) {
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

function Layout() {
  useKeyboardNavigation(ROUTE_PATHS);

  return (
    <>
      <div className="mx-auto mb-1 max-w-7xl">
        <nav className="flex flex-row gap-2 border-b-2 border-b-slate-300 p-2">
          <Link to="/">
            <HomeIcon className="size-8 h-full transition-colors duration-200 hover:text-blue-500" />
          </Link>
        </nav>
      </div>

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </>
  );
}

function Card({
  name,
  path,
  children,
}: PropsWithChildren<{ name: string; path: string }>) {
  return (
    <Link
      to={path}
      title={"Go to " + name}
      className="group/card mx-auto w-full max-w-lg rounded-lg border-2 border-neutral-500 bg-neutral-50 p-4 hover:bg-white"
    >
      <h2 className="text-xl font-bold text-blue-500">{name}</h2>

      <div className="flex w-full flex-col p-2">{children}</div>

      <div
        className="flex items-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-xl font-bold text-blue-500 transition-all group-hover/card:gap-4 group-hover/card:border-neutral-100 group-hover/card:text-blue-600"
        title={"Go to " + name}
      >
        GO <ArrowRightIcon className="inline size-6" />
      </div>
    </Link>
  );
}

function Home() {
  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">
        Daily Utils
      </h1>
      <div className="grid items-center gap-16">
        <Card name="Echo text" path="/echo">
          Utility script that just outputs the text back to the user in order to
          translate it with Google Translate plugin. It is useful because like
          that there will be no character limit that breaks the translation.
        </Card>

        <Card name="Text to promts" path="/prompts">
          It includes functionality to copy the processed text to clipboard,
          optionally wrapped into a custom text for prompts.
        </Card>

        <Card name="Fromat markdown" path="/markdown">
          Fromat markdown to not use * for lists and replace _ for italics.
        </Card>
      </div>
    </>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="echo" element={<EchoText />} />
          <Route path="prompts" element={<TextToPrompt />} />
          <Route path="markdown" element={<FormatMarkdown />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
