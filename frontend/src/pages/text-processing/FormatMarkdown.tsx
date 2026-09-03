import { CopyTextEntryDirect } from "../../common/components/copyTextEntry";
import {
  joinFunctions,
  replaceUnicode,
  removeEmoji,
  trimLines,
  replaceMarkdownElements,
} from "./textProcessing";

const onPaste = joinFunctions(replaceUnicode, removeEmoji, trimLines);

const onCopy = (text: string[]) => replaceMarkdownElements(text[0]);

export function FormatMarkdown() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-center text-3xl font-bold">Format Markdown</h1>

      <div className="my-5 flex flex-col gap-4">
        <CopyTextEntryDirect onPaste={onPaste} onCopy={onCopy} />
      </div>
    </div>
  );
}
