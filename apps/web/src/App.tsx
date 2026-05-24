import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './layouts/AppShell';
import { AuthProvider } from './features/auth/auth-store';
import { BillingPage } from './features/billing/BillingPage';
import { LoginPage } from './features/auth/LoginPage';
import { LogoutPage } from './features/auth/LogoutPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { PublicRoute } from './features/auth/PublicRoute';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LandingPage } from './features/landing/LandingPage';
import { CodeAuditPage } from './features/projects/CodeAuditPage';
import { DocumentDetailPage } from './features/projects/DocumentDetailPage';
import { DocumentsPage } from './features/projects/DocumentsPage';
import { ProjectChatPage } from './features/projects/ProjectChatPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { ProjectOnboardingPage } from './features/projects/ProjectOnboardingPage';
import { RateValidatorPage } from './features/projects/RateValidatorPage';
import { StackAdvicePage } from './features/projects/StackAdvicePage';
import { ShareDocumentPage } from './features/projects/ShareDocumentPage';
import { TechnicalSpecPage } from './features/projects/TechnicalSpecPage';
import { VettingScorecardPage } from './features/projects/VettingScorecardPage';

export const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route path="/logout" element={<LogoutPage />} />
        <Route element={<ShareDocumentPage />} path="/share/:documentId" />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <AppShell>
                <DashboardPage />
              </AppShell>
            }
            path="/workspace"
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
                <BillingPage />
              </AppShell>
            }
            path="/billing"
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
                <ProjectChatPage />
              </AppShell>
            }
            path="/projects/:id/chat"
          />
          <Route
            element={
              <AppShell>
                <DocumentsPage />
              </AppShell>
            }
            path="/projects/:id/documents"
          />
          <Route
            element={
              <AppShell>
                <DocumentDetailPage />
              </AppShell>
            }
            path="/projects/:id/documents/:documentId"
          />
          <Route
            element={
              <AppShell>
                <CodeAuditPage />
              </AppShell>
            }
            path="/projects/:id/code-audit"
          />
          <Route
            element={
              <AppShell>
                <StackAdvicePage />
              </AppShell>
            }
            path="/projects/:id/stack-advice"
          />
          <Route
            element={
              <AppShell>
                <TechnicalSpecPage />
              </AppShell>
            }
            path="/projects/:id/specs"
          />
          <Route
            element={
              <AppShell>
                <RateValidatorPage />
              </AppShell>
            }
            path="/projects/:id/rate-validator"
          />
          <Route
            element={
              <AppShell>
                <VettingScorecardPage />
              </AppShell>
            }
            path="/projects/:id/vetting"
          />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
