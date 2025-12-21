import { useCallback, useEffect, useState } from "react";
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
import { TrashIcon } from "@heroicons/react/24/solid";

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
    if (tempSection.length === 0) {
      tempSection += section;
    } else if (tempSection.length + section.length <= 10000) {
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

type Template = { name: string; contents: string };

const STORAGE_KEY = "text-to-prompt-templates";
const SELECTED_IDX_KEY = "text-to-prompt-templates-selection";
const DEFAULT_TEMPLATES: Template[] = [{ name: "Default", contents: '""""""' }];

const loadSelectedIndex = (): number => {
  try {
    const stored = localStorage.getItem(SELECTED_IDX_KEY);
    if (!stored) return 0;
    const parsed = Number.parseInt(stored, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.error("Failed to parse selected index from localStorage", error);
    return 0;
  }
};

const loadTemplates = (): Template[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_TEMPLATES;
  } catch (error) {
    console.error("Failed to parse templates from localStorage", error);
    return DEFAULT_TEMPLATES;
  }
};

const PromptEditor = ({
  templates,
  selectedIndex,
  onUpdate,
  onSelect,
  onRemove,
  onAdd,
}: {
  templates: Template[];
  selectedIndex: number;
  onUpdate: (index: number, updates: Partial<Template>) => void;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) => {
  const currentTemplate = templates[selectedIndex];
  const [localText, setLocalText] = useState(currentTemplate.contents);
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);

  // Sync textarea when selecting a different template
  useEffect(() => {
    setLocalText(currentTemplate.contents);
  }, [currentTemplate]);

  const handleTextBlur = () => {
    if (localText !== currentTemplate.contents) {
      onUpdate(selectedIndex, { contents: localText });
    }
  };

  const handleNameSubmit = (index: number, newName: string) => {
    onUpdate(index, { name: newName });
    setEditingNameIndex(null);
  };

  return (
    <div className="flex w-full flex-col gap-4 rounded-xl border-2 border-neutral-500 bg-white p-4 lg:flex-row">
      {/* Sidebar List */}
      <div className="flex h-[200px] w-full flex-col border-b-2 border-neutral-500 pr-0 lg:h-[300px] lg:w-64 lg:border-r-2 lg:border-b-0 lg:pr-2">
        <div className="flex-1 space-y-2 overflow-y-auto pr-2">
          {templates.map((t, idx) => (
            <div key={idx} className="group relative border-neutral-500">
              {editingNameIndex === idx ? (
                <div className="flex flex-row flex-nowrap">
                  <input
                    autoFocus
                    className="w-full rounded border-2 border-blue-500 px-2 py-1.5 outline-none"
                    defaultValue={t.name}
                    onBlur={(e) => handleNameSubmit(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleNameSubmit(idx, e.currentTarget.value);
                      if (e.key === "Escape") setEditingNameIndex(null);
                    }}
                  />
                </div>
              ) : (
                <div className="p0 flex w-full flex-row flex-nowrap gap-0">
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete template "${t.name}"?`))
                        onRemove(idx);
                    }}
                    className={`text-red-300 transition-all hover:text-red-500 ${
                      templates.length <= 1 ? "hidden" : ""
                    } ${
                      selectedIndex === idx
                        ? "w-auto scale-100 p-2 opacity-100"
                        : "w-0 scale-0 opacity-0"
                    }`}
                    title="Delete template"
                  >
                    <TrashIcon className="size-5 text-red-500" />
                  </button>

                  {/* Selection Button */}
                  <button
                    onClick={() => onSelect(idx)}
                    onDoubleClick={() => setEditingNameIndex(idx)}
                    className={`w-full truncate rounded px-3 py-2 text-left text-sm font-medium transition-colors ${
                      selectedIndex === idx
                        ? "bg-neutral-500 text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {t.name}
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={onAdd}
            className="mb-2 w-full rounded-lg border-2 border-dashed border-blue-400 py-1 font-bold text-blue-600 transition-colors hover:bg-blue-50"
          >
            + Add New
          </button>
        </div>
      </div>

      {/* Prompt Editor */}
      <div className="flex flex-1 flex-col gap-2">
        <p className="font-bold text-blue-500">
          Note: <code>""""""</code> will be populated with your text.
        </p>
        <textarea
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleTextBlur}
          placeholder="Enter template contents..."
          className="min-h-[200px] w-full flex-1 resize-none rounded-lg border-2 border-neutral-200 bg-neutral-50 p-4 transition-all outline-none focus:border-neutral-500 lg:h-full"
        />
      </div>
    </div>
  );
};

const PromptFormattingForm = ({
  templateContents,
}: {
  templateContents: string;
}) => {
  return (
    <>
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
  );
};

export function TextToPrompt() {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [selectedIndex, setSelectedIndex] = useState(loadSelectedIndex);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(SELECTED_IDX_KEY, selectedIndex.toString());
  }, [selectedIndex]);

  const safeIndex = selectedIndex >= templates.length ? 0 : selectedIndex;
  const currentTemplate = templates[safeIndex] ?? DEFAULT_TEMPLATES[0];

  const updateTemplate = useCallback(
    (index: number, updates: Partial<Template>) => {
      setTemplates((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...updates };
        return next;
      });
    },
    [],
  );

  const addNewTemplate = useCallback(() => {
    const newTemplate = {
      name: `Template ${templates.length + 1}`,
      contents: '""""""',
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setSelectedIndex(templates.length); // Select the new one
  }, [templates.length]);

  const removeTemplate = useCallback((index: number) => {
    setTemplates((prev) => {
      if (prev.length <= 1) return prev; // Prevent deleting the last template
      const next = prev.filter((_, i) => i !== index);
      return next;
    });

    // Adjust selected index if necessary
    setSelectedIndex((prev) => {
      if (index <= prev && prev > 0) return prev - 1;
      return prev;
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-8 text-center text-3xl font-bold">Text to Prompts</h1>

      <PromptEditor
        templates={templates}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onUpdate={updateTemplate}
        onAdd={addNewTemplate}
        onRemove={removeTemplate}
      />
      <PromptFormattingForm templateContents={currentTemplate.contents} />
    </div>
  );
}
