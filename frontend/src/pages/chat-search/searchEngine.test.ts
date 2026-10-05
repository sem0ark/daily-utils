import { describe, expect, it } from "vitest";
import { ChatSearchEngine } from "./searchEngine";
import type { Conversation } from "./types";

const conversation = (
  id: string,
  name: string,
  content: string,
): Conversation => ({
  id,
  name,
  messages: [{ role: "user", content }],
  updatedAt: 1,
});

describe("ChatSearchEngine", () => {
  it("requires meaningful query terms to match", () => {
    const engine = new ChatSearchEngine();
    engine.initialize([
      conversation("one", "First", "the chat has an error in it"),
      conversation("two", "Second", "the chat has a warning in it"),
    ]);

    expect(engine.search("the error").results.map(({ id }) => id)).toEqual([
      "one",
    ]);
  });

  it("falls back to broader matches only when AND has no result", () => {
    const engine = new ChatSearchEngine();
    engine.initialize([
      conversation("one", "First", "database error"),
      conversation("two", "Second", "network warning"),
    ]);

    const response = engine.search("database warning");
    expect(response.isBroadMatch).toBe(true);
    expect(response.results.map(({ id }) => id).sort()).toEqual(["one", "two"]);
  });

  it("updates an existing document without rebuilding the index", () => {
    const engine = new ChatSearchEngine();
    engine.initialize([conversation("one", "First", "old text")]);

    engine.upsert([conversation("one", "Renamed", "new text")]);

    expect(engine.search("old").results).toHaveLength(0);
    expect(engine.search("new").results[0]?.title).toBe("Renamed");
  });

  it("returns a short plain-text snippet", () => {
    const engine = new ChatSearchEngine();
    engine.initialize([
      conversation("one", "First", `${"before ".repeat(30)}needle after`),
    ]);

    const result = engine.search("needle").results[0];
    expect(result?.snippet).toContain("needle");
    expect(result?.snippet.length).toBeLessThanOrEqual(250);
  });

  it("uses fuzzy and prefix matching for message content", () => {
    const engine = new ChatSearchEngine();
    engine.initialize([
      conversation("one", "First", "investigating authentication"),
    ]);

    expect(engine.search("auth").results[0]?.id).toBe("one");
    expect(engine.search("authentcation").results[0]?.id).toBe("one");
  });

  it("caps the number of returned results", () => {
    const engine = new ChatSearchEngine();
    engine.initialize(
      Array.from({ length: 60 }, (_, index) =>
        conversation(String(index), `Chat ${index}`, "shared searchable term"),
      ),
    );

    expect(engine.search("shared searchable term").results).toHaveLength(50);
  });
});
