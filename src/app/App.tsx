import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "./error-boundary";
import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <ErrorBoundary title="Application failed to render">
      <AppProviders>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}
