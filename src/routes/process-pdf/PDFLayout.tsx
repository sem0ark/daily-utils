import { useState, PropsWithChildren } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Outlet } from "react-router";
import { FileUpload } from "./UploadFile";
import clsx from "clsx";
import { usePdfStoreActions, usePdfStoreFiles } from "./pdfStore";
import { PDFPageCard } from "./PDFPagePreview";

export const PDFLayout = () => {
  const files = usePdfStoreFiles();

  return (
    <>
      <Outlet />
      <BottomTray initialOpen={true}>
        
        {files.map(file => (
          <PDFPageCard
            file={file}
            key={file.key}
            pageNumber={1}
            width={196}
          />
        ))}
      </BottomTray>
    </>
  );
};

const BottomTray = ({
  children,
  initialOpen = false,
}: PropsWithChildren<{
  initialOpen?: boolean;
  trayHeightPx?: number;
  buttonText?: string;
}>) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const { addFile } = usePdfStoreActions();

  return (
    <div
      className={clsx(
        "fixed right-0 bottom-0 left-0 z-50 transform scroll-auto border-t-2 border-gray-200 bg-white shadow-lg transition-transform duration-300 ease-in-out",
        isOpen ? "translate-y-0" : "translate-y-full",
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          "absolute left-2 z-50 flex -translate-y-full items-center space-x-2 rounded-t-lg border-2 border-gray-200 bg-neutral-50 px-7 py-2 hover:bg-neutral-300"
        }
        aria-expanded={isOpen}
        aria-controls="bottom-tray-content"
      >
        {isOpen ? (
          <ChevronDownIcon className="size-5" />
        ) : (
          <ChevronUpIcon className="size-5" />
        )}
      </button>

      <div
        id="bottom-tray-content"
        className={clsx("h-48 p-2 flex flex-row gap-2", !isOpen && "transparent")}
      >
        <FileUpload className="h-full w-20" onFileUpload={(file) => {
          if(!file) return;
          addFile(file);
        }} />

        <div className={"h-full flex flex-row gap-2 flex-nowrap overflow-scroll"}>
          {children}
        </div>
      </div>
    </div>
  );
};
