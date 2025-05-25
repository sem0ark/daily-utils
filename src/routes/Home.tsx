import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { PropsWithChildren } from "react";
import { Link } from "react-router";

function Card({
  name,
  path,
  children,
}: PropsWithChildren<{ name: string; path: string }>) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-lg border-2 border-neutral-500 bg-neutral-50 p-4">
      <Link
        to={path}
        className="text-xl font-bold text-blue-500"
        title={"Go to " + name}
      >
        {name}
      </Link>

      <div className="flex w-full flex-col p-2">{children}</div>

      <Link
        to={path}
        className="flex items-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-xl font-bold text-blue-500 transition-all hover:gap-4 hover:border-neutral-100 hover:text-blue-600"
        title={"Go to " + name}
      >
        GO <ArrowRightIcon className="inline size-6" />
      </Link>
    </div>
  );
}

export const Home = () => {
  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">
        Daily Utils
      </h1>
      <div className="grid items-center gap-16">
        <Card name="Echo text" path="/echo">
          Utility script that just outputs the text back to the user in order to
          translate it with Google Translate plugin. It is useful because like
          that there will be no character limit that breaks the translation.
        </Card>

        <Card name="Text to promts" path="/prompts">
          It includes functionality to copy the processed text to clipboard,
          optionally wrapped into a custom text for prompts.
        </Card>

        <Card name="Fromat markdown" path="/markdown">
          Fromat markdown to not use * for lists and replace _ for italics.
        </Card>

        <Card name="Work with PDF files" path="/pdf-processing">
          A bunch of utilities for managing PDF files, useful for filling out and changing PDFs a bit.
        </Card>
      </div>
    </>
  );
}
