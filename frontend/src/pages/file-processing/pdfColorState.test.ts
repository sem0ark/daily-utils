import { describe, expect, it } from "vitest";
import { restoreColorState, type ColorState } from "./pdfColorState";

const colorState = (operands: string[], operator: ColorState["operator"] = "scn"): ColorState => ({
  operands,
  operator,
});

describe("PDF color state restoration", () => {
  it("restores arbitrary multi-channel non-stroking colors", () => {
    const originalColorState = new Map([["/PANTONE_123", colorState(["0.1", "0.2", "0.3", "0.4"])]]);

    expect(restoreColorState("/PANTONE_123 cs 0.5 w", originalColorState)).toBe(
      "/PANTONE_123 cs 0.1 0.2 0.3 0.4 scn 0.5 w",
    );
  });

  it("restores arbitrary stroking colors with the uppercase operator", () => {
    const originalColorState = new Map([["/SpotColor", colorState(["0.75", "0.25"], "SCN")]]);

    expect(restoreColorState("/SpotColor CS 2 w", originalColorState)).toBe("/SpotColor CS 0.75 0.25 SCN 2 w");
  });

  it("does not duplicate an existing color operand", () => {
    const originalColorState = new Map([["/SpotColor", colorState(["1"])]]);
    const content = "/SpotColor cs 1 scn 2 w";

    expect(restoreColorState(content, originalColorState)).toBe(content);
  });

  it("does not rewrite inline image streams", () => {
    const content = "BI /W 1 /H 1 /CS /DeviceRGB ID /CS5 cs EI";
    const originalColorState = new Map([["/CS5", colorState(["1"])]]);

    expect(restoreColorState(content, originalColorState)).toBe(content);
  });
});
