import {
  kernelDensityEstimation,
  min as ssMin,
  max as ssMax,
  mean as ssMean,
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
  sentenceMethod?: "threshold" | "kde";
  paragraphMethod?: "kde" | "percentile";
  useTopicShift?: boolean;
  topicWindowSize?: number;
  kdeBandwidth?: number | "silverman" | "scott";
  kdeKernel?: "gaussian" | "epanechnikov";
  kdeSamples?: number;
  maxSentenceGapMs?: number;
  maxParagraphGapMs?: number;
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
    topicShiftScores: number[];
    kdeAnalysis: KdeAnalysis | null;
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

// ─── FEATURE HELPERS ──────────────────────────────────────────────────────────

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
  "the", "a", "an", "this", "that", "these", "those",
  "i", "we", "he", "she", "they", "it", "you",
  "so", "and", "but", "however", "therefore", "meanwhile",
  "now", "then", "today", "here", "there",
  "let", "well", "ok", "okay", "alright", "all",
  "first", "second", "next", "finally", "also", "another",
  "what", "why", "how", "when", "where", "who",
  "if", "once", "after", "before", "because",
]);

function isSentenceStarter(text: string): boolean {
  return SENTENCE_STARTERS.has(text.trim().toLowerCase());
}

// ─── SENTENCE BOUNDARY DETECTION ─────────────────────────────────────────────

function computeSentenceBoundaryScores(
  words: Word[],
  gaps: number[]
): number[] {
  if (gaps.length === 0) return [];

  const meanGap = ssMean(gaps);
  const stdGap = ssStdDev(gaps);

  const scores: number[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    let score = 0;
    const currentText = words[i].text;
    const nextText = words[i + 1].text;

    // Feature 1: Terminal punctuation
    if (endsWithSentencePunctuation(currentText)) {
      score += 5.0;
      if (currentText.endsWith("...") || currentText.endsWith("etc.")) {
        score -= 1.5;
      }
    } else if (endsWithMidPunctuation(currentText)) {
      score -= 1.5;
    } else {
      score -= 0.5;
    }

    // Feature 2: Capitalization of next word
    if (startsWithCapital(nextText)) {
      score += 1.5;
      if (isSentenceStarter(nextText)) {
        score += 0.5;
      }
    } else {
      score -= 1.0;
    }

    // Feature 3: Time gap z-score
    const gap = gaps[i];
    if (stdGap > 0) {
      const zScore = (gap - meanGap) / stdGap;
      score += zScore * 0.8;
    } else if (gap > meanGap * 2) {
      score += 1.0;
    }

    // Feature 4: Short function words unlikely to end sentences
    const strippedCurrent = currentText.replace(/[.,!?;:]/g, "");
    if (
      strippedCurrent.length <= 2 &&
      !endsWithSentencePunctuation(currentText)
    ) {
      score -= 0.5;
    }

    // Feature 5: Coordinating conjunctions as next word suggest continuation
    const nextLower = nextText.toLowerCase().trim();
    if (
      ["and", "or", "but", "nor"].includes(nextLower) &&
      !endsWithSentencePunctuation(currentText)
    ) {
      score -= 0.3;
    }

    // Feature 6: Event boundary (strongly suggests sentence break in many ASR engines)
    if (words[i].isEventEnd) {
      score += 2.0;
    }

    scores.push(score);
  }

  return scores;
}

function detectSentenceBoundariesKde(
  words: Word[],
  gaps: number[],
  options: {
    bandwidth?: number | "silverman" | "scott";
    nSamples?: number;
    maxGapMs?: number;
  } = {}
): number[] {
  const { bandwidth, nSamples, maxGapMs = 5000 } = options;

  if (gaps.length < 3) {
    const lastIdx = words.length - 1;
    return lastIdx >= 0 ? [lastIdx] : [];
  }

  // Check if there's meaningful variance
  const std = ssStdDev(gaps);
  const meanVal = ssMean(gaps);
  if (std < meanVal * 0.1) {
    // Very uniform gaps — fall back to timing
    return detectSentenceBoundariesByTiming(words, gaps);
  }

  const kdeAnalysis = kdeAnalyzeGaps(gaps, { bandwidth, nSamples });

  // Apply threshold to find sentence boundaries
  const boundaries: number[] = [];
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] > kdeAnalysis.threshold || gaps[i] >= maxGapMs) {
      boundaries.push(i);
    }
  }

  const lastIdx = words.length - 1;
  if (boundaries.length === 0 || boundaries[boundaries.length - 1] !== lastIdx) {
    boundaries.push(lastIdx);
  }

  return [...new Set(boundaries)].sort((a, b) => a - b);
}

function detectSentenceBoundaries(
  words: Word[],
  gaps: number[],
  threshold = 3.0,
  maxGapMs = 5000
): number[] {
  const scores = computeSentenceBoundaryScores(words, gaps);
  const boundaries: number[] = [];

  for (let i = 0; i < scores.length; i++) {
    // Break if score is high enough OR if the physical time gap exceeds timeout
    if (scores[i] >= threshold || gaps[i] >= maxGapMs) {
      boundaries.push(i);
    }
  }

  // Fallback to timing if no punctuation-based boundaries found
  if (boundaries.length === 0 && words.length > 0) {
    return detectSentenceBoundariesByTiming(words, gaps);
  }

  const lastIdx = words.length - 1;
  if (boundaries.length === 0 || boundaries[boundaries.length - 1] !== lastIdx) {
    boundaries.push(lastIdx);
  }

  return [...new Set(boundaries)].sort((a, b) => a - b);
}

function detectSentenceBoundariesByTiming(
  words: Word[],
  gaps: number[]
): number[] {
  if (gaps.length === 0) return words.length > 0 ? [words.length - 1] : [];

  const threshold = ssMean(gaps) + ssStdDev(gaps);
  const boundaries: number[] = [];

  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] > threshold) {
      boundaries.push(i);
    }
  }

  const lastIdx = words.length - 1;
  if (boundaries.length === 0 || boundaries[boundaries.length - 1] !== lastIdx) {
    boundaries.push(lastIdx);
  }

  return boundaries;
}

// ─── KDE PARAGRAPH BOUNDARY DETECTION ─────────────────────────────────────────

/**
 * Compute bandwidth using Silverman's rule of thumb:
 *   h = 0.9 * min(std, IQR/1.34) * n^(-1/5)
 */
function silvermanBandwidth(data: number[]): number {
  const n = data.length;
  if (n < 2) return 1;
  const std = ssStdDev(data);
  const iqr = ssIqr(data);
  const spread = Math.min(std, iqr / 1.34);
  return 0.9 * spread * Math.pow(n, -0.2);
}

/**
 * Compute bandwidth using Scott's rule:
 *   h = 1.06 * std * n^(-1/5)
 */
function scottBandwidth(data: number[]): number {
  const n = data.length;
  if (n < 2) return 1;
  return 1.06 * ssStdDev(data) * Math.pow(n, -0.2);
}

/**
 * Find local minima (valleys) in a 1D array.
 * A valley at index i satisfies: y[i-1] > y[i] < y[i+1]
 */
function findValleys(y: number[]): number[] {
  const valleys: number[] = [];
  for (let i = 1; i < y.length - 1; i++) {
    if (y[i] < y[i - 1] && y[i] < y[i + 1]) {
      valleys.push(i);
    }
  }
  return valleys;
}

/**
 * Find local maxima (peaks) in a 1D array.
 */
function findPeaks(y: number[]): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < y.length - 1; i++) {
    if (y[i] > y[i - 1] && y[i] > y[i + 1]) {
      peaks.push(i);
    }
  }
  return peaks;
}

/**
 * Use Kernel Density Estimation to find the natural threshold
 * that separates intra-paragraph gaps from inter-paragraph gaps.
 *
 * Strategy:
 *  1. Estimate the density of inter-sentence gaps with KDE
 *  2. Sample the density across the gap range
 *  3. Find valleys (local minima) in the density — these are
 *     natural separation points between gap "modes"
 *  4. Pick the deepest valley between the two tallest peaks
 *     as the paragraph boundary threshold
 */
function kdeAnalyzeGaps(
  gaps: number[],
  options: {
    bandwidth?: number | "silverman" | "scott";
    nSamples?: number;
  } = {}
): KdeAnalysis {
  const {
    bandwidth: bwOption = "silverman",
    nSamples = 200,
  } = options;

  // Compute bandwidth
  let bandwidth: number;
  if (bwOption === "silverman") {
    bandwidth = silvermanBandwidth(gaps);
  } else if (bwOption === "scott") {
    bandwidth = scottBandwidth(gaps);
  } else {
    bandwidth = bwOption;
  }

  // Ensure bandwidth is positive and meaningful
  bandwidth = Math.max(bandwidth, 1);

  // Create the KDE estimator
  const kde = kernelDensityEstimation(gaps, "gaussian", bandwidth);

  // Sample the density across the range of gaps
  const minGap = ssMin(gaps);
  const maxGap = ssMax(gaps);
  const range = maxGap - minGap;

  // Extend slightly beyond the data range
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

  // Find peaks and valleys
  const valleyIndices = findValleys(densityY);
  const peakIndices = findPeaks(densityY);

  const valleys = valleyIndices.map((i) => densityX[i]);
  const peaks = peakIndices.map((i) => densityX[i]);

  // Determine the best threshold
  let threshold: number;

  if (valleys.length > 0 && peaks.length >= 2) {
    // Find the most prominent valley: the one between the two highest peaks
    // with the lowest density value
    const peakHeights = peakIndices.map((i) => ({
      x: densityX[i],
      y: densityY[i],
      idx: i,
    }));
    peakHeights.sort((a, b) => b.y - a.y);

    if (peakHeights.length >= 2) {
      const peak1Idx = peakHeights[0].idx;
      const peak2Idx = peakHeights[1].idx;
      const leftPeak = Math.min(peak1Idx, peak2Idx);
      const rightPeak = Math.max(peak1Idx, peak2Idx);

      // Find the deepest valley between these two peaks
      let bestValley = -1;
      let bestValleyDensity = Infinity;

      for (const vIdx of valleyIndices) {
        if (vIdx > leftPeak && vIdx < rightPeak) {
          if (densityY[vIdx] < bestValleyDensity) {
            bestValleyDensity = densityY[vIdx];
            bestValley = vIdx;
          }
        }
      }

      if (bestValley >= 0) {
        threshold = densityX[bestValley];
      } else {
        // No valley between peaks; use first valley
        threshold = valleys[0];
      }
    } else {
      threshold = valleys[0];
    }
  } else if (valleys.length > 0) {
    // Just use the first valley
    threshold = valleys[0];
  } else {
    // No clear multimodality; fall back to percentile
    threshold = ssQuantile(gaps, 0.75) + 1.5 * ssIqr(gaps);
  }

  return {
    threshold,
    densityX,
    densityY,
    valleys,
    peaks,
    bandwidth,
  };
}

function detectParagraphBoundariesKde(
  sentences: Sentence[],
  options: {
    bandwidth?: number | "silverman" | "scott";
    nSamples?: number;
    maxGapMs?: number;
  } = {}
): { boundaries: number[]; kdeAnalysis: KdeAnalysis | null } {
  const { maxGapMs = 15000, bandwidth, nSamples } = options;
  const fallback = { boundaries: [sentences.length - 1], kdeAnalysis: null };

  if (sentences.length < 4) return fallback;

  const interSentenceGaps: number[] = [];
  for (let i = 1; i < sentences.length; i++) {
    interSentenceGaps.push(
      Math.max(0, sentences[i].startMs - sentences[i - 1].endMs)
    );
  }

  if (interSentenceGaps.length < 3) return fallback;

  // Check if there's meaningful variance
  const std = ssStdDev(interSentenceGaps);
  const meanVal = ssMean(interSentenceGaps);
  if (std < meanVal * 0.2) {
    // Very uniform gaps — likely no paragraph structure
    // But still respect maxGapMs
    const boundaries: number[] = [];
    for (let i = 0; i < interSentenceGaps.length; i++) {
      if (interSentenceGaps[i] >= maxGapMs) boundaries.push(i);
    }
    boundaries.push(sentences.length - 1);
    return { boundaries: [...new Set(boundaries)].sort((a, b) => a - b), kdeAnalysis: null };
  }

  const kdeAnalysis = kdeAnalyzeGaps(interSentenceGaps, { bandwidth, nSamples });

  // Apply threshold to find paragraph boundaries
  const boundaries: number[] = [];
  for (let i = 0; i < interSentenceGaps.length; i++) {
    if (interSentenceGaps[i] > kdeAnalysis.threshold || interSentenceGaps[i] >= maxGapMs) {
      boundaries.push(i);
    }
  }

  const lastIdx = sentences.length - 1;
  if (boundaries.length === 0 || boundaries[boundaries.length - 1] !== lastIdx) {
    boundaries.push(lastIdx);
  }

  return {
    boundaries: [...new Set(boundaries)].sort((a, b) => a - b),
    kdeAnalysis,
  };
}

function detectParagraphBoundariesPercentile(
  sentences: Sentence[]
): { boundaries: number[]; kdeAnalysis: null } {
  const interSentenceGaps: number[] = [];
  for (let i = 1; i < sentences.length; i++) {
    interSentenceGaps.push(
      Math.max(0, sentences[i].startMs - sentences[i - 1].endMs)
    );
  }

  if (interSentenceGaps.length === 0) {
    return { boundaries: [sentences.length - 1], kdeAnalysis: null };
  }

  const q75 = ssQuantile(interSentenceGaps, 0.75);
  const iqr = ssIqr(interSentenceGaps);
  const threshold = Math.max(
    q75 + 1.5 * iqr,
    ssMedian(interSentenceGaps) * 2
  );

  const boundaries: number[] = [];
  for (let i = 0; i < interSentenceGaps.length; i++) {
    if (interSentenceGaps[i] > threshold) {
      boundaries.push(i);
    }
  }

  const lastIdx = sentences.length - 1;
  if (boundaries.length === 0 || boundaries[boundaries.length - 1] !== lastIdx) {
    boundaries.push(lastIdx);
  }

  return {
    boundaries: [...new Set(boundaries)].sort((a, b) => a - b),
    kdeAnalysis: null,
  };
}

// ─── TOPIC SHIFT DETECTION ───────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "up", "down",
  "and", "or", "but", "not", "no", "if", "then", "so", "as", "than",
  "that", "this", "it", "i", "we", "you", "he", "she", "they", "me",
  "my", "your", "his", "her", "its", "our", "their", "us", "them",
  "what", "which", "who", "when", "where", "how", "why",
  "all", "each", "every", "both", "few", "more", "most", "some", "any",
  "just", "very", "really", "also", "too", "only", "about", "like",
]);

function getContentWords(sentence: Sentence): Set<string> {
  const words = new Set<string>();
  for (const w of sentence.words) {
    const cleaned = w.text.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleaned.length > 2 && !STOP_WORDS.has(cleaned)) {
      words.add(cleaned);
    }
  }
  return words;
}

function computeTopicShiftScores(
  sentences: Sentence[],
  windowSize = 3
): number[] {
  const scores: number[] = [];

  for (let i = 0; i < sentences.length - 1; i++) {
    const beforeWords = new Set<string>();
    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
      for (const w of getContentWords(sentences[j])) {
        beforeWords.add(w);
      }
    }

    const afterWords = new Set<string>();
    for (
      let j = i + 1;
      j < Math.min(sentences.length, i + 1 + windowSize);
      j++
    ) {
      for (const w of getContentWords(sentences[j])) {
        afterWords.add(w);
      }
    }

    if (beforeWords.size === 0 && afterWords.size === 0) {
      scores.push(0);
      continue;
    }

    let intersection = 0;
    for (const w of beforeWords) {
      if (afterWords.has(w)) intersection++;
    }
    const unionSize = new Set([...beforeWords, ...afterWords]).size;
    const similarity = unionSize > 0 ? intersection / unionSize : 0;
    scores.push(1.0 - similarity);
  }

  return scores;
}

// ─── BUILD HELPERS ────────────────────────────────────────────────────────────

function buildSentences(words: Word[], boundaryIndices: number[]): Sentence[] {
  const sentences: Sentence[] = [];
  let prevIdx = 0;

  for (const bIdx of boundaryIndices) {
    const sentenceWords = words.slice(prevIdx, bIdx + 1);
    if (sentenceWords.length > 0) {
      let text = sentenceWords.map((w) => w.rawText.trim()).join(" ").trim();
      
      if (text.length > 0) {
        text = text[0].toUpperCase() + text.slice(1);
      }
      
      if (text.length > 0 && !endsWithSentencePunctuation(text)) {
        text += ".";
      }

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
  boundaryIndices: number[]
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

// ─── MAIN PIPELINE ───────────────────────────────────────────────────────────

export function segmentTranscript(
  data: Json3Data,
  options: SegmentationOptions = {}
): SegmentationResult {
  const {
    sentenceThreshold = 3.0,
    sentenceMethod = "threshold",
    paragraphMethod = "kde",
    useTopicShift = true,
    topicWindowSize = 3,
    kdeBandwidth = "silverman",
    kdeSamples = 200,
    maxSentenceGapMs = 5000,
    maxParagraphGapMs = 15000,
  } = options;

  // 1. Parse
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
        topicShiftScores: [],
        kdeAnalysis: null,
      },
    };
  }

  // 2. Inter-word gaps
  const interWordGaps = computeInterWordGaps(words);

  // 3. Sentence boundary detection
  const sentenceBoundaryScores = computeSentenceBoundaryScores(
    words,
    interWordGaps
  );
  let sentenceBoundaryIndices: number[];

  if (sentenceMethod === "kde") {
    sentenceBoundaryIndices = detectSentenceBoundariesKde(words, interWordGaps, {
      bandwidth: kdeBandwidth,
      nSamples: kdeSamples,
      maxGapMs: maxSentenceGapMs,
    });
  } else {
    sentenceBoundaryIndices = detectSentenceBoundaries(
      words,
      interWordGaps,
      sentenceThreshold,
      maxSentenceGapMs
    );
  }

  // 4. Build sentences
  const sentences = buildSentences(words, sentenceBoundaryIndices);

  // 5. Inter-sentence gaps
  const interSentenceGaps: number[] = [];
  for (let i = 1; i < sentences.length; i++) {
    interSentenceGaps.push(
      Math.max(0, sentences[i].startMs - sentences[i - 1].endMs)
    );
  }

  // 6. Paragraph boundaries via KDE or percentile
  let paraBoundaryIndices: number[];
  let kdeAnalysis: KdeAnalysis | null = null;

  if (paragraphMethod === "kde") {
    const result = detectParagraphBoundariesKde(sentences, {
      bandwidth: kdeBandwidth,
      nSamples: kdeSamples,
      maxGapMs: maxParagraphGapMs,
    });
    paraBoundaryIndices = result.boundaries;
    kdeAnalysis = result.kdeAnalysis;
  } else {
    const result = detectParagraphBoundariesPercentile(sentences);
    paraBoundaryIndices = result.boundaries;
  }

  // 7. Topic shift refinement
  let topicShiftScores: number[] = [];
  if (useTopicShift && sentences.length > 4) {
    topicShiftScores = computeTopicShiftScores(sentences, topicWindowSize);
    const topicThreshold = ssQuantile(topicShiftScores, 0.8);
    const medianGap =
      interSentenceGaps.length > 0 ? ssMedian(interSentenceGaps) : 0;

    for (let i = 0; i < topicShiftScores.length; i++) {
      if (topicShiftScores[i] > topicThreshold) {
        const alreadyNear = paraBoundaryIndices.some(
          (b) => Math.abs(i - b) <= 1
        );
        if (!alreadyNear && i < interSentenceGaps.length) {
          if (interSentenceGaps[i] > medianGap) {
            paraBoundaryIndices.push(i);
          }
        }
      }
    }
    paraBoundaryIndices = [...new Set(paraBoundaryIndices)].sort(
      (a, b) => a - b
    );
  }

  // 8. Build paragraphs
  const paragraphs = buildParagraphs(sentences, paraBoundaryIndices);

  return {
    paragraphs,
    words,
    sentences,
    debug: {
      sentenceBoundaryScores,
      interSentenceGaps,
      interWordGaps,
      topicShiftScores,
      kdeAnalysis,
    },
  };
}

export function formatAsText(result: SegmentationResult): string {
  return result.paragraphs.map((p) => p.text).join("\n\n");
}
