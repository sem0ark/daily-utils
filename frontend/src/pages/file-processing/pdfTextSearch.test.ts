import { describe, expect, it } from "vitest";
import { findTextMatches, getLineItems, type SearchTextItem } from "./pdfTextSearch";

const item = (
  str: string,
  x = 0,
  y = 100,
  transform: [number, number, number, number, number, number] = [12, 0, 0, 12, x, y],
): SearchTextItem => ({
  str,
  transform,
  width: str.length * 6,
  height: 12,
  fontName: "Arial-Regular",
});

describe("PDF text search", () => {
  it("finds text split across adjacent PDF text items", () => {
    const matches = findTextMatches([item("Hello"), item("world", 40)], "hello world", 2);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: "p3-l0-m0",
      pageIndex: 2,
      text: "Hello world",
      x: 0,
      width: 70,
      fontSize: 12,
      selected: true,
    });
  });

  it("groups nearby items into lines and sorts each line by x position", () => {
    const lines = getLineItems([item("second", 40), item("other line", 0, 60), item("first", 0)]);

    expect(lines.map((line) => line.map((part) => part.str))).toEqual([["first", "second"], ["other line"]]);
  });

  it("keeps the source transform orientation in a match", () => {
    const matches = findTextMatches([item("Vertical", 25, 200, [0, 12, -12, 0, 25, 200])], "vertical", 0);

    expect(matches[0]).toMatchObject({
      rotation: 90,
      fontSize: 12,
      x: 25,
      y: 200,
    });
  });

  it("moves a partial rotated match along the text direction", () => {
    const matches = findTextMatches([item("Vertical", 25, 200, [0, 12, -12, 0, 25, 200])], "tical", 0);

    expect(matches[0]).toMatchObject({
      x: 25,
      y: 218,
      width: 30,
      height: 12,
      rotation: 90,
    });
  });

  it("uses transform magnitude for diagonal text size", () => {
    const fontScale = 12 / Math.sqrt(2);
    const matches = findTextMatches(
      [item("Diagonal", 10, 20, [fontScale, fontScale, -fontScale, fontScale, 10, 20])],
      "diagonal",
      1,
    );

    expect(matches[0]).toMatchObject({
      pageIndex: 1,
      fontSize: 12,
      rotation: 45,
      x: 10,
      y: 20,
    });
  });

  it("returns no matches for unrelated text", () => {
    expect(findTextMatches([item("Invoice number")], "receipt", 0)).toEqual([]);
  });

  it("ignores a whitespace-only query", () => {
    expect(findTextMatches([item("one"), item("two", 30)], " ", 0)).toEqual([]);
  });

  it("returns every occurrence on a line", () => {
    const matches = findTextMatches([item("error", 0), item("error", 50)], "ERROR", 0);

    expect(matches).toHaveLength(2);
    expect(matches.map((match) => match.id)).toEqual(["p1-l0-m0", "p1-l0-m1"]);
  });

  it("uses substring bounds when a match is inside one text item", () => {
    const matches = findTextMatches([item("Hello world")], "world", 0);

    expect(matches[0]).toMatchObject({
      x: 36,
      width: 30,
      text: "world",
    });
  });

  it("does not search across separate lines", () => {
    expect(findTextMatches([item("first"), item("second", 0, 70)], "first second", 0)).toEqual([]);
  });

  it("normalizes whitespace around a search term", () => {
    const matches = findTextMatches([item("Hello world")], "  hello world  ", 0);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.text).toBe("Hello world");
  });
});
