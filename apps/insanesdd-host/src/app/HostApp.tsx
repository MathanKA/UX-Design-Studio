import { Navigate, Route, Routes } from "react-router-dom";
import { ProjectShell } from "../shell/ProjectShell";
import { FederatedUxDesignStudio } from "../federation/FederatedUxDesignStudio";
import { ProjectOverviewPage } from "../placeholders/ProjectOverviewPage";
import { SpecPage } from "../placeholders/SpecPage";
import { AgileEditorPage } from "../placeholders/AgileEditorPage";
import { KanbanBoardPage } from "../placeholders/KanbanBoardPage";
import { LiveTerminalPage } from "../placeholders/LiveTerminalPage";
import { BranchesPage } from "../placeholders/BranchesPage";
import { ChangeRequestsPage } from "../placeholders/ChangeRequestsPage";
import { DeployPage } from "../placeholders/DeployPage";
import { DEMO_PROJECT_ID } from "./config";

export function HostApp() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={`/projects/${DEMO_PROJECT_ID}/overview`} replace />}
      />
      <Route path="/projects/:projectId" element={<ProjectShell />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<ProjectOverviewPage />} />
        <Route path="spec" element={<SpecPage />} />
        <Route path="ux-design-studio/*" element={<FederatedUxDesignStudio />} />
        <Route path="agile-editor" element={<AgileEditorPage />} />
        <Route path="kanban-board" element={<KanbanBoardPage />} />
        <Route path="live-terminal" element={<LiveTerminalPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="change-requests" element={<ChangeRequestsPage />} />
        <Route path="deploy" element={<DeployPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={`/projects/${DEMO_PROJECT_ID}/overview`} replace />}
      />
    </Routes>
  );
}
