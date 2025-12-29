import { HomeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { Link, Outlet } from "react-router";
import { CommandMenu } from "./CommandMenu";
import { useOfflineStatus } from "../common/hooks";
import { WifiIcon } from "@heroicons/react/24/outline";

const isMac = () => {
  if (typeof window === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

const getModKey = () => (isMac() ? "⌘" : "Ctrl");

export const Layout = () => {
  const [open, setOpen] = useState(false);
  const isOnline = useOfflineStatus();

  return (
    <div className="m-0 min-h-dvh p-0">
      <div className="mx-auto mb-1 max-w-7xl">
        <nav className="flex flex-row gap-2 border-b-2 border-b-neutral-300 py-2">
          <Link to="/">
            <HomeIcon className="size-8 h-full transition-colors duration-200 hover:text-blue-500" />
          </Link>

          <span className="flex-1"></span>

          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-500 transition-all hover:border-neutral-400"
          >
            <MagnifyingGlassIcon className="size-4" />
            <span>Search tools...</span>
            <kbd className="ml-4 rounded border border-neutral-300 bg-white px-1.5 py-0.5 font-sans text-xs">
              <span>{getModKey()}</span>
              <span> + K/E</span>
            </kbd>
          </button>

          <div className="h-full p-2">
            <WifiIcon
              className={
                isOnline ? "size-5 text-neutral-500" : "size-5 text-red-500"
              }
              title={isOnline ? "Currently online." : "No internet connection."}
            />
          </div>
        </nav>
      </div>

      <CommandMenu open={open} setOpen={setOpen} />

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
};
