import React, { useState, useCallback, useMemo } from "react";
import { usePdfStoreSelectedFiles, PDFFile } from "./pdfStore";
import { Document, Page } from "react-pdf";
import { PlayIcon } from "@heroicons/react/24/outline";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PDF_THUMBNAIL_WIDTH = 180;

const SortableJoinFileCard = React.memo(
  ({ file }: { file: PDFFile }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: file.key });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    console.log(`Rendering SortableJoinFileCard for: ${file.name}`); // Debugging re-renders

    return (
      <div
        className="relative flex cursor-grab flex-col items-center rounded-lg border-2 border-blue-300 bg-blue-50 p-3 shadow-sm"
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
      >
        <div className="flex flex-col items-center justify-center rounded-md border-2 border-neutral-300 bg-white p-2">
          <Document file={file.rawFile}>
            <Page
              pageNumber={1}
              width={PDF_THUMBNAIL_WIDTH}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>
        </div>

        <p className="mt-2 w-48 truncate text-center text-sm font-medium text-gray-800">
          {file.name}
        </p>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.file.key === nextProps.file.key
);

const MemoizedSortableFiles = React.memo(
  ({ orderedKeys, filesMap }: { orderedKeys: string[]; filesMap: Map<string, PDFFile> }) => {
    return orderedKeys.map((key) => {
      const file = filesMap.get(key);
      return file ? <SortableJoinFileCard key={file.key} file={file} /> : null;
    });
  },
  (prevProps, nextProps) => prevProps.orderedKeys.join(" ") === nextProps.orderedKeys.join(" ")
);


export const JoinPdfPage: React.FC = () => {
  const selectedFiles = usePdfStoreSelectedFiles();

  const [orderedFileKeys, setOrderedFileKeys] = useState<string[]>(() =>
    selectedFiles.map((file) => file.key),
  );

  React.useEffect(() => {
    const currentKeys = new Set(selectedFiles.map(f => f.key));
    setOrderedFileKeys(prevKeys => {
      const filteredKeys = prevKeys.filter(key => currentKeys.has(key));
      const newKeys = selectedFiles.map(f => f.key).filter(key => !prevKeys.includes(key));
      return [...filteredKeys, ...newKeys];
    });
  }, [selectedFiles]);

  const selectedFilesMap = useMemo(() => {
    const map = new Map<string, PDFFile>();
    selectedFiles.forEach((file) => map.set(file.key, file));
    return map;
  }, [selectedFiles]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedFileKeys((keys) => {
        const oldIndex = keys.indexOf(active.id as string);
        const newIndex = keys.indexOf(over.id as string);
        return arrayMove(keys, oldIndex, newIndex);
      });
    }
  }, []);

  return (
    <div className="flex flex-col overflow-hidden bg-gray-50 p-6">
      <h1 className="mb-8 w-full text-center text-3xl font-bold">Join PDFs</h1>

      <div className="mb-8 w-full rounded-lg bg-white p-4 shadow-md">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedFileKeys} strategy={verticalListSortingStrategy}>
            <div className="flex flex-wrap justify-center gap-4">
              <MemoizedSortableFiles
                orderedKeys={orderedFileKeys}
                filesMap={selectedFilesMap}
              />
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-8 flex flex-none flex-col justify-center gap-4 sm:flex-row">
        <button
          // onClick={handleJoinPDF}
          className="flex items-center justify-center rounded-lg bg-green-600 px-8 py-4 text-xl font-bold text-white shadow-md transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selectedFiles.length < 2}
        >
          <PlayIcon className="mr-3 size-6" /> Join PDFs
        </button>
      </div>
    </div>
  );
};