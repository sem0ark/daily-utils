import { LinkCard } from "../components/LinkCard";

export const Home = () => {
  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">
        Daily Utils
      </h1>
      <div className="grid items-center gap-8">
        <LinkCard name="Echo text" path="/echo">
          Utility script that just outputs the text back to the user in order to
          translate it with Google Translate plugin. It is useful because like
          that there will be no character limit that breaks the translation.
        </LinkCard>

        <LinkCard name="Text to promts" path="/prompts">
          It includes functionality to copy the processed text to clipboard,
          optionally wrapped into a custom text for prompts.
        </LinkCard>

        <LinkCard name="Fromat markdown" path="/markdown">
          Fromat markdown to not use * for lists and replace _ for italics.
        </LinkCard>

        <LinkCard name="Work with PDF files" path="/pdf-processing">
          A bunch of utilities for managing PDF files, useful for filling out
          and changing PDFs a bit.
        </LinkCard>
      </div>
    </>
  );
};
