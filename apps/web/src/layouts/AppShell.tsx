import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { Button } from '../components/ui';
import { useAuth } from '../features/auth/auth-context';
import { getPlanLabel } from '../features/billing/billing-plan';
import { cn } from '../lib/cn';

type AppShellProps = {
  children: ReactNode;
};

const navigationItems = [
  { label: 'Workspace', to: '/' },
  { label: 'New project', to: '/projects/new' },
  { label: 'Billing', to: '/billing' },
];

const adminNavigationItem = { label: 'Admin', to: '/admin' };

const Brand = () => (
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/35 bg-accent/10 text-sm font-semibold text-accent">
      GC
    </div>
    <div>
      <p className="text-sm font-semibold tracking-normal text-text">GhostCTO</p>
      <p className="text-xs text-muted">Founder workspace</p>
    </div>
  </div>
);

const MenuMark = () => (
  <span className="flex flex-col gap-1">
    <span className="h-0.5 w-4 rounded-full bg-muted" />
    <span className="h-0.5 w-4 rounded-full bg-muted" />
    <span className="h-0.5 w-4 rounded-full bg-muted" />
  </span>
);

const SidebarContent = () => {
  const { user } = useAuth();
  const visibleNavigationItems =
    user?.role === 'ADMIN' ? [...navigationItems, adminNavigationItem] : navigationItems;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        {visibleNavigationItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                'flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm font-medium tracking-normal transition-colors',
                isActive
                  ? 'bg-surface-raised text-text'
                  : 'text-muted hover:bg-surface-raised hover:text-text',
              )
            }
            key={item.label}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-lg border border-border bg-surface-raised p-4">
          <p className="text-sm font-medium tracking-normal text-text">
            {getPlanLabel(user?.plan)} plan
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {user?.plan === 'LIFETIME'
              ? 'All workspace features are unlocked.'
              : 'Free limits apply until lifetime access is active.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const AppShell = ({ children }: AppShellProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-72 border-r border-border bg-surface shadow-panel">
            <SidebarContent />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              aria-label="Open navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:bg-surface-raised hover:text-text lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              type="button"
            >
              <MenuMark />
            </button>
            <div className="hidden lg:block">
              <p className="text-sm font-medium tracking-normal text-muted">Founder workspace</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium tracking-normal text-text">
                  {user?.name ?? user?.email ?? 'Founder view'}
                </p>
                <p className="text-xs text-muted">Signed in</p>
              </div>
              <Button onClick={() => navigate('/logout')} variant="secondary">
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
