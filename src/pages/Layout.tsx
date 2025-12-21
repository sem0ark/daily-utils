import { HomeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { Link, Outlet } from "react-router";
import { CommandMenu } from "./CommandMenu";

const isMac = () => {
  if (typeof window === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

const getModKey = () => (isMac() ? "⌘" : "Ctrl");

export const Layout = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mx-auto mb-1 max-w-7xl">
        <nav className="flex flex-row gap-2 border-b-2 border-b-slate-300 py-2">
          <Link to="/">
            <HomeIcon className="size-8 h-full transition-colors duration-200 hover:text-blue-500" />
          </Link>

          <span className="flex-1"></span>

          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 transition-all hover:border-slate-400"
          >
            <MagnifyingGlassIcon className="size-4" />
            <span>Search tools...</span>
            <kbd className="ml-4 rounded border border-slate-300 bg-white px-1.5 font-sans text-xs shadow-sm">
              <span>{getModKey()}</span>
              <span> + K</span>
            </kbd>
          </button>
        </nav>
      </div>

      <CommandMenu open={open} setOpen={setOpen} />

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </>
  );
};
