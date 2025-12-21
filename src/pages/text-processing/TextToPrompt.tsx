import { useCallback, useEffect, useRef, useState } from "react";
import { CopyTextEntryDirect } from "../../components/copyTextEntry";
import {
  escapeDollar,
  escapeGenerics,
  escapeNewLine,
  joinFunctions,
  replaceUnicode,
  restoreText,
  trimLines,
} from "./textProcessing";

const onPaste = joinFunctions(
  replaceUnicode,
  escapeGenerics,
  trimLines,
  escapeDollar,
  escapeNewLine,
);

function populateTemplate(text: string, replacement: string = ""): string {
  const emptyTripleQuotesRegex = /"""\n*"""/g;
  return text.replace(emptyTripleQuotesRegex, () => `"""\n${replacement}\n"""`);
}

function divideMarkdown(markdownText: string): string[] {
  const lines = markdownText.split("\n");
  const mainSections: string[] = [];
  let currentMainSection = "";
  let inCodeBlock = false;

  for (const line of lines) {
    const isCodeBlockDelimiter = line.trim().startsWith("```");
    const isTopLevelHeader = line.startsWith("# ");

    if (isCodeBlockDelimiter) {
      inCodeBlock = !inCodeBlock;
    }

    if (isTopLevelHeader && !inCodeBlock) {
      if (currentMainSection.length > 0) {
        mainSections.push(currentMainSection.trim());
      }
      currentMainSection = line;
    } else {
      currentMainSection += "\n" + line;
    }
  }

  if (currentMainSection.length > 0) {
    mainSections.push(currentMainSection.trim());
  }

  const sections: string[] = [];
  for (const sectionText of mainSections) {
    let currentSection: string[] = [];
    let wordCount = 0;

    const lines = sectionText.split("\n");
    const headingRegex = /^##\s+(.*)$/;
    const codeBlockRegex = /^```/;
    let inCodeBlock = false;

    const countWords = (text: string): number => {
      return text.split(/[^\w']+/).filter((word) => word.length > 0).length;
    };

    for (const line of lines) {
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

      if (headingRegex.test(line) && wordCount > 2000) {
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
  }

  const mergedSections: string[] = [];
  let tempSection = "";

  for (const section of sections) {
    if (
      tempSection.length === 0 ||
      tempSection.length + section.length <= 10000
    ) {
      tempSection += "\n\n" + section;
    } else {
      mergedSections.push(tempSection);
      tempSection = section;
    }
  }

  if (tempSection.length > 0) {
    mergedSections.push(tempSection);
  }

  return mergedSections;
}

type Template = {name: string; contents: string; }

const STORAGE_KEY = "text-to-prompt-templates";
const DEFAULT_TEMPLATES: Template[] = [{ name: "Default", contents: '""""""' }];

const loadTemplates = (): Template[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEMPLATES;
  } catch (error) {
    console.error("Failed to parse templates from localStorage", error);
    return DEFAULT_TEMPLATES;
  }
};

const PromptEditor = ({
  template,
  onUpdate,
}: {
  template: Template;
  onUpdate: (newContents: string) => void;
}) => {
  // Use a local state for the textarea to keep typing lag-free
  const [localText, setLocalText] = useState(template.contents);

  // Sync local text when the parent switches the template index
  useEffect(() => {
    setLocalText(template.contents);
  }, [template]);

  const handleSave = () => {
    if (localText !== template.contents) {
      onUpdate(localText);
    }
  };

  return (
    <div className="relative min-h-32 rounded-xl border-2 border-neutral-500 p-2 pb-3">
      <div className="flex w-full flex-col gap-2 px-2">
        <p className="text-blue-500 font-bold">Use <code>""""""</code> as a placeholder. It will be replaced with your divided text elements.</p>
        <div className="w-full flex lg:flex-row lg:h-[400px]">
          <textarea
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleSave}
            placeholder="Enter template contents..."
            className="w-full h-full min-h-[200px] rounded-lg border-2 border-neutral-500 bg-neutral-100 p-4 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
};

const PromptFormattingForm = ({templateContents}: {templateContents: string}) => {
  return (
    <>
      <h2 className="my-8 w-full text-center text-2xl font-bold">
        Input Text
      </h2>
      <div className="my-5 flex flex-col gap-4">
        <CopyTextEntryDirect
          onPaste={onPaste}
          onCopy={(content: string) => {
            const text = restoreText(content ?? "");
            return divideMarkdown(text)
              .map((entry) => populateTemplate(templateContents, entry))
              .join("\n".repeat(40));
          }}
        />
      </div>
    </>
  )
}

export function TextToPrompt() {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  const safeIndex = selectedIndex >= templates.length ? 0 : selectedIndex;
  const currentTemplate = templates[safeIndex] ?? DEFAULT_TEMPLATES[0];

  const updateCurrentTemplate = useCallback((newContents: string) => {
    setTemplates((prev) => {
      const next = [...prev];
      if (next[safeIndex]) {
        next[safeIndex] = { ...next[safeIndex], contents: newContents };
      }
      return next;
    });
  }, [safeIndex]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="mb-8 text-center text-3xl font-bold">Text to Prompts</h1>

      <PromptEditor 
        template={currentTemplate} 
        onUpdate={updateCurrentTemplate} 
      />
      
      <PromptFormattingForm templateContents={currentTemplate.contents} />
    </div>
  );
}
