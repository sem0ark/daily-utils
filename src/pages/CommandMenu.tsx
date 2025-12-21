import { Command } from "cmdk";
import { memo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

import { NAVIGATION_CONFIG } from "./routes";

const Item = memo(
  ({
    children,
    icon,
    onSelect,
  }: {
    children: React.ReactNode;
    icon: React.ReactNode;
    onSelect: () => void;
  }) => (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-neutral-700 transition-none aria-selected:bg-neutral-500 aria-selected:text-white"
    >
      {icon}
      <span>{children}</span>
    </Command.Item>
  ),
);

export const CommandMenu = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: ((prev: boolean) => boolean) | boolean) => void;
}) => {
  const navigate = useNavigate();

  const makeGoTo = useCallback(
    (path: string) => () => {
      navigate(path);
      setOpen(false);
    },
    [navigate, setOpen],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 pt-[20vh]"
    >
      <div className="w-full max-w-[640px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <Command.Input
          placeholder="Search for tools or pages..."
          className="w-full border-b border-slate-200 p-4 text-lg outline-none"
        />
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="p-4 text-sm text-slate-500">
            No results found.
          </Command.Empty>

          <Command.Group
            heading="Navigation"
            className="px-2 pb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase"
          >
            {NAVIGATION_CONFIG.map((item) => (
              <Item
                key={item.path}
                icon={<item.icon className="size-5" />}
                onSelect={makeGoTo(item.path)}
              >
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  {item.description && (
                    <span className="text-xs font-normal text-neutral-400">
                      {item.description}
                    </span>
                  )}
                </div>
              </Item>
            ))}
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
};
