import { useCallback, useEffect, useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

const defaultClassName =
  "w-fit cursor-pointer rounded-lg border-2 border-neutral-200 bg-neutral-100 p-1 font-bold text-blue-500 transition-all hover:gap-4 hover:border-neutral-500 hover:text-blue-600";
const biggerClassName =
  "w-fit cursor-pointer rounded-lg border-2 border-neutral-200 bg-neutral-100 p-12 font-bold text-blue-500 transition-all hover:gap-4 hover:border-neutral-500 hover:text-blue-600";
const disabledClassName =
  "w-fit cursor-pointer rounded-lg border-2 border-neutral-200 bg-neutral-100 p-1 font-bold text-neutral-500 transition-all hover:gap-4 hover:border-neutral-500 hover:text-neutral-600";
const disabledBiggerClassName =
  "w-fit cursor-pointer rounded-lg border-2 border-neutral-200 bg-neutral-100 p-12 font-bold text-neutral-500 transition-all hover:gap-4 hover:border-neutral-500 hover:text-neutral-600";

export function CopyToClipboard({
  getText,
  bigger = false,
  disabled = false,
  enableHotkeys = false,
}: {
  getText: () => string | Promise<string>;
  bigger?: boolean;
  disabled?: boolean;
  enableHotkeys?: boolean;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const copy = useCallback(async () => {
    try {
      setIsLoading(true);
      const text = await getText();
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    } finally {
      setIsLoading(false);
    }
  }, [getText, setIsCopied]);

  useEffect(() => {
    if (disabled || isLoading || !enableHotkeys) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdC = (e.ctrlKey || e.metaKey) && e.key === "c";

      if (isCmdC) {
        // Only intercept if no text is manually selected.
        const hasSelection =
          (window.getSelection()?.toString().length ?? 0) > 0;
        if (!hasSelection) {
          e.preventDefault();
          copy();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copy, disabled, isLoading, enableHotkeys]);

  const isActuallyDisabled = disabled || isLoading;

  return (
    <button
      className={clsx(
        bigger && isActuallyDisabled && disabledBiggerClassName,
        bigger && !isActuallyDisabled && biggerClassName,
        !bigger && isActuallyDisabled && disabledClassName,
        !bigger && !isActuallyDisabled && defaultClassName,
      )}
      onClick={isActuallyDisabled ? undefined : copy}
    >
      {isLoading ? (
        <div className="flex size-10 items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-4 border-neutral-300 border-t-blue-500" />
        </div>
      ) : isCopied ? (
        <CheckIcon className="size-10" />
      ) : (
        <DocumentDuplicateIcon className="size-10" />
      )}
    </button>
  );
}
