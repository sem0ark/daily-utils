import { HashRouter, Route, Routes } from "react-router";

import { EchoText } from "./pages/text-processing/EchoText";

import { TextToPrompt } from "./pages/text-processing/TextToPrompt";
import { FormatMarkdown } from "./pages/text-processing/FormatMarkdown";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/text-processing/Home";
import { useKeyboardNavigation } from "./pages/navigation";

const LayoutWithNavigation = () => {
  useKeyboardNavigation([
    "/text-processing/echo",
    "/text-processing/prompts",
    "/text-processing/markdown",
  ]);

  return <Layout />;
};

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<LayoutWithNavigation />}>
          <Route index element={<Home />} />
          <Route path="/text-processing/home" element={<Home />} />
          <Route path="/text-processing/echo" element={<EchoText />} />
          <Route path="/text-processing/prompts" element={<TextToPrompt />} />
          <Route
            path="/text-processing/markdown"
            element={<FormatMarkdown />}
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}
