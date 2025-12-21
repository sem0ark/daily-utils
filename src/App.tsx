import { createHashRouter, RouterProvider } from "react-router";

import { NAVIGATION_CONFIG } from "./pages/routes";
import { Layout } from "./pages/Layout";

const routes = [
  {
    element: <Layout />,
    children: [
      ...NAVIGATION_CONFIG.map((item) => ({
        path: item.path,
        element: item.element,
      })),
      { path: "/text-processing/home", element: NAVIGATION_CONFIG[0].element },
    ],
  },
];

const router = createHashRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
