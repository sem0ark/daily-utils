import { useCallback, useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/solid";

export function CopyToClipboard({ getText }: {
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
    <button className={"cursor-pointer w-fit rounded-lg border-2 border-neutral-500 bg-neutral-100 p-1 font-bold text-blue-500 transition-all hover:gap-4 hover:border-blue-600 hover:text-blue-600"} onClick={copy}>
      {isCopied ? (
        <CheckIcon className="size-10" />
      ) : (
        <DocumentDuplicateIcon className="size-10" />
      )}
    </button>
  );
}
