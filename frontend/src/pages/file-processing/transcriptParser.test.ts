import { describe, expect, it } from "vitest";
import { parseJson3, parseSrt, parseTranscript } from "./transcriptParser";
import { formatAsText, segmentTranscript } from "./transcriptionFormatter";

describe("transcript parser", () => {
  it("recognizes JSON3 by its root marker", () => {
    const parsed = parseTranscript(
      '{"wireMagic":"pb3","events":[{"tStartMs":10,"segs":[{"utf8":"Hello."}]}]}',
    );

    expect(parsed.format).toBe("json3");
    expect(parsed.data.events).toHaveLength(1);
  });

  it("parses SRT timestamps and multiline text", () => {
    const data = parseSrt(
      "\uFEFF1\r\n00:01:20,000 --> 00:01:23.450\r\n<b>Hello!</b> Welcome\r\nto the video.\r\n\r\n3\r\n00:01:24,100 --> 00:01:26,900\r\nNext section\r\n",
    );

    expect(data.events).toEqual([
      expect.objectContaining({
        tStartMs: 80000,
      }),
      expect.objectContaining({
        tStartMs: 84100,
      }),
    ]);
    expect(data.events?.[0].segs?.map((segment) => segment.utf8).join("")).toBe(
      "<b>Hello!</b> Welcome to the video.",
    );
  });

  it("formats SRT data through the existing segmentation pipeline", () => {
    const result = segmentTranscript(
      parseSrt(
        "1\n00:00:00,000 --> 00:00:01,000\nHello world.\n\n2\n00:00:02,000 --> 00:00:03,000\nThis is next.",
      ),
    );

    expect(formatAsText(result)).toBe("Hello world. This is next.");
  });

  it("rejects JSON that is not JSON3", () => {
    expect(() => parseJson3('{"events":[]}')).toThrow("valid JSON3");
  });
});
