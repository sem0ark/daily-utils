import { HashRouter, Outlet, Route, Routes, Link } from "react-router";

import { EchoText } from "./pages/EchoText";

import { HomeIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { PropsWithChildren } from "react";
import { TextToPrompt } from "./pages/TextToPrompt";

function Layout() {
  return (
    <>
      <div className="mx-auto mb-1 max-w-7xl">
        <nav className="flex flex-row gap-2 border-b-2 border-b-slate-300 p-2">
          <Link to="/">
            <HomeIcon className="size-8 h-full transition-colors duration-200 hover:text-blue-500" />
          </Link>
        </nav>
      </div>

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </>
  );
}

function Card({
  name,
  path,
  children,
}: PropsWithChildren<{ name: string; path: string }>) {
  return (
    <div className="mx-auto w-fit max-w-lg rounded-lg border-2 border-neutral-500 bg-neutral-50 p-4">
      <Link
        to={path}
        className="text-xl font-bold text-blue-500"
        title={"Go to " + name}
      >
        {name}
      </Link>

      <div className="flex w-full flex-col p-2">{children}</div>

      <Link
        to={path}
        className="flex items-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-xl font-bold text-blue-500 transition-all hover:gap-4 hover:border-neutral-100 hover:text-blue-600"
        title={"Go to " + name}
      >
        GO <ArrowRightIcon className="inline size-6" />
      </Link>
    </div>
  );
}

function Home() {
  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">
        Daily Utils
      </h1>
      <div className="grid items-center gap-16">
        <Card name="Echo text" path="/echo">
          Utility script that just outputs the text back to the user in order to
          translate it with Google Translate plugin. It is useful because like
          that there will be no character limit that breaks the translation.
        </Card>

        <Card name="Text to promts" path="/prompts">
          It includes functionality to copy the processed text to clipboard,
          optionally wrapped into a custom text for prompts.
        </Card>
      </div>
    </>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="echo" element={<EchoText />} />
          <Route path="prompts" element={<TextToPrompt />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
