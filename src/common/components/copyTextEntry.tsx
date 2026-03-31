import { useEffect, useState } from "react";
import { CopyToClipboard } from "./buttons";

export const CopyTextEntryDirect = ({
  onCopy,
  onPaste,
  enableHotkeys = true,
  autoFocus = true,
  count = 1,
  placeholders = [],
}: {
  onCopy: (texts: string[]) => string;
  onPaste: (text: string) => string;
  enableHotkeys?: boolean;
  autoFocus?: boolean;
  count?: number;
  placeholders?: string[];
}) => {
  const [texts, setTexts] = useState<string[]>(Array(count).fill(""));

  useEffect(() => {
    setTexts((prev) => {
      if (prev.length === count) return prev;
      const next = Array(count).fill("");
      for (let i = 0; i < Math.min(prev.length, count); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [count]);

  const handleBlur = (index: number, value: string) => {
    setTexts((prev) => {
      const next = [...prev];
      next[index] = onPaste(value);
      return next;
    });
  };

  return (
    <div className="relative min-h-32 rounded-xl border-2 border-neutral-500 p-2 pb-3">
      <div className="flex w-full flex-col gap-2 px-2">
        <p className="font-bold text-blue-500">Enter your text here:</p>

        <div className="flex w-full flex-row gap-2">
          <div className="flex w-full flex-col gap-2">
            {texts.map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <textarea
                  autoFocus={autoFocus && i === 0}
                  name={`entered text ${i}`}
                  onBlur={(e) => handleBlur(i, e.target.value)}
                  className="w-full scroll-m-0 rounded-lg border-2 border-neutral-200 bg-neutral-100 p-4 ring-0 outline-none focus:border-neutral-500"
                  placeholder={(placeholders[i] ?? "Input") + "..."}
                ></textarea>
              </div>
            ))}
          </div>

          <CopyToClipboard
            enableHotkeys={enableHotkeys}
            getText={() => onCopy(texts)}
            bigger
          />
        </div>
      </div>
    </div>
  );
};
