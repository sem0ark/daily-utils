import { Page, Document } from "react-pdf";
import { PDFFile } from "./pdfStore";

export const PDFPageCard = ({
  file,
  pageNumber,
  width,
}: {
  file: PDFFile;
  pageNumber: number;
  width: number;
}) => {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl border-2 border-neutral-200 w-[${width}px] min-w-[${width}px] h-full`}
    >
      <Document file={file.file}>
        <Page pageNumber={pageNumber} width={width} />
      </Document>

      <p className="absolute bottom-0 w-full border-t-2 border-neutral-200 bg-neutral-50 text-center text-wrap break-all">
        {file.name}
      </p>

      <div className="absolute top-0 right-0 flex size-5 items-center justify-center rounded-full bg-blue-500 p-1 text-center text-white">
        {file.commands.length}
      </div>

      <div className="absolute top-0 left-0 z-10 flex h-full w-full flex-col items-center justify-evenly gap-2 p-2 transition-all duration-200 not-hover:opacity-0 hover:bg-neutral-200">
        <button className="h-full w-full rounded-md bg-blue-400/50 px-4 py-2 text-lg text-white hover:bg-blue-500">
          Download
        </button>
        <button className="h-full w-full rounded-md bg-red-400/50 px-4 py-2 text-lg text-white hover:bg-red-500">
          Delete
        </button>
      </div>
    </div>
  );
};
