import { useCallback, useState } from "react";
import { CopyTextEntryDirect } from "../components/copyTextEntry";
import { joinFunctions, replaceUnicode, trimLines } from "../textProcessing";

const onPaste = joinFunctions(replaceUnicode, trimLines);

function replaceMarkdownElements(text: string) {
  return text
    .replace(/\n\* {1,}/g, "\n- ")
    .replace(/\n {2}\* {1,}/g, "\n  - ")
    .replace(/( {4}|\t)\* {1,}/g, "    - ")
    .replace(/( {4}|\t)/g, "   ")
    .replace(/(\s*)(\d*\.) {1,}/gm, "$1$2 ")
    .replace(/^-{3,}$/gm, "\n\n");
}

const onCopy = (text: string) => replaceMarkdownElements(text);

export function FormatMarkdown() {
  const [count, setCount] = useState(1);
  const increase = useCallback(() => setCount((c) => c + 1), [setCount]);

  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">
        Format Markdown
      </h1>

      <h2 className="my-8 w-full text-center text-2xl font-bold">
        Text Entries
      </h2>

      <div className="my-5 flex flex-col gap-4">
        {Array.from(Array(count)).map((_, index) => (
          <CopyTextEntryDirect key={index} onPaste={onPaste} onCopy={onCopy} />
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
