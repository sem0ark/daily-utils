import { useCallback, useRef } from "react";
import { CopyToClipboard } from "./buttons";

export function CopyTextEntry({
  onCopy,
  onBlur,
}: {
  onCopy: (text: string) => string;
  onBlur: (text: string) => string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  const getText = useCallback((): string => {
    if (!destinationRef.current) return "";
    const content = destinationRef.current.innerHTML ?? "";
    return onCopy(content);
  }, [onCopy]);

  const handleBlur = useCallback(() => {
    if (!textareaRef.current) return;
    if (!destinationRef.current) return;
    destinationRef.current.innerHTML = onBlur(textareaRef.current.value ?? "");
  }, [onBlur]);

  return (
    <div className="relative min-h-32 rounded-xl border-2 border-neutral-500 p-2">
      <div className="flex w-full flex-col gap-2 px-2">
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
        </div>
      </div>

      <div
        ref={destinationRef}
        className={"w-full overflow-hidden p-2 text-[6px]"}
      ></div>
    </div>
  );
}
