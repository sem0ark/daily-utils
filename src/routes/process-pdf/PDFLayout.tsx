import { useMemo, useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  ArrowDownTrayIcon,
  TrashIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
} from "@heroicons/react/16/solid";
import { Outlet } from "react-router";
import { FileUpload } from "./UploadFile";
import { Page, Document } from "react-pdf";
import clsx from "clsx";
import {
  PDFFile,
  usePdfStoreActions,
  usePdfStoreFiles,
  usePdfStoreSelectedFiles,
} from "./pdfStore";

export const PDFLayout = () => {
  return (
    <>
      <Outlet />
      <BottomTray initialOpen={true} />
    </>
  );
};

const BottomTray = ({
  initialOpen = false,
}: {
  initialOpen?: boolean;
  trayHeightPx?: number;
  buttonText?: string;
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const { addFiles } = usePdfStoreActions();
  const files = usePdfStoreFiles();
  const selectedFiles = usePdfStoreSelectedFiles();

  return (
    <div
      className={clsx(
        "fixed right-0 bottom-0 left-0 z-50 transform scroll-auto border-t-2 border-neutral-200 bg-white shadow-lg transition-transform duration-300 ease-in-out",
        isOpen ? "translate-y-0" : "translate-y-full",
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          "group absolute left-2 z-50 flex -translate-y-full items-center space-x-2 rounded-t-lg border-2 border-neutral-200 bg-neutral-50 px-7 py-2 hover:bg-neutral-300"
        }
        aria-expanded={isOpen}
        aria-controls="bottom-tray-content"
      >
        {isOpen ? (
          <ChevronDownIcon className="size-5 duration-100 group-hover:scale-120" />
        ) : (
          <ChevronUpIcon className="size-5 duration-100 group-hover:scale-120" />
        )}
      </button>

      <div
        id="bottom-tray-content"
        className={clsx(
          "flex h-48 flex-row gap-2 p-2",
          !isOpen && "transparent",
        )}
      >
        <FileUpload className="h-full w-20" onFileUpload={addFiles} />
        <div
          className={"flex h-full flex-row flex-nowrap gap-2 overflow-x-scroll"}
        >
          {selectedFiles.length > 0 && (
            <div className="flex h-full w-fit flex-row flex-nowrap gap-2 rounded-lg border-2 border-lime-400 bg-lime-50 p-2">
              {selectedFiles.map((file) => (
                <PDFPageCard
                  file={file}
                  key={file.key}
                  pageNumber={1}
                  width={196}
                  isSelected={true}
                />
              ))}
            </div>
          )}

          {files.map((file) => (
            <PDFPageCard
              file={file}
              key={file.key}
              pageNumber={1}
              width={196}
              isSelected={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const PDFPageCard = ({
  file,
  pageNumber = 1,
  width,
  isSelected,
}: {
  file: PDFFile;
  pageNumber?: number;
  width: number;
  isSelected: boolean;
}) => {
  const { removeFile, selectFile, downloadFile, deselectFile } =
    usePdfStoreActions();

  const previewPage = useMemo(() => {
    let start = pageNumber;

    for (const command of file.commands) {
      if (command.type === "ExtractRegion") {
        start += command.start - 1;
      }
    }

    return start;
  }, [file, pageNumber]);

  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-lg border-2 border-neutral-200",
        "h-full",
      )}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
      }}
    >
      <Document file={file.rawFile}>
        <Page
          pageNumber={previewPage}
          width={width}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          renderForms={false}
        />
      </Document>

      <p className="absolute bottom-0 w-full border-t-2 border-neutral-200 bg-neutral-50 px-1 text-xs break-all">
        {file.name}
      </p>

      <div className="absolute top-0 right-0 flex size-5 items-center justify-center rounded-bl-lg bg-blue-500 p-1 text-center text-white">
        {file.commands.length}
      </div>

      <div className="absolute top-0 left-0 z-10 grid h-full w-full grid-cols-2 grid-rows-2 items-center justify-evenly gap-2 p-2 transition-all duration-200 not-hover:opacity-0 hover:bg-neutral-200/50">
        {isSelected ? (
          <button
            className="row-span-2 flex h-full w-full items-center justify-center rounded-md bg-red-400/50 px-4 py-2 text-lg text-white hover:bg-red-500"
            onClick={() => {
              deselectFile(file.key);
            }}
          >
            <ArrowDownCircleIcon className="size-7" />
          </button>
        ) : (
          <button
            className="row-span-2 flex h-full w-full items-center justify-center rounded-md bg-lime-400/50 px-4 py-2 text-lg text-white hover:bg-lime-500"
            onClick={() => {
              selectFile(file.key);
            }}
          >
            <ArrowUpCircleIcon className="size-7" />
          </button>
        )}

        <button
          onClick={() => {
            downloadFile(file.key);
          }}
          className="col-span-1 flex h-full w-full items-center justify-center rounded-md bg-blue-400/50 p-1 text-lg text-white hover:bg-blue-500"
        >
          <ArrowDownTrayIcon className="size-7" />
        </button>

        <button
          className="col-span-1 flex h-full w-full items-center justify-center rounded-md bg-red-400/50 p-1 text-lg text-white hover:bg-red-500"
          onClick={() => {
            removeFile(file.key);
          }}
        >
          <TrashIcon className="size-7" />
        </button>
      </div>
    </div>
  );
};
