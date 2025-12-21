import { Card } from "../../components/Card";

export const Home = () => (
  <>
    <h1 className="mb-8 w-full text-center text-3xl font-bold">Daily Utils</h1>
    <div className="grid items-center gap-16">
      <Card name="Echo text" path="/text-processing/echo">
        Utility script that just outputs the text back to the user in order to
        translate it with Google Translate plugin. It is useful because like
        that there will be no character limit that breaks the translation.
      </Card>

      <Card name="Text to promts" path="/text-processing/prompts">
        It includes functionality to copy the processed text to clipboard,
        optionally wrapped into a custom text for prompts.
      </Card>

      <Card name="Format markdown" path="/text-processing/markdown">
        Format markdown to not use * for lists and replace _ for italics.
      </Card>
    </div>
  </>
);
