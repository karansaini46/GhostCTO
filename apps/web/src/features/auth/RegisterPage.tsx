import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Input } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { AuthFormShell } from './AuthFormShell';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useAuth } from './auth-context';
import { getOAuthErrorMessage } from './oauth-errors';

export const RegisterPage = () => {
  const { error, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
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
      const trimmedName = name.trim();
      await register({ email, name: trimmedName || undefined, password });
      navigate('/', { replace: true });
    } catch (submissionError) {
      setFormError(
        submissionError instanceof ApiError ? submissionError.message : 'Unable to create account.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormShell
      description="Create the founder account used to sign in to GhostCTO."
      title="Create account"
    >
      <div className="space-y-4">
        <GoogleSignInButton disabled={isSubmitting} />
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-normal text-muted">
            or use email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Input
          autoComplete="name"
          label="Name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          value={name}
        />
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
          autoComplete="new-password"
          hint="Use at least 12 characters."
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a strong password"
          required
          type="password"
          value={password}
        />
        {formError || error ? (
          <p className="text-sm leading-6 text-danger">{formError ?? error}</p>
        ) : null}
        <Button className="w-full" isLoading={isSubmitting} type="submit">
          Create account
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Already have an account?{' '}
        <Link className="font-medium text-accent hover:text-accent/80" to="/login">
          Sign in
        </Link>
      </p>
    </AuthFormShell>
  );
};
