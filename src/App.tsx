import { useState } from "react";
import { HashRouter } from "react-router";

import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="container m-0 flex min-h-lvh max-w-7xl flex-col items-center justify-center gap-2">
      <div className="flex gap-8">
        <a className="font-semibold" href="https://vite.dev" target="_blank">
          <img
            src={viteLogo}
            className="h-24 animate-pulse drop-shadow-2xl"
            alt="Vite logo"
          />
        </a>
        <a className="font-semibold drop-shadow-xl drop-shadow-blue-500/50" href="https://react.dev" target="_blank">
          <img
            src={reactLogo}
            className="h-24 animate-logo-spin"
            alt="React logo"
          />
        </a>
      </div>

      <h1 className="text-6xl">Vite + React</h1>

      <div className="flex flex-col items-center gap-2">
        <button
          className="cursor-pointer rounded-2xl border-2 border-neutral-500 bg-neutral-100 px-5 py-2 text-neutral-500 m-2"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
        <p>
          Edit <code className="bg-neutral-300/50 p-2 rounded-md text-neutral-700 border-2 border-neutral-700/50">src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <p className="text-neutral-700">Click on the Vite and React logos to learn more</p>
    </div>
  );
}

export function Main() {
  return (
    <HashRouter>
      <App />
    </HashRouter>
  )
}