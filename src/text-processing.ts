function shouldSkip(line: string): boolean {
  return (
    line.includes("Ova lekcija sadrži video") || // skip lecture entries
    line.startsWith("![](http") // skip referenced images
  );
}

function trimLines(text: string): string {
  const trimmedLines = text
    .split("\n")
    .filter((l) => !shouldSkip(l))
    .map((line) => line.trimEnd());
  const textWithTrimmedLines = trimmedLines.join("\n");
  const normalizedNewlines = textWithTrimmedLines.replace(/\n{3,}/g, "\n\n");
  return normalizedNewlines;
}

function escapeDollar(text: string): string {
  const replacer = (
    _match: unknown,
    dollarSigns: string,
    content: string,
  ): string => {
    const dollars = "$".repeat(dollarSigns.length);
    return `<pre>${dollars}${content}${dollars}</pre>`;
  };
  return text
    .split("\n")
    .map((line) => line.replace(/[^$](\$)([^$]+)\1/g, replacer))
    .join("\n")
    .replace(/(\$\$)([^$]+)\1/g, replacer);
}

function escapeGenerics(text: string): string {
  return text.replace(/</g, " < ").replace(/>/g, " > ");
}

function replaceUnicode(text: string): string {
  return text
    .replace(
      /[\u007F-\u009F\u2000-\u200A\u2028-\u202F\u205F\u3000\uFEFF]/gu,
      "",
    )
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "- ");
}

function removeStrangeMarkdown(text: string): string {
  return text
    .replace(/^\*\*(.*?)\*\*$/gm, "$1")
    .replace(/^- \*\*(.*?)\*\*$/gm, "- $1")
    .replace(/^_(.*?)_$/gm, "$1")
    .replace(/^- _(.*?)_$/gm, "- $1");
}

export function preprocessText(text: string): string {
  let temp_text: string = text;

  temp_text = temp_text.trim();
  temp_text = replaceUnicode(temp_text);
  temp_text = escapeGenerics(temp_text);
  temp_text = trimLines(temp_text);
  temp_text = removeStrangeMarkdown(temp_text);
  temp_text = escapeDollar(temp_text);

  return temp_text;
}

export function restoreText(text: string): string {
  return text
    .replace(/<br>/g, "\n")
    .replace(/\$<\/pre>/g, "$")
    .replace(/<pre>\$/g, "$");
}

export function populateTemplate(
  text: string,
  replacement: string = "",
): string {
  const emptyTripleQuotesRegex = /"""\n*"""/g;
  return text.replace(emptyTripleQuotesRegex, () => `"""\n${replacement}\n"""`);
}

export function divideMarkdown(markdownText: string): string[] {
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
    if (shouldSkip(line)) continue;

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
