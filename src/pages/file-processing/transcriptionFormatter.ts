import {
  kernelDensityEstimation,
  min as ssMin,
  max as ssMax,
  median as ssMedian,
  standardDeviation as ssStdDev,
  quantile as ssQuantile,
  interquartileRange as ssIqr,
} from "simple-statistics";

export interface Json3Segment {
  utf8?: string;
  tOffsetMs?: number;
}

export interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  id?: number;
  wWinId?: number;
  wpWinPosId?: number;
  wsWinStyleId?: number;
  aAppend?: number;
  segs?: Json3Segment[];
}

export interface Json3Data {
  wireMagic?: string;
  pens?: unknown[];
  wsWinStyles?: unknown[];
  wpWinPositions?: unknown[];
  events?: Json3Event[];
}

interface Word {
  text: string;
  rawText: string;
  timestampMs: number;
  isEventEnd: boolean;
}

interface Sentence {
  words: Word[];
  startMs: number;
  endMs: number;
  text: string;
}

interface Paragraph {
  sentences: Sentence[];
  text: string;
}

interface SegmentationOptions {
  sentenceThreshold?: number;
  /** Lower = more paragraph splits. Multiplier on Silverman bandwidth. */
  paragraphBandwidthScale?: number;
  /** Lower = more sentence splits. Multiplier on Silverman bandwidth for word-gap KDE. */
  sentenceBandwidthScale?: number;
  /** Quantile used as fallback when KDE finds no valleys (0–1). Lower = more splits. */
  fallbackQuantile?: number;
  kdeSamples?: number;
  /** Percentile at which to winsorize gaps before KDE (to tame lecture outliers). */
  winsorizePercentile?: number;
}

interface KdeAnalysis {
  threshold: number;
  densityX: number[];
  densityY: number[];
  valleys: number[];
  peaks: number[];
  bandwidth: number;
}

export interface SegmentationResult {
  paragraphs: Paragraph[];
  words: Word[];
  sentences: Sentence[];
  debug: {
    sentenceBoundaryScores: number[];
    interSentenceGaps: number[];
    interWordGaps: number[];
    sentenceGapKde: KdeAnalysis | null;
    paragraphGapKde: KdeAnalysis | null;
  };
}

function parseWordsFromJson3(data: Json3Data): Word[] {
  const words: Word[] = [];
  const events = data.events ?? [];

  for (const event of events) {
    const segs = event.segs;
    if (!segs) continue;
    const tStart = event.tStartMs ?? 0;

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const utf8 = seg.utf8 ?? "";
      const tOffset = seg.tOffsetMs ?? 0;
      if (!utf8.trim()) continue;

      words.push({
        text: utf8.trim(),
        rawText: utf8,
        timestampMs: tStart + tOffset,
        isEventEnd: i === segs.length - 1,
      });
    }
  }

  return words;
}

/** Median Absolute Deviation — robust replacement for stdDev. */
function mad(data: number[]): number {
  const med = ssMedian(data);
  const deviations = data.map((d) => Math.abs(d - med));
  return ssMedian(deviations);
}

/**
 * Robust z-score using median and MAD instead of mean and stdDev.
 * Outliers barely affect median/MAD, so normal sentence gaps score high.
 */
function robustZScore(value: number, med: number, madValue: number): number {
  const consistentMad = madValue * 1.4826;
  if (consistentMad === 0) return value > med ? 1 : 0;
  return (value - med) / consistentMad;
}

/**
 * Cap values at the given percentile to tame extreme outliers before feeding into KDE (prevents bandwidth blowup).
 */
function winsorize(data: number[], upperPercentile: number): number[] {
  const cap = ssQuantile(data, upperPercentile);
  return data.map((v) => Math.min(v, cap));
}

function computeInterWordGaps(words: Word[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < words.length; i++) {
    gaps.push(Math.max(0, words[i].timestampMs - words[i - 1].timestampMs));
  }
  return gaps;
}

function endsWithSentencePunctuation(text: string): boolean {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  return ".!?".includes(trimmed[trimmed.length - 1]);
}

function endsWithMidPunctuation(text: string): boolean {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  return ",;:".includes(trimmed[trimmed.length - 1]);
}

function startsWithCapital(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed) return false;
  return trimmed[0] >= "A" && trimmed[0] <= "Z";
}

const SENTENCE_STARTERS = new Set([
  "the",
  "a",
  "an",
  "this",
  "that",
  "these",
  "those",
  "i",
  "we",
  "he",
  "she",
  "they",
  "it",
  "you",
  "so",
  "and",
  "but",
  "however",
  "therefore",
  "meanwhile",
  "now",
  "then",
  "today",
  "here",
  "there",
  "let",
  "well",
  "ok",
  "okay",
  "alright",
  "all",
  "first",
  "second",
  "next",
  "finally",
  "also",
  "another",
  "what",
  "why",
  "how",
  "when",
  "where",
  "who",
  "if",
  "once",
  "after",
  "before",
  "because",
]);

function silvermanBandwidth(data: number[]): number {
  const n = data.length;
  if (n < 2) return 1;
  const std = ssStdDev(data);
  const iqr = ssIqr(data);
  const spread = Math.min(std, iqr / 1.34);
  return 0.9 * spread * Math.pow(n, -0.2);
}

function findValleys(y: number[]): number[] {
  const valleys: number[] = [];
  for (let i = 1; i < y.length - 1; i++) {
    if (y[i] < y[i - 1] && y[i] < y[i + 1]) valleys.push(i);
  }
  return valleys;
}

function findPeaks(y: number[]): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < y.length - 1; i++) {
    if (y[i] > y[i - 1] && y[i] > y[i + 1]) peaks.push(i);
  }
  return peaks;
}

function kdeAnalyzeGaps(
  rawGaps: number[],
  bandwidthScale: number,
  fallbackQuantile: number,
  nSamples: number,
  winsorizeAt: number,
): KdeAnalysis {
  const gaps = winsorize(rawGaps, winsorizeAt);

  let bandwidth = silvermanBandwidth(gaps) * bandwidthScale;
  bandwidth = Math.max(bandwidth, 1);

  const kde = kernelDensityEstimation(gaps, "gaussian", bandwidth);

  const minGap = ssMin(gaps);
  const maxGap = ssMax(gaps);
  const range = maxGap - minGap;
  const sampleMin = Math.max(0, minGap - range * 0.1);
  const sampleMax = maxGap + range * 0.1;
  const step = (sampleMax - sampleMin) / (nSamples - 1);

  const densityX: number[] = [];
  const densityY: number[] = [];

  for (let i = 0; i < nSamples; i++) {
    const x = sampleMin + i * step;
    densityX.push(x);
    densityY.push(kde(x));
  }

  const valleyIndices = findValleys(densityY);
  const peakIndices = findPeaks(densityY);

  const valleys = valleyIndices.map((i) => densityX[i]);
  const peaks = peakIndices.map((i) => densityX[i]);

  let threshold: number;
  if (valleys.length > 0) {
    threshold = valleys[0];
  } else {
    threshold = ssQuantile(gaps, fallbackQuantile);
  }

  return { threshold, densityX, densityY, valleys, peaks, bandwidth };
}

function computeSentenceBoundaryScores(
  words: Word[],
  gaps: number[],
  sentenceGapThreshold: number | null,
): number[] {
  if (gaps.length === 0) return [];

  // Robust statistics — immune to long lecture pauses
  const medGap = ssMedian(gaps);
  const madGap = mad(gaps);

  const scores: number[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    let score = 0;
    const currentText = words[i].text;
    const nextText = words[i + 1].text;
    const gap = gaps[i];

    if (endsWithSentencePunctuation(currentText)) {
      score += 4.0;
      if (currentText.endsWith("...")) score -= 1.0;
    } else if (endsWithMidPunctuation(currentText)) {
      score -= 1.0;
    }

    if (startsWithCapital(nextText)) {
      score += 1.5;
      if (SENTENCE_STARTERS.has(nextText.trim().toLowerCase())) score += 0.5;
    } else {
      score -= 0.5;
    }

    const rz = robustZScore(gap, medGap, madGap);
    score += Math.min(rz * 1.0, 4.0); // cap contribution to avoid one feature dominating

    if (sentenceGapThreshold !== null && gap >= sentenceGapThreshold) {
      score += 3.0;
    }

    if (words[i].isEventEnd) score += 1.5;

    if (
      currentText.replace(/[.,!?;:]/g, "").length <= 2 &&
      !endsWithSentencePunctuation(currentText)
    ) {
      score -= 0.5;
    }

    scores.push(score);
  }

  return scores;
}

function detectSentenceBoundaries(
  words: Word[],
  gaps: number[],
  threshold: number,
  sentenceGapThreshold: number | null,
): number[] {
  const scores = computeSentenceBoundaryScores(
    words,
    gaps,
    sentenceGapThreshold,
  );
  const boundaries: number[] = [];

  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= threshold) {
      boundaries.push(i);
    }
  }

  const lastIdx = words.length - 1;
  if (
    boundaries.length === 0 ||
    boundaries[boundaries.length - 1] !== lastIdx
  ) {
    boundaries.push(lastIdx);
  }

  return [...new Set(boundaries)].sort((a, b) => a - b);
}

function buildSentences(words: Word[], boundaryIndices: number[]): Sentence[] {
  const sentences: Sentence[] = [];
  let prevIdx = 0;

  for (const bIdx of boundaryIndices) {
    const sentenceWords = words.slice(prevIdx, bIdx + 1);
    if (sentenceWords.length > 0) {
      let text = sentenceWords
        .map((w) => w.rawText.trim())
        .join(" ")
        .trim();
      if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);
      if (text.length > 0 && !endsWithSentencePunctuation(text)) text += ".";

      sentences.push({
        words: sentenceWords,
        startMs: sentenceWords[0].timestampMs,
        endMs: sentenceWords[sentenceWords.length - 1].timestampMs,
        text,
      });
    }
    prevIdx = bIdx + 1;
  }

  return sentences;
}

function buildParagraphs(
  sentences: Sentence[],
  boundaryIndices: number[],
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let prevIdx = 0;

  for (const bIdx of boundaryIndices) {
    const paraSentences = sentences.slice(prevIdx, bIdx + 1);
    if (paraSentences.length > 0) {
      paragraphs.push({
        sentences: paraSentences,
        text: paraSentences.map((s) => s.text).join(" "),
      });
    }
    prevIdx = bIdx + 1;
  }

  if (prevIdx < sentences.length) {
    const remaining = sentences.slice(prevIdx);
    if (remaining.length > 0) {
      paragraphs.push({
        sentences: remaining,
        text: remaining.map((s) => s.text).join(" "),
      });
    }
  }

  return paragraphs;
}

function detectParagraphBoundaries(
  sentences: Sentence[],
  bandwidthScale: number,
  fallbackQuantile: number,
  nSamples: number,
  winsorizeAt: number,
): { boundaries: number[]; kdeAnalysis: KdeAnalysis | null } {
  if (sentences.length < 2) {
    return { boundaries: [sentences.length - 1], kdeAnalysis: null };
  }

  const gaps: number[] = [];
  for (let i = 1; i < sentences.length; i++) {
    gaps.push(Math.max(0, sentences[i].startMs - sentences[i - 1].endMs));
  }

  if (gaps.length < 2) {
    return { boundaries: [sentences.length - 1], kdeAnalysis: null };
  }

  const kdeAnalysis = kdeAnalyzeGaps(
    gaps,
    bandwidthScale,
    fallbackQuantile,
    nSamples,
    winsorizeAt,
  );

  const boundaries: number[] = [];
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] >= kdeAnalysis.threshold) {
      boundaries.push(i);
    }
  }

  const lastIdx = sentences.length - 1;
  if (
    boundaries.length === 0 ||
    boundaries[boundaries.length - 1] !== lastIdx
  ) {
    boundaries.push(lastIdx);
  }

  return {
    boundaries: [...new Set(boundaries)].sort((a, b) => a - b),
    kdeAnalysis,
  };
}

export function segmentTranscript(
  data: Json3Data,
  options: SegmentationOptions = {},
): SegmentationResult {
  const {
    sentenceThreshold = 6.0,
    paragraphBandwidthScale = 1.5,
    sentenceBandwidthScale = 1.0,
    fallbackQuantile = 0.3,
    kdeSamples = 1000,
    winsorizePercentile = 0.95,
  } = options;

  const words = parseWordsFromJson3(data);
  if (words.length === 0) {
    return {
      paragraphs: [],
      words: [],
      sentences: [],
      debug: {
        sentenceBoundaryScores: [],
        interSentenceGaps: [],
        interWordGaps: [],
        sentenceGapKde: null,
        paragraphGapKde: null,
      },
    };
  }

  // Word gaps
  const interWordGaps = computeInterWordGaps(words);

  // KDE on word gaps to find sentence-level gap threshold
  let sentenceGapKde: KdeAnalysis | null = null;
  let sentenceGapThreshold: number | null = null;

  if (interWordGaps.length >= 3) {
    sentenceGapKde = kdeAnalyzeGaps(
      interWordGaps,
      sentenceBandwidthScale,
      fallbackQuantile,
      kdeSamples,
      winsorizePercentile,
    );
    sentenceGapThreshold = sentenceGapKde.threshold;
  }

  // Sentence boundary detection
  const sentenceBoundaryScores = computeSentenceBoundaryScores(
    words,
    interWordGaps,
    sentenceGapThreshold,
  );
  const sentenceBoundaryIndices = detectSentenceBoundaries(
    words,
    interWordGaps,
    sentenceThreshold,
    sentenceGapThreshold,
  );

  const sentences = buildSentences(words, sentenceBoundaryIndices);

  // Inter-sentence gaps
  const interSentenceGaps: number[] = [];
  for (let i = 1; i < sentences.length; i++) {
    interSentenceGaps.push(
      Math.max(0, sentences[i].startMs - sentences[i - 1].endMs),
    );
  }

  // Paragraph boundaries
  const { boundaries: paraBoundaryIndices, kdeAnalysis: paragraphGapKde } =
    detectParagraphBoundaries(
      sentences,
      paragraphBandwidthScale,
      fallbackQuantile,
      kdeSamples,
      winsorizePercentile,
    );

  const paragraphs = buildParagraphs(sentences, paraBoundaryIndices);

  return {
    paragraphs,
    words,
    sentences,
    debug: {
      sentenceBoundaryScores,
      interSentenceGaps,
      interWordGaps,
      sentenceGapKde,
      paragraphGapKde,
    },
  };
}

export function formatAsText(result: SegmentationResult): string {
  return result.paragraphs.map((p) => p.text).join("\n\n");
}
