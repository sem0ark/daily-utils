export interface SearchTextItem {
  str: string;
  transform: [number, number, number, number, number, number];
  width: number;
  height: number;
  fontName: string;
}

export interface SearchTextMatch {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  rotation: number;
  fontName: string;
  selected: boolean;
}

export const getLineItems = (items: SearchTextItem[]) => {
  const lines: SearchTextItem[][] = [];
  for (const item of items) {
    const line = lines.find(
      (candidate) =>
        Math.abs(candidate[0].transform[5] - item.transform[5]) < Math.max(2, Math.abs(item.transform[3]) * 0.35),
    );
    if (line) line.push(item);
    else lines.push([item]);
  }
  return lines.map((line) => line.sort((a, b) => a.transform[4] - b.transform[4]));
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTextPoint = (item: SearchTextItem, characterOffset: number) => {
  const characterAdvance = (item.width * characterOffset) / Math.max(item.str.length, 1);
  const directionLength = Math.hypot(item.transform[0], item.transform[1]);
  const directionX = directionLength ? item.transform[0] / directionLength : 1;
  const directionY = directionLength ? item.transform[1] / directionLength : 0;

  return [
    item.transform[4] + characterAdvance * directionX,
    item.transform[5] + characterAdvance * directionY,
  ] as const;
};

const getFontSize = (item: SearchTextItem) =>
  Math.hypot(item.transform[0], item.transform[1]) || Math.hypot(item.transform[2], item.transform[3]);

const getRotation = (item: SearchTextItem) => (Math.atan2(item.transform[1], item.transform[0]) * 180) / Math.PI;

const findLineMatches = (
  line: SearchTextItem[],
  searchTerm: string,
  pageIndex: number,
  lineIndex: number,
): SearchTextMatch[] => {
  if (!searchTerm.trim()) return [];
  const searchable = line.map((item) => item.str).join(" ");
  const expression = new RegExp(escapeRegExp(searchTerm.trim()).replace(/\\\s+/g, "\\s+"), "gi");
  const matches: SearchTextMatch[] = [];
  let result: RegExpExecArray | null;

  while ((result = expression.exec(searchable))) {
    const start = result.index;
    const end = start + result[0].length;
    let offset = 0;
    let first: SearchTextItem | undefined;
    let last: SearchTextItem | undefined;
    let firstStart = 0;
    let lastEnd = 0;

    for (const item of line) {
      const itemStart = offset;
      const itemEnd = offset + item.str.length;
      if (!first && itemEnd > start) {
        first = item;
        firstStart = itemStart;
      }
      if (itemStart < end) {
        last = item;
        lastEnd = Math.min(item.str.length, end - itemStart);
      }
      offset = itemEnd + 1;
    }

    if (!first || !last) continue;

    const firstOffset = Math.max(0, start - firstStart);
    const matchStart = getTextPoint(first, firstOffset);
    const matchEnd = getTextPoint(last, Math.max(0, lastEnd));
    const fontSize = getFontSize(first);

    matches.push({
      id: `p${pageIndex + 1}-l${lineIndex}-m${matches.length}`,
      pageIndex,
      text: result[0],
      x: matchStart[0],
      y: matchStart[1],
      width: Math.max(Math.hypot(matchEnd[0] - matchStart[0], matchEnd[1] - matchStart[1]), 1),
      height: Math.max(first.height, fontSize),
      fontSize,
      rotation: getRotation(first),
      fontName: first.fontName,
      selected: true,
    });
  }
  return matches;
};

export const findTextMatches = (items: SearchTextItem[], searchTerm: string, pageIndex: number) =>
  getLineItems(items).flatMap((line, lineIndex) => findLineMatches(line, searchTerm, pageIndex, lineIndex));
