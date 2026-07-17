import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./error-boundary";
import { AppShell } from "../ui/AppShell";
import { OverviewPage } from "../features/overview/OverviewPage";
import { ReviewPage } from "../features/review/ReviewPage";
import { AuditPage } from "../features/audit/AuditPage";
import { NotFoundPage } from "../features/shell/NotFoundPage";
import { RouteErrorProbe } from "../features/shell/RouteErrorProbe";
import type { UxDesignStudioAppMode } from "./UxDesignStudioApp";
import { useStudioRouting } from "./studio-routing";

function withRouteBoundary(page: ReactNode, title: string, resetKey: string) {
  return (
    <ErrorBoundary key={resetKey} title={title}>
      {page}
    </ErrorBoundary>
  );
}

export function AppRoutes({ mode = "standalone" }: { mode?: UxDesignStudioAppMode }) {
  const { toStudio } = useStudioRouting();

  return (
    <Routes>
      <Route element={<AppShell mode={mode} />}>
        <Route index element={<Navigate to={toStudio("overview")} replace />} />
        <Route
          path="overview"
          element={withRouteBoundary(<OverviewPage />, "Overview failed to render", "overview")}
        />
        <Route
          path="review/:screenId"
          element={withRouteBoundary(<ReviewPage />, "Review failed to render", "review")}
        />
        <Route
          path="audit"
          element={withRouteBoundary(<AuditPage />, "Audit failed to render", "audit")}
        />
        {import.meta.env.MODE === "test" ? (
          <Route
            path="__error-probe"
            element={withRouteBoundary(
              <RouteErrorProbe />,
              "Route probe failed to render",
              "error-probe",
            )}
          />
        ) : null}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
