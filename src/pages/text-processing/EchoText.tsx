import {
  escapeDollar,
  escapeGenerics,
  escapeNewLine,
  joinFunctions,
  replaceUnicode,
  restoreText,
  trimLines,
  escapeLeadingWhitespace,
} from "./textProcessing";
import { CopyTextEntry } from "../../components/copyTextEntry";

const onPaste = joinFunctions(
  replaceUnicode,
  escapeGenerics,
  trimLines,
  escapeLeadingWhitespace,
  escapeDollar,
  escapeNewLine,
);

export function EchoText() {
  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">Echo Text</h1>

      <div className="my-5 flex flex-col gap-4">
        <CopyTextEntry onPaste={onPaste} onCopy={restoreText} />
      </div>
    </>
  );
}
