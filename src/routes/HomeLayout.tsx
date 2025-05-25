import { HomeIcon } from "@heroicons/react/24/solid";
import { Link, Outlet } from "react-router";

export const HomeLayout = () => {
  return (
    <>
      <div className="mx-auto mb-1 max-w-7xl">
        <nav className="flex flex-row gap-2 border-b-2 border-b-slate-300 p-2">
          <Link to="/">
            <HomeIcon className="size-8 h-full transition-colors duration-200 hover:text-blue-500" />
          </Link>
        </nav>
      </div>

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </>
  );
}
