import { lazy, ReactElement, Suspense } from "react";
import {
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  DocumentTextIcon,
  HomeIcon,
  CodeBracketIcon,
  PresentationChartBarIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";

import { Home } from "./Home";
import { EchoText } from "./text-processing/EchoText";
import { FormatMarkdown } from "./text-processing/FormatMarkdown";

const TextToPrompt = lazy(() =>
  import("./text-processing/TextToPrompt").then((m) => ({
    default: m.TextToPrompt,
  })),
);

const PDFToText = lazy(() =>
  import("./file-processing/PDFToText").then((m) => ({
    default: m.PDFToText,
  })),
);

const PPTXToText = lazy(() =>
  import("./file-processing/PPTXToText").then((m) => ({
    default: m.PPTXToText,
  })),
);

const TranscriptToText = lazy(() =>
  import("./file-processing/TranscriptToText").then((m) => ({
    default: m.TranscriptToText,
  })),
);

// Wrap lazy components in Suspense with a consistent loader
const lazyLoad = (Component: React.LazyExoticComponent<() => ReactElement>) => (
  <Suspense
    fallback={
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-blue-500" />
      </div>
    }
  >
    <Component />
  </Suspense>
);

interface NavItem {
  name: string;
  path: string;
  description?: string;
  tags: string[]; // Added for invisible search
  icon: React.ElementType;
  element: React.ReactNode;
  showInHome: boolean;
  showInCommandMenu: boolean;
}

export const NAVIGATION_CONFIG: NavItem[] = [
  {
    name: "Home",
    description: "Application home.",
    tags: ["home"],
    path: "/",
    icon: HomeIcon,
    element: <Home />,
    showInHome: false,
    showInCommandMenu: false,
  },
  {
    name: "Echo Text",
    path: "/text-processing/echo",
    description: "Avoid Google Translate pagination clipping.",
    tags: ["translate", "bypass", "split", "repeat", "google"],
    icon: ChatBubbleLeftRightIcon,
    element: <EchoText />,
    showInHome: true,
    showInCommandMenu: true,
  },
  {
    name: "Text to Prompts",
    path: "/text-processing/prompts",
    description: "Template-based AI prompt generator.",
    tags: ["llm", "gpt", "template", "ai", "bulk", "clipboard"],
    icon: CommandLineIcon,
    element: lazyLoad(TextToPrompt),
    showInHome: true,
    showInCommandMenu: true,
  },
  {
    name: "Format Markdown",
    path: "/text-processing/markdown",
    description: "Standardize list styles and markers.",
    tags: ["clean", "lint", "prettier", "bullets", "formatting"],
    icon: CodeBracketIcon,
    element: <FormatMarkdown />,
    showInHome: true,
    showInCommandMenu: true,
  },
  {
    name: "PDF Extractor",
    path: "/pdf-to-markdown",
    description: "PDF to structured Markdown.",
    tags: ["file", "convert", "parse", "extraction", "document"],
    icon: DocumentTextIcon,
    element: lazyLoad(PDFToText),
    showInHome: true,
    showInCommandMenu: true,
  },
  {
    name: "PPTX Extractor",
    path: "/PPTX-to-markdown",
    description: "PowerPoint to Markdown text.",
    tags: ["slides", "presentation", "slideshow", "parse", "convert"],
    icon: PresentationChartBarIcon,
    element: lazyLoad(PPTXToText),
    showInHome: true,
    showInCommandMenu: true,
  },
  {
    name: "Transcript to Text",
    path: "/transcript-to-text",
    description: "Convert JSON3 transcripts to formatted text.",
    tags: ["transcript", "json3", "audio", "segmentation", "parse"],
    icon: SpeakerWaveIcon,
    element: lazyLoad(TranscriptToText),
    showInHome: true,
    showInCommandMenu: true,
  },
];
