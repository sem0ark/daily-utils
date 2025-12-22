import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
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
  className?: string;
}) => {
  const [isDragging, setIsDragging] = useState(false);
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
    onFileUpload(validFiles);
  };

  return (
    <div
      onDragEnter={() => setIsDragging(true)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={clsx(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-4 p-12 transition-all",
        "rounded-xl border-2 border-dashed",

        !isDragging &&
          "border-neutral-400 bg-neutral-50 hover:border-neutral-600 hover:bg-white",
        isDragging && "border-blue-500 bg-blue-50 ring-4 ring-blue-500/10",
        className,
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        accept={allowedFileTypes.join(",")}
        className="hidden"
        multiple
      />

      <div
        className={clsx(
          "flex flex-col items-center gap-2 transition-transform duration-200",
          isDragging ? "scale-110" : "group-hover:scale-105",
        )}
      >
        <div className="rounded-full border-2 border-neutral-500 bg-neutral-100 p-4 text-blue-500 group-hover:border-blue-500 group-hover:bg-white">
          <ArrowUpTrayIcon className="size-8 stroke-2" />
        </div>
      </div>
    </div>
  );
};
