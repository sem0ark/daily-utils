import { lazy, ReactElement, Suspense } from "react";
import {
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  DocumentTextIcon,
  HomeIcon,
  CheckBadgeIcon,
  CodeBracketIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/outline";

import { Home } from "./Home";
import { EchoText } from "./text-processing/EchoText";
import { FormatMarkdown } from "./text-processing/FormatMarkdown";

export interface NavItem {
  name: string;
  path: string;
  description?: string;
  icon: React.ElementType;
  element: React.ReactNode;
  showInHome: boolean;
}

const TextToPrompt = lazy(() =>
  import("./text-processing/TextToPrompt").then((m) => ({
    default: m.TextToPrompt,
  })),
);

const Kanban = lazy(() =>
  import("./todo-board/TodoBoard").then((m) => ({
    default: m.KanbanBoard,
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

export const NAVIGATION_CONFIG: NavItem[] = [
  {
    name: "Home",
    path: "/",
    icon: HomeIcon,
    element: <Home />,
    showInHome: false,
  },
  {
    name: "Echo Text",
    path: "/text-processing/echo",
    description: "Bypass character limits for Google Translate translation.",
    icon: ChatBubbleLeftRightIcon,
    element: <EchoText />,
    showInHome: true,
  },
  {
    name: "Text to Prompts",
    path: "/text-processing/prompts",
    description: "Generate AI prompts using templates and clipboard.",
    icon: CommandLineIcon,
    element: lazyLoad(TextToPrompt),
    showInHome: true,
  },
  {
    name: "Format Markdown",
    path: "/text-processing/markdown",
    description: "Clean and standardize Markdown list bullets and styles.",
    icon: CodeBracketIcon,
    element: <FormatMarkdown />,
    showInHome: true,
  },
  {
    name: "Task Board", // Shortened name for better search fit
    path: "/todo",
    description: "Kanban board with drag-and-drop task management.",
    icon: CheckBadgeIcon,
    element: lazyLoad(Kanban),
    showInHome: true,
  },
  {
    name: "PDF Extractor",
    path: "/pdf-to-markdown",
    description: "Convert PDF documents to structured Markdown text.",
    icon: DocumentTextIcon,
    element: lazyLoad(PDFToText),
    showInHome: true,
  },
  {
    name: "PPTX Extractor",
    path: "/PPTX-to-markdown",
    description: "Convert PowerPoint slides to structured Markdown text.",
    icon: PresentationChartBarIcon,
    element: lazyLoad(PPTXToText),
    showInHome: true,
  },
];
