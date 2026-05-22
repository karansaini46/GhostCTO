import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoadingState } from '../../components/ui';
import { useAuth } from './auth-context';

export const LogoutPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        await logout();
      } finally {
        if (active) {
          navigate('/login', { replace: true });
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [logout, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <LoadingState label="Signing out" />
    </div>
  );
};
