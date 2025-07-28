import { LinkCard } from "../../components/LinkCard";

export const PDFHome = () => {
  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">PDF Utils</h1>
      <div className="grid items-center gap-8 pb-48">
        <LinkCard name="Split PDF by Ranges" path="/pdf-processing/pdf-split"></LinkCard>
        <LinkCard
          name="Join PDF"
          path="/pdf-processing/pdf-join"
        ></LinkCard>
        <LinkCard
          name="Replace PDF Text"
          path="/pdf-processing/pdf-split"
        ></LinkCard>
        <LinkCard
          name="Adjust PDF Page Size"
          path="/pdf-processing/pdf-split"
        ></LinkCard>
      </div>
    </>
  );
};
