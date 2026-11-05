export type ColorState = {
  operands: string[];
  operator: "sc" | "scn" | "SC" | "SCN";
};

const tokenizePdfContent = (content: string) =>
  content.match(/\[[\s\S]*?\]|\((?:\\.|[^\\()])*\)|<[^>]*>|\/?[A-Za-z][\w.+-]*|[-+]?(?:\d*\.\d+|\d+\.?)/g) ?? [];

const isPdfOperator = (token: string) => /^[A-Za-z]/.test(token);

/** Captures the last explicit color for each color space in a content stream. */
export const getColorState = (content: string) => {
  const tokens = tokenizePdfContent(content);
  const colorState = new Map<string, ColorState>();
  let pendingOperands: string[] = [];
  let nonStrokingColorSpace: string | undefined;
  let strokingColorSpace: string | undefined;

  for (const token of tokens) {
    if (!isPdfOperator(token)) {
      pendingOperands.push(token);
      continue;
    }

    if (token === "cs") nonStrokingColorSpace = pendingOperands[0];
    if (token === "CS") strokingColorSpace = pendingOperands[0];
    if (["sc", "scn"].includes(token) && nonStrokingColorSpace) {
      colorState.set(nonStrokingColorSpace, { operands: pendingOperands, operator: token as ColorState["operator"] });
    }
    if (["SC", "SCN"].includes(token) && strokingColorSpace) {
      colorState.set(strokingColorSpace, { operands: pendingOperands, operator: token as ColorState["operator"] });
    }
    if (token === "rg") colorState.set("/DeviceRGB", { operands: pendingOperands, operator: "scn" });
    if (token === "RG") colorState.set("/DeviceRGB", { operands: pendingOperands, operator: "SCN" });
    if (token === "g") colorState.set("/DeviceGray", { operands: pendingOperands, operator: "scn" });
    if (token === "G") colorState.set("/DeviceGray", { operands: pendingOperands, operator: "SCN" });
    if (token === "k") colorState.set("/DeviceCMYK", { operands: pendingOperands, operator: "scn" });
    if (token === "K") colorState.set("/DeviceCMYK", { operands: pendingOperands, operator: "SCN" });
    pendingOperands = [];
  }

  return colorState;
};

export const restoreColorState = (content: string, originalColorState: Map<string, ColorState>) => {
  if (/\bBI\b/.test(content)) return content;
  const tokens = tokenizePdfContent(content);
  const restoredTokens: string[] = [];
  let pendingOperands: string[] = [];
  let pendingColorSpace: string | undefined;
  let pendingColorOperator: "cs" | "CS" | undefined;
  let colorWasSet = false;
  let insertedColorState = false;

  for (const token of tokens) {
    if (!isPdfOperator(token)) {
      pendingOperands.push(token);
      restoredTokens.push(token);
      continue;
    }

    const isColorOperator = ["sc", "scn", "SC", "SCN"].includes(token);
    if (pendingColorSpace && !colorWasSet && !isColorOperator) {
      const colorState = originalColorState.get(pendingColorSpace);
      if (colorState) {
        restoredTokens.splice(restoredTokens.length - pendingOperands.length, pendingOperands.length);
        restoredTokens.push(
          ...colorState.operands,
          pendingColorOperator === "CS" ? colorState.operator.toUpperCase() : colorState.operator,
          ...pendingOperands,
        );
        insertedColorState = true;
        colorWasSet = true;
      }
    }

    if (token === "cs" || token === "CS") {
      pendingColorSpace = pendingOperands[0];
      pendingColorOperator = token;
      colorWasSet = false;
    } else if (["sc", "scn", "SC", "SCN"].includes(token)) {
      colorWasSet = true;
    }

    restoredTokens.push(token);
    pendingOperands = [];
  }

  if (pendingColorSpace && !colorWasSet) {
    const colorState = originalColorState.get(pendingColorSpace);
    if (colorState) {
      restoredTokens.push(
        ...colorState.operands,
        pendingColorOperator === "CS" ? colorState.operator.toUpperCase() : colorState.operator,
      );
      insertedColorState = true;
    }
  }

  return insertedColorState ? restoredTokens.join(" ") : content;
};
