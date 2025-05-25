import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { SetState } from "../../common/storeUtils";


export type PDFFile = {
  key: string;
  file: File;
  name: string;
  commands: {type: string}[]
  currentPage: number;
}

export type SplitPDF = {
  type: "SplitPDF";
  input: PDFFile;
  splitAfterPage: number[];
}

export type JoinPDF = {
  type: "JoinPDF";
  input: PDFFile[];
}

export type PDFReplaceText = {
  type: "PDFReplaceText";
  input: PDFFile[];
  pattern: string;
  replacement: string;
  adjustHorizontally: "right" | "center" | "left";
  adjustVertically: "right" | "center" | "left";
}

export type AdjustPDFDimensions = {
  type: "PDFReplaceText";
  input: PDFFile;
  adjustBy: "width" | "height"
}


const getPDFStore = () => function store(set: SetState<typeof store>) {
  return {
    files: [] as PDFFile[],

    actions: {
      addFile: (file: File) => set(({ files }) => {
        files.push({
          file,
          key: Math.random().toFixed(5),
          name: file.name,
          commands: [],
          currentPage: 1,
        })
      })
    }
  }
}

const usePDFStore = create(immer(getPDFStore()))

export const usePdfStoreActions = () => usePDFStore(store => store.actions)
export const usePdfStoreFiles = () => usePDFStore(store => store.files)