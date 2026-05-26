import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { Card, CardContent } from '../../components/ui';

type AuthFormShellProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export const AuthFormShell = ({ children, description, title }: AuthFormShellProps) => (
  <div className="paper-texture flex min-h-screen items-center justify-center px-4 py-10">
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div className="hidden lg:block">
        <Link className="flex items-center gap-3" to="/">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft font-editorial text-base font-semibold text-accent">
            G
          </div>
          <div>
            <p className="text-sm font-semibold tracking-normal text-text">GhostCTO</p>
            <p className="text-xs text-muted">Technical clarity before you hire</p>
          </div>
        </Link>
        <h1 className="mt-10 text-balance font-editorial text-5xl font-semibold leading-tight text-text">
          A quieter way to prepare for technical decisions.
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-secondary">
          Keep your project context, planning documents, quotes, and hiring notes in one calm
          workspace.
        </p>
        <div className="mt-8 rounded-panel border border-accent/20 bg-accent-soft p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p className="text-sm leading-6 text-secondary">
              Sign in to continue from your saved project context and documents.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="mb-6 lg:hidden">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft font-editorial text-base font-semibold text-accent">
              G
            </div>
            <div>
              <p className="text-sm font-semibold tracking-normal text-text">GhostCTO</p>
              <p className="text-xs text-muted">Technical clarity before you hire</p>
            </div>
          </Link>
        </div>
        <Card className="animate-rise">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Founder workspace
              </p>
              <h1 className="mt-3 font-editorial text-4xl font-semibold leading-tight text-text">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-secondary">{description}</p>
            </div>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);
