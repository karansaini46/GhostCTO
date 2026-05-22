import { Navigate, Outlet } from 'react-router-dom';

import { LoadingState } from '../../components/ui';
import { useAuth } from './auth-context';

export const ProtectedRoute = () => {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <LoadingState label="Loading workspace" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
};
