const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const replacePdfLiteralText = (content: string, searchTerm: string, replacement: string) => {
  if (!searchTerm) return content;
  const escapedSearchTerm = escapeRegExp(searchTerm);
  return content.replace(
    new RegExp(`\\((?:\\\\.|[^\\\\()])*${escapedSearchTerm}(?:\\\\.|[^\\\\()])*\\)`, "g"),
    (text) => text.split(searchTerm).join(replacement),
  );
};

/** Replaces matching text inside PDF literal strings without adding a second text run. */
export const replacePdfText = (content: string, searchTerm: string, replacement: string) =>
  replacePdfLiteralText(content, searchTerm, replacement);

/** Blanks matching literal text while preserving stream length. */
export const erasePdfText = (content: string, searchTerm: string) =>
  replacePdfLiteralText(content, searchTerm, " ".repeat(searchTerm.length));
