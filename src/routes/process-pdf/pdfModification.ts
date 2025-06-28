import { PDFFile } from "./pdfStore";
import { PDFDocument } from "pdf-lib";

export const applyCommandsToPDF = async (
  file: PDFFile,
): Promise<File | null> => {
  try {
    let modifiedBytes: ArrayBufferLike | null = null;
    for (const command of file.commands) {
      switch (command.type) {
        case "ExtractRegion":
          modifiedBytes = await pdfExtractRegion(
            file.rawFile,
            command.start,
            command.end,
          );
          break;

        default:
          console.warn(`Unknown command type: ${command.type}`);
          break;
      }

      if (modifiedBytes === null) {
        console.error("Failed to process file", file);
        return null;
      }
    }

    return new File([modifiedBytes!], file.name, {
      type: "application/pdf",
    });
  } catch (error) {
    console.error("Error modifying file:", error);
  }

  return null;
};

const pdfExtractRegion = async (
  rawFile: File,
  start: number,
  end: number,
): Promise<ArrayBufferLike | null> => {
  try {
    const originalPdfDoc = await PDFDocument.load(await rawFile.arrayBuffer());
    const totalPages = originalPdfDoc.getPages().length;

    const startPage = Math.max(1, start);
    const endPage = Math.min(totalPages, end);

    const newPdfDoc = await PDFDocument.create();
    const pagesToCopyIndices: number[] = [];

    for (let i = startPage - 1; i < endPage; i++) {
      pagesToCopyIndices.push(i);
    }

    if (pagesToCopyIndices.length > 0) {
      const copiedPages = await newPdfDoc.copyPages(
        originalPdfDoc,
        pagesToCopyIndices,
      );
      copiedPages.forEach((page) => newPdfDoc.addPage(page));

      return await newPdfDoc.save();
    } else {
      console.warn(
        `No pages to copy for range ${startPage}-${endPage}. Skipping this split part.`,
      );
      return null;
    }
  } catch (error) {
    console.error(`Error applying SplitPDF command:`, error);
  }

  return null;
};

// // Function to apply JoinPDF command and return a new PDFFile entry
// const applyJoinPDF = async (command: JoinPDFCommand) => {
//   if (command.inputFiles.length < 2) {
//     console.warn("JoinPDF command requires at least two input files.");
//     return;
//   }

//   try {
//     const mergedPdf = await PDFDocument.create();
//     const joinedFileNames: string[] = [];

//     for (const pdfFileEntry of command.inputFiles) {
//       const donorPdfBytes = await pdfFileEntry.rawFile.arrayBuffer();
//       const donorPdfDoc = await PDFDocument.load(donorPdfBytes);

//       const copiedPages = await mergedPdf.copyPages(
//         donorPdfDoc,
//         donorPdfDoc.getPageIndices(),
//       );
//       copiedPages.forEach((page) => mergedPdf.addPage(page));
//       joinedFileNames.push(pdfFileEntry.name.replace(".pdf", ""));
//     }

//     const mergedPdfBytes = await mergedPdf.save();
//     const mergedFileName = `joined_${joinedFileNames.join("_")}.pdf`;
//     const mergedFileBlob = new Blob([mergedPdfBytes], {
//       type: "application/pdf",
//     });

//     const newPdfFile: PDFFile = {
//       key: uuidv4(),
//       rawFile: new File([mergedFileBlob], mergedFileName, {
//         type: "application/pdf",
//       }), // Create a File object from Blob
//       name: mergedFileName,
//       commands: [], // Joined file starts with no commands
//       currentPage: 1,
//     };

//     // Add the newly created joined file to the store
//     get().actions.addFile(newPdfFile.rawFile); // Add rawFile from newPdfFile

//     // Optionally, trigger download immediately for the joined file
//     await downloadBlob(mergedFileBlob, mergedFileName);

//     console.log("Joined PDFs and added new file to store.");
//   } catch (error) {
//     console.error(`Error applying JoinPDF command:`, error);
//     alert(`Failed to join PDFs: ${error.message}`);
//   }
// };

// // Placeholder for other command applications if they result in new files
// const applyPDFReplaceText = async (
//   fileKey: string,
//   command: PDFReplaceTextCommand,
// ) => {
//   /* ... */
// };
// const applyAdjustPDFDimensions = async (
//   fileKey: string,
//   command: AdjustPDFDimensionsCommand,
// ) => {
//   /* ... */
// };

// case "JoinPDF":
//   // JoinPDF command requires other input files.
//   // It means we're trying to download a *joined* result, not the single file itself.
//   // This command should ideally be applied to a *new* PDFDocument,
//   // not to an existing one in the `files` array.
//   console.warn(
//     `JoinPDF command cannot be applied directly in 'downloadFile' of a single entry. ` +
//       `This command acts on multiple inputs to produce a new output.`,
//   );
//   // You would likely have a separate action `downloadJoinedFiles(fileKeys: string[])`
//   // where a new PDFDocument is created and populated.
//   break;

// case "PDFReplaceText":
//   // Example: Apply text replacement
//   // This is a simplified example. Actual implementation needs careful parsing.
//   const replaceCommand = command as PDFReplaceTextCommand;
//   const pages = pdfDoc.getPages();
//   for (const page of pages) {
//     // pdf-lib does not have a direct find-and-replace text API.
//     // This would involve complex content stream manipulation,
//     // or rasterizing the page and drawing new text over it,
//     // or using a server-side solution.
//     // For a client-side *visual* replacement, you might draw new text.
//     // For actual content stream replacement, you'd need to parse PDF content.
//     console.warn(
//       `PDFReplaceText not fully implemented in client-side pdf-lib. ` +
//         `This would require advanced content stream parsing or drawing over existing text.`,
//     );
//     // Example (drawing new text, but doesn't remove old):
//     // page.drawText(replaceCommand.replacement, {
//     //   x: 100, y: 100, // Placeholder position
//     //   size: 12,
//     //   font: await pdfDoc.embedFont(StandardFonts.Helvetica),
//     //   color: rgb(0, 0, 0),
//     // });
//   }
//   break;

// // case "AdjustPDFDimensions":
// //   const adjustCommand = command as AdjustPDFDimensionsCommand;
// //   const targetPage =
// //     pdfDoc.getPages()[targetFileEntry.currentPage - 1] ||
// //     pdfDoc.getPages()[0]; // Get current page or first
// //   if (targetPage) {
// //     const { width, height } = targetPage.getSize();
// //     if (adjustCommand.adjustBy === "width") {
// //       targetPage.setSize(width + adjustCommand.value, height);
// //       console.log(`Adjusted width by ${adjustCommand.value}`);
// //     } else if (adjustCommand.adjustBy === "height") {
// //       targetPage.setSize(width, height + adjustCommand.value);
// //       console.log(`Adjusted height by ${adjustCommand.value}`);
// //     }
// //   }
// //   break;
