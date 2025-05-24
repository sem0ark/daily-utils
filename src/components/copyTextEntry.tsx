import { useCallback, useEffect, useRef, useState } from "react";
import { CopyToClipboard } from "./buttons";


const usePasteFromClipboard = () => {
  const [isPasted, setIsPasted] = useState(false);
  const [text, setText] = useState("");

  const onClick = useCallback(async () => {
    try {
      const copiedText = await navigator.clipboard.readText();
      setIsPasted(true);
      setText(copiedText);
      setTimeout(() => setIsPasted(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [setIsPasted, setText]);

  return {
    onClick,
    isPasted,
    text,
  }
}

export const CopyTextEntry = ({
  onCopy,
  onPaste,
}: {
  onCopy: (text: string) => string;
  onPaste: (text: string) => string;
}) => {
  const { onClick: copyFromClipboard, text: pastedText, isPasted } = usePasteFromClipboard();
  const destinationRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getText = useCallback((): string => {
    if (!destinationRef.current) return "";
    const content = destinationRef.current.innerHTML ?? "";
    return onCopy(content);
  }, [onCopy]);

  useEffect(() => {
    if (!destinationRef.current) return;
    destinationRef.current.innerHTML = onPaste(pastedText ?? "");
  }, [onPaste, pastedText]);

  const handleBlur = useCallback(() => {
    if (!textareaRef.current) return;
    if (!destinationRef.current) return;
    destinationRef.current.innerHTML = onPaste(textareaRef.current.value ?? "");
  }, [onPaste]);

  return (
    <div className="relative min-h-32 rounded-xl border-2 border-neutral-500 p-2">
      <div className="flex w-full flex-col gap-2 px-2">
        <p className="font-bold text-blue-500">Enter your text here:</p>
        <textarea
          ref={textareaRef}
          name="entered text"
          className="w-full scroll-m-0 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-4 ring-0 outline-none"
          onBlur={handleBlur}
        ></textarea>

        <button
          onClick={copyFromClipboard}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-center text-xl font-bold text-blue-500 transition-all duration-400 hover:gap-4 hover:border-neutral-100 hover:text-blue-600"
        >
          {isPasted ? "Pasted!" : "Paste from Clipboard" }
        </button>

        <div className="absolute right-2 bottom-2 flex flex-col items-end gap-1 bg-transparent">
          <CopyToClipboard
            getText={getText}
          />
        </div>
      </div>

      <div
        ref={destinationRef}
        className={"w-full overflow-hidden p-2 text-[6px]"}
      ></div>
    </div>
  );
}
