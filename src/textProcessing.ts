export function trimLines(text: string): string {
  const trimmedLines = text
    .replace(/\s+$/, "")
    .split("\n")
    .map((line) => line.trimEnd());
  const textWithTrimmedLines = trimmedLines.join("\n");
  const normalizedNewlines = textWithTrimmedLines.replace(/\n{3,}/g, "\n\n");
  return normalizedNewlines;
}

export function escapeDollar(text: string): string {
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

export function escapeNewLine(text: string): string {
  return text.replace(/\n/g, "<br>");
}

export function escapeGenerics(text: string): string {
  return text.replace(/<(?! )/g, " < ").replace(/(?<! )>/g, " > ");
}

export function replaceUnicode(text: string): string {
  return text
    .replace(
      /[\u007F-\u009F\u2000-\u200A\u2028-\u202F\u205F\u3000\uFEFF]/gu,
      "",
    )
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "- ");
}

export function joinFunctions(
  ...functions: ((text: string) => string)[]
): (text: string) => string {
  return (initial_text: string) =>
    functions.reduce((text, f) => f(text), initial_text);
}

export function restoreText(text: string): string {
  let temp_text: string = text;

  temp_text = temp_text.replace(/&lt;/g, "<");
  temp_text = temp_text.replace(/&gt;/g, ">");
  temp_text = temp_text.replace(/&quot;/g, '"');
  temp_text = temp_text.replace(/&#39;/g, "'");
  temp_text = temp_text.replace(/&amp;/g, "&");
  temp_text = temp_text.replace(/<br>/g, "\n");
  temp_text = temp_text.replace(/<\/pre>/g, "");
  temp_text = temp_text.replace(/<pre>/g, "");

  return temp_text;
}
