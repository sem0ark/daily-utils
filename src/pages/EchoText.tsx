import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import { preprocessText, restoreText } from "../text-processing";
import { CopyToClipboard } from "../components/buttons";

function EchoTextEntry() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  const [showAll, setShowAll] = useState(true);

  const getText = useCallback((): string => {
    if (!destinationRef.current) return "";
    const content = destinationRef.current.innerHTML;
    return restoreText(content ?? "");
  }, []);

  const handleBlur = useCallback(() => {
    if (!textareaRef.current) return;
    if (!destinationRef.current) return;
    destinationRef.current.innerHTML = preprocessText(
      textareaRef.current.value,
    ).replace(/\n/g, "<br>");
  }, []);

  return (
    <div className="min-h-32 rounded-xl border-2 border-neutral-500 p-2">
      <div className="relative flex w-full flex-col gap-2 px-2">
        <p className="font-bold text-blue-500">Enter your text here:</p>
        <textarea
          ref={textareaRef}
          name="entered text"
          className="w-40 scroll-m-0 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-4 ring-0 outline-none"
          onBlur={handleBlur}
        ></textarea>

        <div className="absolute right-2 bottom-2 flex flex-col items-end gap-1 bg-transparent">
          <CopyToClipboard
            getText={getText}
            className="w-fit rounded-lg border-2 border-neutral-500 bg-neutral-100 p-1 font-bold text-blue-500 transition-all hover:gap-4 hover:border-blue-600 hover:text-blue-600"
          />
          <button
            onClick={() => setShowAll((a) => !a)}
            className="w-fit rounded-lg border-2 border-neutral-500 bg-neutral-100 p-1 font-bold text-blue-500 transition-all hover:gap-4 hover:border-blue-600 hover:text-blue-600"
          >
            {showAll ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div
        ref={destinationRef}
        className={clsx(
          "w-full overflow-hidden p-2 text-[6px]",
          !showAll && "max-h-40",
        )}
      ></div>
    </div>
  );
}

export function EchoText() {
  const [count, setCount] = useState(1);
  const increase = useCallback(() => setCount((c) => c + 1), [setCount]);

  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">Echo Text</h1>

      <div className="my-5 flex flex-col gap-4">
        {Array.from(Array(count)).map((_, index) => (
          <EchoTextEntry key={index} />
        ))}
      </div>

      <div className="flex gap-1 p-1">
        <button
          onClick={increase}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-center text-xl font-bold text-blue-500 transition-all duration-400 hover:gap-4 hover:border-neutral-100 hover:text-blue-600"
        >
          New Entry
        </button>
      </div>
    </>
  );
}
