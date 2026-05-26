import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Input } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { AuthFormShell } from './AuthFormShell';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useAuth } from './auth-context';
import { getOAuthErrorMessage } from './oauth-errors';

export const LoginPage = () => {
  const { error, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const authError = searchParams.get('authError');
    const authErrorMessage = getOAuthErrorMessage(authError);

    if (!authError || !authErrorMessage) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('authError');
    setFormError(authErrorMessage);
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate('/workspace', { replace: true });
    } catch (submissionError) {
      setFormError(
        submissionError instanceof ApiError ? submissionError.message : 'Unable to sign in.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormShell
      description="Return to your projects, documents, and technical planning notes."
      title="Welcome back"
    >
      <div className="space-y-4">
        <GoogleSignInButton disabled={isSubmitting} />
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            or use email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Input
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="founder@company.com"
          required
          type="email"
          value={email}
        />
        <Input
          autoComplete="current-password"
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
          type="password"
          value={password}
        />
        {formError || error ? (
          <p className="rounded-md border border-danger/25 bg-danger/10 p-3 text-sm leading-6 text-danger">
            {formError ?? error}
          </p>
        ) : null}
        <Button className="w-full" isLoading={isSubmitting} type="submit">
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Need an account?{' '}
        <Link className="font-semibold text-accent hover:text-accent/80" to="/register">
          Create one
        </Link>
      </p>
    </AuthFormShell>
  );
};
