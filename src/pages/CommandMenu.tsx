import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { NAVIGATION_CONFIG } from "./routes";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import * as Dialog from "@radix-ui/react-dialog";

const HISTORY_KEY = "cmd_history_v2";

export const CommandMenu = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: ((prev: boolean) => boolean) | boolean) => void;
}) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const sortedItems = useMemo(() => {
    return [...NAVIGATION_CONFIG].sort(
      (a, b) => history.indexOf(b.path) - history.indexOf(a.path),
    );
  }, [history]);

  const makeGoTo = useCallback(
    (path: string) => () => {
      const newHistory = [...history.filter((p) => p !== path), path];
      setHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

      navigate(path);
      setOpen(false);
    },
    [navigate, setOpen, history, setHistory],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isInInput = ["INPUT", "TEXTAREA"].includes(
        (e.target as HTMLElement).tagName,
      );

      if (
        ["k", "e", "p", "/"].includes(e.key) &&
        (e.metaKey || e.ctrlKey || !isInInput)
      ) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-900/50 pt-[20vh]"
    >
      <VisuallyHidden.Root>
        <Dialog.Title>Command pallette.</Dialog.Title>
        <Dialog.Description>
          Search for tools, navigate pages, and access recently used utilities.
        </Dialog.Description>
      </VisuallyHidden.Root>

      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <Command.Input
          autoFocus
          placeholder="Search for tools or pages..."
          className="w-full border-b border-neutral-200 p-4 text-lg outline-none"
        />

        <Command.List className="max-h-[500px] overflow-y-auto p-2">
          <Command.Empty className="p-4 text-sm text-neutral-500">
            No results found.
          </Command.Empty>

          <Command.Group
            heading="Navigation"
            className="flex flex-col gap-2 px-2 font-semibold text-neutral-500"
          >
            {sortedItems
              .filter((item) => item.showInCommandMenu)
              .map((item) => (
                <Command.Item
                  key={item.path}
                  value={`${item.name} ${item.tags.join(" ")} ${item.description}`}
                  onSelect={makeGoTo(item.path)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-neutral-700 transition-none aria-selected:bg-neutral-500 aria-selected:text-white"
                >
                  {<item.icon className="size-5" />}
                  <span>
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      {item.description && (
                        <span className="font-normal">{item.description}</span>
                      )}
                    </div>
                  </span>
                </Command.Item>
              ))}
          </Command.Group>
        </Command.List>

        <div className="flex items-center justify-between border-t-2 border-neutral-100 px-4 py-2 text-xs font-bold text-neutral-500">
          <span></span>
          <div className="flex gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
};
