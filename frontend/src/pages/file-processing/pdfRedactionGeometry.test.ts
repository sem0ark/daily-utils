import { describe, expect, it } from "vitest";
import { getQuadRectangle } from "./pdfRedactionGeometry";

describe("PDF redaction geometry", () => {
  it("normalizes a flat quad", () => {
    expect(getQuadRectangle([[10, 20, 30, 20, 10, 40, 30, 40]])).toEqual([10, 20, 30, 40]);
  });

  it("covers multiple quads", () => {
    expect(getQuadRectangle([[[10, 20, 30, 20, 10, 40, 30, 40]], [[-5, 50, 5, 50, -5, 60, 5, 60]]])).toEqual([
      -5, 20, 30, 60,
    ]);
  });

  it("keeps zero and negative coordinates", () => {
    expect(getQuadRectangle([[-10, 0, 0, 0, -10, 10, 0, 10]])).toEqual([-10, 0, 0, 10]);
  });

  it("rejects empty quads", () => {
    expect(() => getQuadRectangle([])).toThrow("empty text quad");
  });
});
