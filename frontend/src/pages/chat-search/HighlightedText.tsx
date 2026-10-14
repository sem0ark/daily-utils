import type { RefObject } from "react";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function HighlightedText({
  text,
  query,
  firstMatchRef,
}: {
  text: string;
  query: string;
  firstMatchRef?: RefObject<HTMLElement | null>;
}) {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (terms.length === 0) return <>{text}</>;

  const parts = text.split(new RegExp(`(${terms.join("|")})`, "gi"));
  let hasMatch = false;

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = terms.some((term) =>
          new RegExp(`^${term}$`, "i").test(part),
        );
        if (!isMatch) return part;

        const ref = !hasMatch ? firstMatchRef : undefined;
        hasMatch = true;
        return (
          <mark
            key={`${part}-${index}`}
            ref={ref}
            className="rounded bg-yellow-200 px-0.5 text-neutral-900"
          >
            {part}
          </mark>
        );
      })}
    </>
  );
}
