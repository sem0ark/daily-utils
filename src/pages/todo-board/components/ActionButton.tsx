import React, { forwardRef } from "react";
import {
  TrashIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export type ActionProps = {
  activeClassName?: string;
  hoverClassName?: string;
  grab?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
} & React.HTMLAttributes<HTMLButtonElement>;

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
  (
    { className, hoverClassName, activeClassName, grab, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      {...props}
      className={clsx(
        "relative flex items-center justify-center rounded p-1",
        "transition-all duration-100 ease-in-out",
        "border-neutral-500 bg-neutral-100 text-neutral-600",
        "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none",

        grab ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",

        activeClassName ?? "active:scale-95 active:bg-neutral-200",
        hoverClassName,
        className,
      )}
      tabIndex={0}
    >
      {children}
    </button>
  ),
);

export const Handle = forwardRef<HTMLButtonElement, ActionProps>(
  (props, ref) => {
    return (
      <Action
        ref={ref}
        data-cypress="draggable-handle"
        grab={true}
        className="border-none bg-transparent text-neutral-400"
        {...props}
      >
        <div className="flex">
          <EllipsisVerticalIcon className="-mr-3 size-4" />
          <EllipsisVerticalIcon className="size-4" />
        </div>
      </Action>
    );
  },
);

export function Remove(props: ActionProps) {
  return (
    <Action
      hoverClassName="hover:border-red-500 hover:bg-white hover:text-red-500"
      activeClassName="active:bg-red-50"
      {...props}
    >
      <TrashIcon className="size-4" />
    </Action>
  );
}

export function AddNew(props: ActionProps) {
  return (
    <Action
      hoverClassName="hover:border-blue-500 hover:bg-white hover:text-blue-500"
      activeClassName="active:bg-blue-50"
      {...props}
    >
      <PlusIcon className="size-4" />
    </Action>
  );
}

export function Edit(props: ActionProps) {
  return (
    <Action
      hoverClassName="hover:border-blue-500 hover:bg-white hover:text-blue-500"
      activeClassName="active:bg-blue-50"
      {...props}
    >
      <PencilSquareIcon className="size-4" />
    </Action>
  );
}
