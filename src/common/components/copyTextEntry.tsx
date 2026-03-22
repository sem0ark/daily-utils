import { useCallback, useEffect, useRef, useState } from "react";
import { CopyToClipboard } from "./buttons";
import { usePasteFromClipboard } from "../hooks";

export const CopyTextEntryDirect = ({
  onCopy,
  onPaste,
  enableHotkeys = true,
}: {
  onCopy: (text: string) => string;
  onPaste: (text: string) => string;
  enableHotkeys?: boolean;
}) => {
  const {
    onClick: copyFromClipboard,
    text: pastedText,
    isPasted,
  } = usePasteFromClipboard();
  const [latestText, setLatestText] = useState(pastedText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getText = useCallback((): string => {
    return onCopy(latestText);
  }, [onCopy, latestText]);

  useEffect(() => {
    setLatestText(onPaste(pastedText ?? ""));
  }, [onPaste, pastedText]);

  const handleBlur = useCallback(() => {
    if (!textareaRef.current) return;
    setLatestText(onPaste(textareaRef.current.value ?? ""));
  }, [onPaste]);

  return (
    <div className="relative min-h-32 rounded-xl border-2 border-neutral-500 p-2 pb-3">
      <div className="flex w-full flex-col gap-2 px-2">
        <p className="font-bold text-blue-500">Enter your text here:</p>

        <div className="flex w-full flex-row gap-2">
          <div className="flex w-full flex-col gap-2">
            <textarea
              autoFocus
              ref={textareaRef}
              name="entered text"
              className="w-full scroll-m-0 rounded-lg border-2 border-neutral-200 bg-neutral-100 p-4 ring-0 outline-none focus:border-neutral-500"
              onBlur={handleBlur}
            ></textarea>
            <button
              onClick={copyFromClipboard}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-neutral-200 bg-neutral-100 p-2 text-center text-xl font-bold text-blue-500 transition-all duration-200 hover:gap-4 hover:border-neutral-500 hover:text-blue-600"
            >
              {isPasted ? "Pasted!" : "Paste from Clipboard"}
            </button>
          </div>

          <CopyToClipboard
            enableHotkeys={enableHotkeys}
            getText={getText}
            bigger
          />
        </div>
      </div>
    </div>
  );
};
