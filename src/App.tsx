import { Router, Route, Switch } from "wouter";
import { HelmetProvider } from "react-helmet-async";

import { NAVIGATION_CONFIG } from "./pages/routes";
import { Layout } from "./pages/Layout";
import { NotFound, RouteErrorBoundary } from "./pages/ErrorBoundary";

export function App() {
  return (
    <HelmetProvider>
      <Router base="/daily-utils">
        <RouteErrorBoundary>
          <Switch>
            {NAVIGATION_CONFIG.map((item) => (
              <Route key={item.path} path={item.path}>
                <Layout>{item.element}</Layout>
              </Route>
            ))}
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </RouteErrorBoundary>
      </Router>
    </HelmetProvider>
  );
}
