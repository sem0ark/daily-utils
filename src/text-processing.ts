function trimLines(text: string): string {
  const trimmedLines = text.split("\n").map((line) => line.trimEnd());
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

function escapeNewLine(text: string): string {
  return text.replace(/\n/g, "<br>");
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

export function preprocessText(text: string): string {
  let temp_text: string = text;

  temp_text = temp_text.trim();
  temp_text = replaceUnicode(temp_text);
  temp_text = escapeGenerics(temp_text);
  temp_text = trimLines(temp_text);
  temp_text = escapeDollar(temp_text);
  temp_text = escapeNewLine(temp_text);

  return temp_text;
}

export function restoreText(text: string): string {
  return text
    .replace(/&lt;/g, " < ")
    .replace(/&gt;/g, " > ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br>/g, "\n")
    .replace(/<\/pre>/g, "")
    .replace(/<pre>/g, "");
}
