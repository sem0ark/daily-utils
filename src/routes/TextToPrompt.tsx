import { useCallback, useEffect, useRef, useState } from "react";
import { CopyTextEntry } from "../components/copyTextEntry";
import { preprocessText, restoreText } from "../textProcessing";

function populateTemplate(text: string, replacement: string = ""): string {
  const emptyTripleQuotesRegex = /"""\n*"""/g;
  return text.replace(emptyTripleQuotesRegex, () => `"""\n${replacement}\n"""`);
}

function divideMarkdown(markdownText: string): string[] {
  const sections: string[] = [];
  let currentSection: string[] = [];
  let wordCount = 0;

  const lines = markdownText.split("\n");
  const headingRegex = /^(#|##)\s+(.*)$/;
  const codeBlockRegex = /^```/;
  let inCodeBlock = false;

  const countWords = (text: string): number => {
    return text.split(/[^\w']+/).filter((word) => word.length > 0).length;
  };

  for (const line of lines) {
    const headingMatch = line.match(headingRegex);

    if (codeBlockRegex.test(line)) {
      inCodeBlock = !inCodeBlock;
      currentSection.push(line);
      continue;
    }

    if (inCodeBlock) {
      currentSection.push(line);
      continue;
    }

    const lineWordCount = countWords(line);
    wordCount += lineWordCount;

    if (
      headingMatch &&
      (headingMatch[1] === "#" || headingMatch[1] === "##") &&
      wordCount > 1000
    ) {
      sections.push(currentSection.join("\n"));
      currentSection = [line];
      wordCount = lineWordCount;
    } else {
      currentSection.push(line);
    }
  }

  if (currentSection.length > 0) {
    sections.push(currentSection.join("\n"));
  }

  return sections;
}

export function TextToPrompt() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [count, setCount] = useState(1);
  const increase = useCallback(() => setCount((c) => c + 1), [setCount]);

  const [template, setTemplate] = useState<string | null>(null);
  useEffect(() => {
    if (template !== null) return;

    const saved = localStorage.getItem("text-to-prompt-template") ?? "";
    setTemplate(saved);

    if (!textareaRef.current) return;
    textareaRef.current.value = saved;
  }, [template]);

  const updateTemplate = useCallback(() => {
    if (!textareaRef.current) return "";
    const text = textareaRef.current.value ?? "";
    setTemplate(text);
    localStorage.setItem("text-to-prompt-template", text);
  }, []);

  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">
        Text to promts
      </h1>

      <div className="w-full">
        <p className="font-bold text-blue-500">
          Enter custom template. <code>""""""</code> will be replaced with the
          divided elements of text.
        </p>
        <textarea
          ref={textareaRef}
          name="entered text"
          className="w-full scroll-m-0 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-4 ring-0 outline-none"
          onBlur={updateTemplate}
        ></textarea>
      </div>

      <h2 className="my-8 w-full text-center text-2xl font-bold">
        Text Entries
      </h2>

      <div className="my-5 flex flex-col gap-4">
        {Array.from(Array(count)).map((_, index) => (
          <CopyTextEntry
            key={index}
            onPaste={preprocessText}
            onCopy={(content: string) => {
              const text = restoreText(content ?? "");
              return divideMarkdown(text)
                .map((entry) => populateTemplate(template ?? '""""""', entry))
                .join("\n".repeat(40));
            }}
          />
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
