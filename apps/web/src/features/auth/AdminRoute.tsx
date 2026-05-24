import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from './auth-context';

export const AdminRoute = () => {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
};
