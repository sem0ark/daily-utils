import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { GetState, SetState } from "../../common/storeUtils";
import { downloadBlob } from "../../common/downloadFile";
import { applyCommandsToPDF } from "./pdfModification";

export type PDFFile = {
  key: string;
  rawFile: File;
  name: string;
  commands: Command[];
};

export type Command =
  | ExtractRegionCommand
  | JoinPDFCommand
  | PDFReplaceTextCommand

export type ExtractRegionCommand = {
  type: "ExtractRegion";
  start: number;
  end: number;
};

export type JoinPDFCommand = {
  type: "JoinPDF";
  sourceFiles: PDFFile[];
};

export type PDFReplaceTextCommand = {
  type: "PDFReplaceText";
  pattern: string;
  replacement: string;
  adjustHorizontally: "right" | "center" | "left";
  adjustVertically: "top" | "center" | "bottom";
};

const getPDFStore = () =>
  function store(set: SetState<typeof store>, get: GetState<typeof store>) {
    return {
      files: [] as PDFFile[],
      selectedFiles: [] as PDFFile[],

      actions: {
        addFiles: (newFiles: File[]) =>
          set(({ files }) => {
            files.unshift(
              ...newFiles.map((file) => ({
                rawFile: file,
                key: uuidv4(),
                name: file.name,
                commands: [],
              })),
            );
          }),

        addFile: (file: File) => get().actions.addFiles([file]),

        removeFile: (key: string) =>
          set((state) => {
            state.files = state.files.filter((file) => file.key !== key);
            state.selectedFiles = state.selectedFiles.filter(
              (file) => file.key !== key,
            ); // Also remove from selected
          }),

        applyFileCommands: async (key: string) => {
          const initialFile = get().files.find((f) => f.key === key);
          if (!initialFile) {
            console.error(`Can't apply commands, ${key} not found.`);
            return;
          }

          if (initialFile.commands.length === 0) {
            return;
          }

          console.info(
            `File ${initialFile.name} already has some commands, applying...`,
            initialFile,
          );

          const newRawFile = await applyCommandsToPDF(initialFile);
          if (!newRawFile) {
            console.error(
              `Can't apply commands, couldn't generate a new file.`,
            );
            return;
          }

          set((state) => {
            const file = state.files.find((f) => f.key === key)!
            file.rawFile = newRawFile;
            file.commands = [];
          });
        },

        selectFile: async (key: string) => {
          const initialFile = get().files.find((f) => f.key === key);
          if (!initialFile) return;

          await get().actions.applyFileCommands(key);

          set((state) => {
            const file = state.files.find((f) => f.key === key)!;
            state.files = state.files.filter((f) => f.key !== key);
            state.selectedFiles.push(file);
          });
        },

        deselectFile: (key: string) =>
          set((state) => {
            const file = state.selectedFiles.find((f) => f.key === key);
            if (!file) return;

            state.selectedFiles = state.selectedFiles.filter(
              (f) => f.key !== key,
            );
            state.files.unshift(file); // Add back to the beginning of files
          }),

        addExtractRegionPdfFile: (
          sourceFile: PDFFile,
          startPage: number,
          endPage: number,
        ) =>
          set(({ files }) => {
            files.unshift({
              rawFile: sourceFile.rawFile,
              key: uuidv4(),
              name: `${sourceFile.name.replace(/.pdf$/, "")}[${startPage}-${endPage}].pdf`,
              commands: [
                ...sourceFile.commands,
                {
                  type: "ExtractRegion",
                  start: startPage,
                  end: endPage,
                },
              ],
            });
          }),

        addJoinPdfFiles: (sourceFiles: PDFFile[]) =>
          set(({ files }) => {
            files.unshift({
              rawFile: sourceFiles[0].rawFile,
              key: uuidv4(),
              name: `${sourceFiles.map(f => f.name.replace(/.pdf$/, "")).join("_")}_[joined].pdf`,
              commands: [
                {
                  type: "JoinPDF",
                  sourceFiles: sourceFiles
                }
              ]
            });
          }),

        downloadFile: async (fileKey: string) => {
          const targetFileEntry =
            get().files.find((f) => f.key === fileKey) ||
            get().selectedFiles.find((f) => f.key === fileKey);

          if (!targetFileEntry) {
            console.error(`File with key ${fileKey} not found for download.`);
            return;
          }

          const newPdfBlob = await applyCommandsToPDF(targetFileEntry);
          if (newPdfBlob) {
            console.info(
              `Preparing to download: ${targetFileEntry.name} with ${targetFileEntry.commands.length} commands.`,
            );
            await downloadBlob(newPdfBlob, targetFileEntry.name);
          }
        },
      },
    };
  };

const usePDFStore = create(immer(getPDFStore()));

export const usePdfStoreActions = () => usePDFStore((store) => store.actions);
export const usePdfStoreFiles = () => usePDFStore((store) => store.files);
export const usePdfStoreSelectedFiles = () => usePDFStore((store) => store.selectedFiles);
