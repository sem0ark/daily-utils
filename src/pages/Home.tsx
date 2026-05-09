import { Card } from "../common/components/Card";
import { Seo } from "../common/components/Seo";
import { NAVIGATION_CONFIG } from "./routes";

export const Home = () => (
  <>
    <Seo 
      title="Home" 
      description="Daily utility tools for text and file processing, including Markdown formatting, PDF extraction, and more."
      canonical="/"
    />
    <h1 className="mb-8 w-full text-center text-3xl font-bold">Daily Utils</h1>
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {NAVIGATION_CONFIG.filter((item) => item.showInHome).map((item) => (
        <Card key={item.path} name={item.name} path={item.path}>
          {item.description}
        </Card>
      ))}
    </div>
  </>
);
