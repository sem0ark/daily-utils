import React from "react";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { Link } from "wouter";

const GeneralError = ({ onReload }: { onReload: () => void }) => (
  <div className="h-vh flex flex-col items-center justify-center text-center">
    <div className="mb-4 rounded-full bg-red-50 p-4">
      <ExclamationTriangleIcon className="size-12 text-red-500" />
    </div>
    <h1 className="text-2xl font-bold">Application Error</h1>
    <p className="mt-2 max-w-md">
      Something went wrong while loading this tool.
    </p>

    <div className="mt-8 flex gap-4">
      <button
        onClick={onReload}
        className="flex items-center gap-2 rounded-lg bg-neutral-500 px-4 py-2 text-white hover:bg-neutral-200 hover:text-neutral-700"
      >
        <ArrowPathIcon className="size-4" />
        Reload App
      </button>
      <Link
        href="/"
        className="rounded-lg border-2 border-neutral-200 px-4 py-2 hover:border-neutral-500"
      >
        Go Home
      </Link>
    </div>
  </div>
);

export const NotFound = () => {
  return (
    <div className="flex h-lvh flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-full bg-blue-50 p-4">
        <QuestionMarkCircleIcon className="size-12 text-blue-500" />
      </div>
      <h1 className="text-2xl font-bold">Not Found</h1>
      <p className="mt-2 max-w-md">The requested utility does not exist.</p>

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-lg border-2 border-neutral-200 px-4 py-2 hover:border-neutral-500"
        >
          <ArrowPathIcon className="size-4" />
          Reload App
        </button>
        <Link
          href="/"
          className="rounded-lg border-2 border-neutral-200 px-4 py-2 hover:border-neutral-500"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

type State = { error: Error | null };

export class RouteErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("Navigation Error:", error, info);
  }

  handleReload = () => window.location.reload();

  render() {
    if (this.state.error) {
      const isNotFound = String(this.state.error.message).includes("404");
      return isNotFound ? (
        <NotFound />
      ) : (
        <GeneralError onReload={this.handleReload} />
      );
    }

    return this.props.children ?? null;
  }
}

export const RouteErrorBoundaryWrapper = (props: React.PropsWithChildren) => (
  <RouteErrorBoundary>{props.children}</RouteErrorBoundary>
);
