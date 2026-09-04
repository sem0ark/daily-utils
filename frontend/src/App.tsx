import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import { NAVIGATION_CONFIG } from "./pages/routes";
import { Layout } from "./pages/Layout";
import { NotFound, RouteErrorBoundary } from "./pages/ErrorBoundary";

export function App() {
  return (
    <Router hook={useHashLocation}>
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
  );
}
