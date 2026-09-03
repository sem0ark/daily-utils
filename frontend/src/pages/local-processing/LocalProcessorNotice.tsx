import { useLocalServerDiscovery } from "./local-server/localServerContext";

export const LocalProcessorNotice = ({ processor }: { processor: string }) => {
  const { isAvailable, processors } = useLocalServerDiscovery();
  const isEnabled = isAvailable && processors.includes(processor);

  if (isEnabled) return null;

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-amber-900">
      <h2 className="font-semibold">Processor unavailable</h2>
      <p className="mt-2 text-sm">
        Please run the local server with processor{" "}
        <pre className="inline">{processor}</pre> enabled.
      </p>
    </div>
  );
};
