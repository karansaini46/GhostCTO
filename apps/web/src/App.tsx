import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './layouts/AppShell';
import { AuthProvider } from './features/auth/auth-store';
import { LoginPage } from './features/auth/LoginPage';
import { LogoutPage } from './features/auth/LogoutPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { PublicRoute } from './features/auth/PublicRoute';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { ProjectOnboardingPage } from './features/projects/ProjectOnboardingPage';
import { StackAdvicePage } from './features/projects/StackAdvicePage';
import { ShareDocumentPage } from './features/projects/ShareDocumentPage';

export const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route path="/logout" element={<LogoutPage />} />
        <Route
          element={<ShareDocumentPage />}
          path="/share/:documentId"
        />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <AppShell>
                <DashboardPage />
              </AppShell>
            }
            path="/"
          />
          <Route
            element={
              <AppShell>
                <ProjectOnboardingPage />
              </AppShell>
            }
            path="/projects/new"
          />
          <Route
            element={
              <AppShell>
                <ProjectDetailPage />
              </AppShell>
            }
            path="/projects/:id"
          />
          <Route
            element={
              <AppShell>
                <StackAdvicePage />
              </AppShell>
            }
            path="/projects/:id/stack-advice"
          />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
