import type { ReactNode } from 'react';

import { Card, CardContent, PageHeader } from '../../components/ui';

type AuthFormShellProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export const AuthFormShell = ({ children, description, title }: AuthFormShellProps) => (
  <div className="flex min-h-screen items-center justify-center px-4 py-10">
    <div className="w-full max-w-lg space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-normal text-accent">GhostCTO</p>
        <PageHeader description={description} title={title} />
      </div>
      <Card>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  </div>
);

