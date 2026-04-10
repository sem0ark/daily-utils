import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import { NAVIGATION_CONFIG } from "./pages/routes";
import { Layout } from "./pages/Layout";
import { RouteErrorBoundary } from "./pages/ErrorBoundary";

export function App() {
  return (
    <Router hook={useHashLocation}>
      <RouteErrorBoundary>
        <Layout>
          <Switch>
            {NAVIGATION_CONFIG.map((item) => (
              <Route key={item.path} path={item.path}>
                {item.element}
              </Route>
            ))}
            <Route path="/text-processing/home">
              {NAVIGATION_CONFIG[0].element}
            </Route>
          </Switch>
        </Layout>
      </RouteErrorBoundary>
    </Router>
  );
}
