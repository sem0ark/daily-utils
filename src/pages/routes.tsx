import { lazy, ReactElement, Suspense } from "react";
import {
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  DocumentTextIcon,
  HomeIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

import { Home } from "./Home";

export interface NavItem {
  name: string;
  path: string;
  description?: string;
  icon: React.ElementType;
  element: React.ReactNode;
  showInHome: boolean;
}

const EchoText = lazy(() =>
  import("./text-processing/EchoText").then((m) => ({ default: m.EchoText })),
);
const TextToPrompt = lazy(() =>
  import("./text-processing/TextToPrompt").then((m) => ({
    default: m.TextToPrompt,
  })),
);
const FormatMarkdown = lazy(() =>
  import("./text-processing/FormatMarkdown").then((m) => ({
    default: m.FormatMarkdown,
  })),
);

const Kanban = lazy(() =>
  import("./todo-board/TodoBoard").then((m) => ({
    default: m.KanbanBoard,
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
    description:
      "Bypass character text translation limits in Google Translate.",
    icon: ChatBubbleLeftRightIcon,
    element: lazyLoad(EchoText),
    showInHome: true,
  },
  {
    name: "Text to Prompts",
    path: "/text-processing/prompts",
    description: "Template-based prompt generation with clipboard support.",
    icon: CommandLineIcon,
    element: lazyLoad(TextToPrompt),
    showInHome: true,
  },
  {
    name: "Format Markdown",
    path: "/text-processing/markdown",
    description:
      "Format markdown to standardize list bullets and italic markers.",
    icon: DocumentTextIcon,
    element: lazyLoad(FormatMarkdown),
    showInHome: true,
  },
  {
    name: "TODO Kanban Board",
    path: "/todo",
    description: "TODO Kanban board.",
    icon: CheckBadgeIcon,
    element: lazyLoad(Kanban),
    showInHome: true,
  },
];
