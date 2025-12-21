import { Link } from "react-router";

import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { PropsWithChildren } from "react";

export const Card = ({
  name,
  path,
  children,
}: PropsWithChildren<{ name: string; path: string }>) => (
  <Link
    to={path}
    title={"Go to " + name}
    className="group/card mx-auto flex w-full max-w-lg flex-col rounded-lg border-2 border-neutral-500 bg-neutral-50 p-4 hover:bg-white"
  >
    <h2 className="text-xl font-bold text-blue-500">{name}</h2>

    <div className="flex w-full flex-col p-2">{children}</div>

    <span className="flex-1"></span>

    <div
      className="flex items-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 px-4 py-2 text-xl font-bold text-blue-500 transition-all group-hover/card:gap-4 group-hover/card:border-neutral-100 group-hover/card:text-blue-600 group-focus/card:gap-4 group-focus/card:border-neutral-100 group-focus/card:text-blue-600"
      title={"Go to " + name}
    >
      GO <ArrowRightIcon className="inline size-6" />
    </div>
  </Link>
);
