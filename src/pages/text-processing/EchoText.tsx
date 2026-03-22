import { useRef, useCallback, useEffect, useState } from "react";
import { CopyToClipboard } from "../../common/components/buttons";
import { usePasteFromClipboard } from "../../common/hooks";
import {
  escapeDollar,
  escapeGenerics,
  joinFunctions,
  replaceUnicode,
  restoreText,
  trimLines,
  escapeLeadingWhitespace,
  splitIntoChunks,
} from "./textProcessing";

const processChunk = joinFunctions(
  replaceUnicode,
  escapeGenerics,
  trimLines,
  escapeLeadingWhitespace,
  escapeDollar,
);

const CopyTextEntry = ({
  onCopy,
  enableHotkeys = true,
}: {
  onCopy: (text: string) => string;
  enableHotkeys?: boolean;
}) => {
  const {
    onClick: copyFromClipboard,
    text: pastedText,
    isPasted,
  } = usePasteFromClipboard();
  const destinationRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [originalChunks, setOriginalChunks] = useState<string[]>([]);

  const getText = useCallback((): string => {
    if (!destinationRef.current) return "";
    const content = destinationRef.current.innerHTML ?? "";
    return onCopy(content);
  }, [onCopy]);

  useEffect(() => {
    const rawText = pastedText ?? "";
    const split = splitIntoChunks(rawText);
    setChunks(split);
    setOriginalChunks(split);

    if (textareaRef.current) {
      textareaRef.current.value = rawText;
    }
  }, [pastedText]);

  const handleBlur = useCallback(() => {
    if (!textareaRef.current) return;
    const rawText = textareaRef.current.value ?? "";
    const split = splitIntoChunks(rawText);
    setChunks(split);
    setOriginalChunks(split);
  }, []);

  useEffect(() => {
    if (!destinationRef.current) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          !(mutation.type === "childList" || mutation.type === "characterData")
        )
          return;

        const target = mutation.target as Node;
        const targetElement =
          target.nodeType === Node.ELEMENT_NODE
            ? (target as HTMLElement)
            : target.parentElement;

        const chunkElement = targetElement?.closest("[data-chunk-index]");
        if (!chunkElement) return;

        const index = parseInt(
          chunkElement.getAttribute("data-chunk-index") || "-1",
          10,
        );
        if (index === -1) return;

        const original = originalChunks[index];
        const current = chunkElement.innerHTML || "";
        const currentRestored = onCopy(current);

        if (currentRestored !== original) {
          chunkElement.classList.remove("bg-white");
          chunkElement.classList.add("bg-blue-900", "text-white");
        } else {
          chunkElement.classList.add("bg-white");
          chunkElement.classList.remove("bg-blue-900", "text-white");
        }
      });
    });

    observer.observe(destinationRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [originalChunks, onCopy]);

  return (
    <div className="relative min-h-32 rounded-xl border-2 border-neutral-500 p-2 pb-3">
      <div className="flex w-full flex-col gap-2 px-2">
        <p className="font-bold text-blue-500">Enter your text here:</p>
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

        <div className="absolute right-2 bottom-2 flex flex-col items-end gap-1 bg-transparent">
          <CopyToClipboard enableHotkeys={enableHotkeys} getText={getText} />
        </div>
      </div>

      <div
        ref={destinationRef}
        className={"w-full overflow-hidden p-2 text-[6px]"}
      >
        {chunks.map((chunk, index) => {
          const processed = processChunk(chunk);
          return (
            <div
              key={index}
              data-chunk-index={index}
              className="bg-white"
              dangerouslySetInnerHTML={{ __html: processed }}
            />
          );
        })}
      </div>
    </div>
  );
};

export function EchoText() {
  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">Echo Text</h1>

      <div className="my-5 flex flex-col gap-4">
        <CopyTextEntry onCopy={restoreText} />
      </div>
    </>
  );
}
