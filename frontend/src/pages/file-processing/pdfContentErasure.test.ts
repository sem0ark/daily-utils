import { describe, expect, it } from "vitest";
import { erasePdfText, replacePdfText } from "./pdfContentErasure";

describe("PDF content erasure", () => {
  it("replaces text in place without moving the following text", () => {
    expect(replacePdfText("BT (ORIGINAL-IT) Tj ET", "ORIGINAL", "UPDATED")).toBe("BT (UPDATED-IT) Tj ET");
  });

  it("blanks matching literal text without changing its length", () => {
    const content = "BT (CONFIDENTIAL DATA) Tj ET";
    const erased = erasePdfText(content, "CONFIDENTIAL");

    expect(erased).toBe(`BT (${" ".repeat("CONFIDENTIAL".length)} DATA) Tj ET`);
    expect(erased.length).toBe(content.length);
  });

  it("erases matching text in multiple literal strings", () => {
    expect(erasePdfText("(CONFIDENTIAL)Tj (CONFIDENTIAL)Tj", "CONFIDENTIAL")).toBe("(            )Tj (            )Tj");
  });

  it("leaves unrelated content unchanged", () => {
    const content = "BT (PUBLIC DATA) Tj ET";

    expect(erasePdfText(content, "CONFIDENTIAL")).toBe(content);
  });

  it("erases text inside a TJ array", () => {
    const content = "BT [(PUBLIC) 20 (CONFIDENTIAL) -10 (DATA)] TJ ET";

    expect(erasePdfText(content, "CONFIDENTIAL")).toContain("(            )");
    expect(erasePdfText(content, "CONFIDENTIAL")).toContain("(PUBLIC)");
  });

  it("handles escaped parentheses in neighboring PDF text", () => {
    const content = "BT (Before \\(note\\)) Tj (CONFIDENTIAL) Tj ET";

    expect(erasePdfText(content, "CONFIDENTIAL")).toBe("BT (Before \\(note\\)) Tj (            ) Tj ET");
  });

  it("does nothing for an empty search term", () => {
    const content = "BT (PUBLIC DATA) Tj ET";

    expect(erasePdfText(content, "")).toBe(content);
  });
});
