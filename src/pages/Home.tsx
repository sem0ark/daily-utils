import { Card } from "../components/Card";

export const Home = () => (
  <>
    <h1 className="mb-8 w-full text-center text-3xl font-bold">Daily Utils</h1>
    <div className="grid items-center gap-16">
      <Card name="Text processing" path="/text-processing/">
        Utility script that just outputs the text back to the user in order to
        translate it with Google Translate plugin. It is useful because like
        that there will be no character limit that breaks the translation.
      </Card>
    </div>
  </>
);
