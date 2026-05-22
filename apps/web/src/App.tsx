import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './layouts/AppShell';
import { AuthProvider } from './features/auth/auth-store';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LoginPage } from './features/auth/LoginPage';
import { LogoutPage } from './features/auth/LogoutPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { PublicRoute } from './features/auth/PublicRoute';
import { RegisterPage } from './features/auth/RegisterPage';

export const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route path="/logout" element={<LogoutPage />} />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <AppShell>
                <DashboardPage />
              </AppShell>
            }
            path="/"
          />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
