import { useCallback, useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/solid";
import { twMerge } from "tailwind-merge";

export function CopyToClipboard({
  getText,
  className,
}: {
  getText: () => string;
  className?: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [getText, setIsCopied]);

  return (
    <button
      className={twMerge(
        "w-fit cursor-pointer rounded-lg border-2 border-neutral-200 bg-neutral-100 p-1 font-bold text-blue-500 transition-all hover:gap-4 hover:border-neutral-500 hover:text-blue-600",
        className,
      )}
      onClick={copy}
    >
      {isCopied ? (
        <CheckIcon className="size-10" />
      ) : (
        <DocumentDuplicateIcon className="size-10" />
      )}
    </button>
  );
}
