import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { GetState, SetState } from "../../common/storeUtils";

export type PDFFile = {
  key: string;
  file: File;
  name: string;
  commands: Command[];
  currentPage: number;
};

export interface Command {
  type: string;
  apply: (file: PDFFile) => PDFFile[];
  preview: (file: PDFFile) => PDFFile[];
}

export type SplitPDF = {
  type: "SplitPDF";
  input: PDFFile;
  splitAfterPage: number[];
};

export type JoinPDF = {
  type: "JoinPDF";
  input: PDFFile[];
};

export type PDFReplaceText = {
  type: "PDFReplaceText";
  input: PDFFile[];
  pattern: string;
  replacement: string;
  adjustHorizontally: "right" | "center" | "left";
  adjustVertically: "right" | "center" | "left";
};

export type AdjustPDFDimensions = {
  type: "PDFReplaceText";
  input: PDFFile;
  adjustBy: "width" | "height";
};

const getPDFStore = () =>
  function store(set: SetState<typeof store>, get: GetState<typeof store>) {
    return {
      files: [] as PDFFile[],

      actions: {
        addFiles: (newFiles: File[]) =>
          set(({ files }) => {
            files.unshift(
              ...newFiles.map(file => ({
                file,
                key: uuidv4(),
                name: file.name,
                commands: [],
                currentPage: 1,
              }))
            );
          }),

        
        addFile: (file: File) => get().actions.addFiles([file]),

        removeFile: (ketToRemove: string) =>
          set((state) => {
            state.files = state.files.filter(({ key }) => key !== ketToRemove);
          }),
      },
    };
  };

const usePDFStore = create(immer(getPDFStore()));

export const usePdfStoreActions = () => usePDFStore((store) => store.actions);
export const usePdfStoreFiles = () => usePDFStore((store) => store.files);
