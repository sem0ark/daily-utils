export type PdfRectangle = [number, number, number, number];

/** Converts one or more MuPDF quads into an enclosing PDF rectangle. */
export const getQuadRectangle = (quads: number[][] | number[][][]): PdfRectangle => {
  const coordinates = quads.flat(Infinity) as number[];
  const xCoordinates = coordinates.filter((_, index) => index % 2 === 0);
  const yCoordinates = coordinates.filter((_, index) => index % 2 === 1);

  if (!xCoordinates.length || !yCoordinates.length) {
    throw new Error("MuPDF returned an empty text quad.");
  }

  return [Math.min(...xCoordinates), Math.min(...yCoordinates), Math.max(...xCoordinates), Math.max(...yCoordinates)];
};
