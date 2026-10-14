export interface BoundingBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  x2: number;
  y2: number;
  rowBucket: number;
  metadata?: {
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
  };
}

export interface ParsedPage {
  pageNumber: number;
  items: BoundingBox[];
  viewBox?: number[];
}

export type WorkerMessage =
  | { type: "PROGRESS"; done: number; total: number; percent: number }
  | { type: "SUCCESS"; markdown: string }
  | { type: "ERROR"; message: string };

export interface WorkerInput {
  arrayBuffer: ArrayBuffer;
}

export const removeNonPrintableCharacters = (value: string) =>
  Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0);
      if (code === undefined) return false;

      const isAsciiControl =
        (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
        (code >= 0x7f && code <= 0x9f);
      const isZeroWidthOrBom =
        code === 0x200b ||
        code === 0x200c ||
        code === 0x200d ||
        code === 0xfeff;

      return !isAsciiControl && !isZeroWidthOrBom;
    })
    .join("");

export class MarkdownExtractor {
  private bodyFontSize: number = 12;
  private headingLevels: number[] = [];

  /**
   * Orchestrates the transformation from raw items to Markdown
   */
  public extract(pages: ParsedPage[]): string {
    const allItems = pages.flatMap((p) => p.items);

    // 1. Analyze global font distribution
    this.analyzeFontDistribution(allItems);

    // Process each page
    return pages.map((page) => this.processPage(page)).join("\n\n---\n\n");
  }

  /**
   * Step 1: Statistical Analysis of Font Sizes
   */
  private analyzeFontDistribution(items: BoundingBox[]) {
    const counts: Record<number, number> = {};

    // 1. Collect counts using rounded numbers to reduce noise
    items.forEach((item) => {
      const sz = Math.round((item.metadata?.fontSize || 12) * 10) / 10;
      counts[sz] = (counts[sz] || 0) + 1;
    });

    if (Object.keys(counts).length === 0) return;

    // 2. Identify Body Font Size (The dominant peak)
    const sortedByFrequency = Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    );
    this.bodyFontSize = Number(sortedByFrequency[0][0]);

    // 3. Extract potential heading sizes (anything comfortably larger than body)
    const potentialHeadingSizes = Object.keys(counts)
      .map(Number)
      .filter((sz) => sz > this.bodyFontSize + 1.5)
      .sort((a, b) => b - a); // Largest to smallest

    // 4. Cluster similar heading sizes (Merge 19pt and 18pt into one level)
    const clusters: number[] = [];
    if (potentialHeadingSizes.length > 0) {
      let currentCluster = potentialHeadingSizes[0];
      clusters.push(currentCluster);

      for (let i = 1; i < potentialHeadingSizes.length; i++) {
        const sz = potentialHeadingSizes[i];
        // If the gap is small (< 1.5pt), it's the same heading level
        if (Math.abs(currentCluster - sz) > 1.5) {
          clusters.push(sz);
          currentCluster = sz;
        }
      }
    }

    this.headingLevels = clusters;

    console.log(`Detected Body: ${this.bodyFontSize}pt`);
    console.log(`Inferred Heading Levels:`, this.headingLevels);
  }

  /**
   * Helper to find which cluster a font size belongs to
   */
  private getHeadingLevel(fontSize: number): number {
    // Return 1 for H1, 2 for H2, etc.
    const levelIndex = this.headingLevels.findIndex(
      (hSize) => Math.abs(hSize - fontSize) <= 1.5,
    );
    return levelIndex !== -1 ? levelIndex + 1 : 0;
  }

  /**
   * Step 2 & 3: Grouping, Re-sorting, and Formatting
   */
  private processPage(page: ParsedPage): string {
    const lines: string[] = [];
    let currentGroup: BoundingBox[] = [];

    // sliding window grouping
    for (let i = 0; i < page.items.length; i++) {
      const item = page.items[i];
      const prev = currentGroup[currentGroup.length - 1];

      if (!prev) {
        currentGroup.push(item);
        continue;
      }

      // dy check (170% of font size threshold)
      const threshold = (item.metadata?.fontSize || this.bodyFontSize) * 1.7;
      const dy = Math.abs(prev.y - item.y);

      if (dy < threshold) {
        currentGroup.push(item);
      } else {
        // Close previous group and start new one
        lines.push(this.formatGroup(currentGroup));
        currentGroup = [item];
      }
    }

    if (currentGroup.length > 0) lines.push(this.formatGroup(currentGroup));

    return lines.join("\n\n");
  }

  /**
   * Step 4: Refined Sorting and Markdown wrapping
   */
  private formatGroup(group: BoundingBox[]): string {
    // 1. Precise Sort
    const sorted = [...group].sort((a, b) => {
      const rowA = Math.round(a.y / 3) * 3;
      const rowB = Math.round(b.y / 3) * 3;
      return rowB !== rowA ? rowB - rowA : a.x - b.x;
    });

    // 2. Group into visual rows
    const rows: BoundingBox[][] = [];
    sorted.forEach((item) => {
      const lastRow = rows[rows.length - 1];
      const rowY = Math.round(item.y / 3) * 3;
      if (lastRow && Math.round(lastRow[0].y / 3) * 3 === rowY) {
        lastRow.push(item);
      } else {
        rows.push([item]);
      }
    });

    const avgFontSize = sorted[0]?.metadata?.fontSize || this.bodyFontSize;
    const hLevel = this.getHeadingLevel(avgFontSize);
    const prefix = hLevel > 0 && hLevel <= 3 ? "#".repeat(hLevel) + " " : "";

    let groupText = "";

    // Regex to detect: "1. ", "• ", "- ", "[1] ", "1) "
    const listRegex = /^(\d+[.)]|[\u2022\-*\u25CB])\s+|^\s*\[\d+\]/;

    rows.forEach((rowItems, rowIndex) => {
      let rowText = "";

      rowItems.forEach((item, idx) => {
        let text = item.text.trim();
        if (!text) return;

        if (item.metadata?.isItalic)
          text = text
            .split("\n")
            .map((line) => line.trim())
            .map((line) => (line ? `_${text}_` : line))
            .join("\n");
        if (item.metadata?.isBold)
          text = text
            .split("\n")
            .map((line) => (line ? `**${text}**` : line))
            .join("\n");

        const prev = rowItems[idx - 1];
        const space = prev ? " " : "";
        rowText += space + text;
      });

      // 3. Logic for line connection
      if (rowIndex === 0) {
        groupText = rowText;
      } else {
        // If this line starts with a list marker, force a newline
        if (listRegex.test(rowText.trim())) {
          groupText += "\n" + rowText;
        } else {
          // Check if previous line ended with a hyphen (common in PDFs)
          const connector = groupText.endsWith("-") ? "" : " ";
          groupText += connector + rowText;
        }
      }
    });

    return prefix + groupText.trim();
  }
}
