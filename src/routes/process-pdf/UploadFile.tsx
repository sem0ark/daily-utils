import { ArrowUpTrayIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useState, useRef } from "react";

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
  onFileUpload: (file: File[]) => void;
  allowedFileTypes?: string[];
  className: string;
}) => {
  const [highlight, setHighlight] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!(files && files.length)) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && validateFile(file, allowedFileTypes)) {
        validFiles.push(file);
      }
    }

    onFileUpload(validFiles)
  };

  const openFileExplorer = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={clsx(
        className,
        "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 px-6 py-6 duration-100 hover:border-3",
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
          handleFiles(e.dataTransfer.files);
          e.dataTransfer.clearData();
        }
      }}
      onClick={openFileExplorer}
    >
      <ArrowUpTrayIcon className="size-10 duration-100 group-hover:scale-110" />
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        accept={allowedFileTypes.join(",")}
        className="hidden"
        multiple={true}
      />
    </div>
  );
};
