import { ArrowUpTrayIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useState, useRef, ChangeEvent, useCallback } from "react";

const validateFile = (
  file: File | null,
  allowedFileTypes: string[],
): boolean => {
  if (!file) return false;
  if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(file.type)) {
    return false;
  }
  return true;
};

export const FileUpload = ({
  onFileUpload,
  allowedFileTypes = ["application/pdf"],
  className,
}: {
  onFileUpload: (file: File) => void;
  allowedFileTypes?: string[];
  className: string;
}) => {
  const [highlight, setHighlight] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      if (file && validateFile(file, allowedFileTypes)) onFileUpload(file);
    },
    [onFileUpload, allowedFileTypes],
  );

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (const file of e.target.files) handleFile(file);
    }
  };

  const openFileExplorer = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={clsx(
        className, "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-6 transition-colors duration-200",
        highlight
          ? "border-blue-500 bg-blue-50"
          : "border-neutral-300 bg-white hover:border-neutral-400",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setHighlight(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setHighlight(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setHighlight(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setHighlight(false);
        if (e.dataTransfer.files) {
          for (const file of e.dataTransfer.files) handleFile(file);
          e.dataTransfer.clearData();
        }
      }}
      onClick={openFileExplorer}
    >
      <ArrowUpTrayIcon className="size-10"/>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={allowedFileTypes.join(",")}
        className="hidden"
      />
    </div>
  );
};

// export const PDFUpload = () => {
//   const handlePdfFileSelect = (file: File | null) => {
//     if (file) {
//       console.log(
//         "PDF File selected in App.tsx:",
//         file.name,
//         file.type,
//         file.size,
//       );
//     } else {
//       console.log("PDF File cleared in App.tsx");
//     }
//   };

//   return <FileUpload onFileUpload={handlePdfFileSelect} />;
// };
