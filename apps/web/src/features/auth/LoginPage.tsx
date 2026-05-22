import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Input } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { AuthFormShell } from './AuthFormShell';
import { useAuth } from './auth-context';

export const LoginPage = () => {
  const { error, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate('/', { replace: true });
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
      description="Sign in to your founder workspace."
      title="Welcome back"
    >
      <form className="space-y-4" onSubmit={submit}>
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
          <p className="text-sm leading-6 text-danger">{formError ?? error}</p>
        ) : null}
        <Button className="w-full" isLoading={isSubmitting} type="submit">
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Need an account?{' '}
        <Link className="font-medium text-accent hover:text-accent/80" to="/register">
          Create one
        </Link>
      </p>
    </AuthFormShell>
  );
};
