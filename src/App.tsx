import { HashRouter, Route, Routes } from "react-router";
import { HomeLayout } from "./routes/HomeLayout";
import { Home } from "./routes/Home";
import { EchoText } from "./routes/EchoText";
import { TextToPrompt } from "./routes/TextToPrompt";
import { FormatMarkdown } from "./routes/FormatMarkdown";
import { PDFLayout } from "./routes/process-pdf/PDFLayout";
import { pdfjs } from "react-pdf";
import { PDFHome } from "./routes/process-pdf/PDFHome";
import { SplitPdfPage } from "./routes/process-pdf/SplitPDF";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<HomeLayout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="echo" element={<EchoText />} />
          <Route path="prompts" element={<TextToPrompt />} />
          <Route path="markdown" element={<FormatMarkdown />} />
          <Route path="pdf-processing" element={<PDFLayout />}>
            <Route index element={<PDFHome />} />
            <Route path="pdf-split" element={<SplitPdfPage />} />
            <Route path="pdf-replace" element={<div />} />
            <Route path="pdf-replace" element={<div />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
