import { type ReactNode } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import WorkspacePage from "./pages/WorkspacePage";
import TenantPage from "./pages/TenantPage";
import NotebookPage from "./pages/NotebookPage";
import NotebookViewerPage from "./pages/NotebookViewerPage";
import KnowledgeDashboardPage, { ProjectListPage } from "./pages/KnowledgeDashboardPage";
import Layout from "./components/Layout";
import "./App.css";

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/notebook" element={<NotebookViewerPage />} />
          <Route path="/tenants/:tenant" element={<TenantPage />} />
          <Route path="/tenants/:tenant/notebooks" element={<NotebookPage />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:projectId" element={<KnowledgeDashboardPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
