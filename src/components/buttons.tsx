import { useCallback, useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/solid";

export function CopyToClipboard({
  getText,
  className = "",
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
    <button className={"cursor-pointer " + className} onClick={copy}>
      {isCopied ? (
        <CheckIcon className="size-6" />
      ) : (
        <DocumentDuplicateIcon className="size-6" />
      )}
    </button>
  );
}
