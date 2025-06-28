import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { PropsWithChildren } from "react";
import { Link } from "react-router";

export const LinkCard = ({
  name,
  path,
  children,
}: PropsWithChildren<{ name: string; path: string }>) => (
  <Link to={path} className="group mx-auto w-full max-w-lg rounded-lg border-2 border-neutral-500 bg-neutral-50 p-4">
    <div
      className="text-xl font-bold text-blue-500"
      title={"Go to " + name}
    >
      {name}
    </div>

    <div className="flex w-full flex-col p-2">{children}</div>

    <div
      className="flex items-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-xl font-bold text-blue-500 transition-all group-hover:gap-4 group-hover:border-neutral-100 group-hover:text-blue-600"
      title={"Go to " + name}
    >
      GO <ArrowRightIcon className="inline size-6" />
    </div>
  </Link>
);
