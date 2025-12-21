import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export const RouteErrorBoundary = () => {
  const error = useRouteError();
  console.error("Navigation Error:", error);

  let title = "Application Error";
  let message = "Something went wrong while loading this tool.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Tool Not Found";
      message = "The requested utility does not exist.";
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-red-50 p-4">
        <ExclamationTriangleIcon className="size-12 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-neutral-700">{title}</h1>
      <p className="mt-2 max-w-md text-neutral-500">{message}</p>

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-lg bg-neutral-700 px-4 py-2 text-white hover:bg-neutral-200 hover:text-neutral-700"
        >
          <ArrowPathIcon className="size-4" />
          Reload App
        </button>
        <Link
          to="/"
          className="rounded-lg border-2 border-neutral-300 px-4 py-2 hover:bg-neutral-50"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};
