import { Link } from "wouter";

import { PropsWithChildren } from "react";

export const Card = ({
  name,
  path,
  children,
}: PropsWithChildren<{ name: string; path: string }>) => (
  <Link
    href={path}
    title={"Go to " + name}
    className="mx-auto flex w-full max-w-lg flex-col rounded-lg border-2 border-neutral-500 bg-neutral-50 p-4 hover:cursor-pointer hover:bg-white"
  >
    <h2 className="text-xl font-bold text-blue-500">{name}</h2>
    <div className="flex w-full flex-col">{children}</div>
  </Link>
);
