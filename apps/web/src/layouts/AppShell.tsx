import { useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  CreditCard,
  FileText,
  FolderKanban,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  PlusCircle,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  UserRoundSearch,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button, Drawer } from '../components/ui';
import { useAuth } from '../features/auth/auth-context';
import { getPlanLabel } from '../features/billing/billing-plan';
import { cn } from '../lib/cn';

type AppShellProps = {
  children: ReactNode;
};

type NavigationItem = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  to: string;
};

const navigationItems: NavigationItem[] = [
  { icon: Home, label: 'Home', to: '/workspace' },
  { icon: PlusCircle, label: 'Create project', to: '/projects/new' },
  { icon: CreditCard, label: 'Billing', to: '/billing' },
  { icon: Settings, label: 'Settings', to: '/settings' },
];

const adminNavigationItem: NavigationItem = { icon: Shield, label: 'Admin', to: '/admin' };

const getProjectNavigation = (projectId: string): Array<NavigationItem & { group: string }> => [
  { group: 'Overview', icon: FolderKanban, label: 'Project room', to: `/projects/${projectId}` },
  { group: 'Plan', icon: ScrollText, label: 'Roadmap', to: `/projects/${projectId}/roadmap` },
  {
    group: 'Plan',
    icon: Sparkles,
    label: 'Stack advisor',
    to: `/projects/${projectId}/stack-advisor`,
  },
  {
    group: 'Plan',
    icon: FileText,
    label: 'Spec writer',
    to: `/projects/${projectId}/technical-spec`,
  },
  {
    group: 'Hire',
    icon: UserRoundSearch,
    label: 'Developer brief',
    to: `/projects/${projectId}/developer-jd`,
  },
  {
    group: 'Hire',
    icon: Shield,
    label: 'Quote validator',
    to: `/projects/${projectId}/rate-validator`,
  },
  { group: 'Hire', icon: UserRoundSearch, label: 'Vetting', to: `/projects/${projectId}/vetting` },
  { group: 'Review', icon: Shield, label: 'Code audit', to: `/projects/${projectId}/code-audit` },
  {
    group: 'Ask',
    icon: MessageCircle,
    label: 'Project advisor',
    to: `/projects/${projectId}/chat`,
  },
  { group: 'Documents', icon: FileText, label: 'History', to: `/projects/${projectId}/documents` },
];

const Brand = () => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft font-editorial text-base font-semibold text-accent shadow-sm">
      G
    </div>
    <div>
      <p className="text-sm font-semibold tracking-normal text-text">GhostCTO</p>
      <p className="text-xs text-muted">Founder readiness</p>
    </div>
  </div>
);

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold tracking-normal transition-all duration-200 ease-soft',
    '[&_svg]:h-4 [&_svg]:w-4',
    isActive
      ? 'bg-surface-card text-text shadow-sm'
      : 'text-secondary hover:bg-surface-raised hover:text-text',
  );

const groupedProjectNavigation = (items: Array<NavigationItem & { group: string }>) =>
  items.reduce<Record<string, Array<NavigationItem & { group: string }>>>((groups, item) => {
    groups[item.group] = [...(groups[item.group] ?? []), item];
    return groups;
  }, {});

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const visibleNavigationItems =
    user?.role === 'ADMIN' ? [...navigationItems, adminNavigationItem] : navigationItems;
  const projectNavigation = id ? groupedProjectNavigation(getProjectNavigation(id)) : null;

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-subtle px-5 py-5">
        <Brand />
      </div>
      <nav className="flex-1 space-y-6 px-3 py-5">
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Workspace
          </p>
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink className={navLinkClass} key={item.label} onClick={onNavigate} to={item.to}>
                <Icon />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        {projectNavigation ? (
          <div className="space-y-5 border-t border-subtle pt-5">
            {Object.entries(projectNavigation).map(([group, items]) => (
              <div className="space-y-1" key={group}>
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {group}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      className={navLinkClass}
                      key={item.to}
                      onClick={onNavigate}
                      to={item.to}
                    >
                      <Icon />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </nav>
      <div className="border-t border-subtle p-4">
        <div className="rounded-panel border border-subtle bg-surface-card p-4 shadow-sm">
          <p className="text-sm font-semibold tracking-normal text-text">
            {getPlanLabel(user?.plan)} plan
          </p>
          <p className="mt-1 text-sm leading-6 text-secondary">
            {user?.plan === 'LIFETIME'
              ? 'Your planning workspace is open.'
              : 'Free limits are active. Upgrade when you need more room.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const AppShell = ({ children }: AppShellProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const pageLabel = useMemo(() => {
    if (location.pathname === '/workspace') {
      return 'Home';
    }

    if (location.pathname.includes('/documents')) {
      return 'Documents';
    }

    if (location.pathname.startsWith('/projects/')) {
      return 'Project room';
    }

    return 'Founder workspace';
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-text">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-subtle bg-surface/90 backdrop-blur lg:block">
        <SidebarContent />
      </aside>

      <Drawer
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        title="Workspace navigation"
      >
        <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
      </Drawer>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-subtle bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                aria-label="Open navigation"
                className="h-10 w-10 px-0 lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                variant="secondary"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="hidden lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {pageLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-56 truncate text-sm font-semibold tracking-normal text-text">
                  {user?.name ?? user?.email ?? 'Founder view'}
                </p>
                <p className="text-xs text-muted">Signed in</p>
              </div>
              <Button leftIcon={<LogOut />} onClick={() => navigate('/logout')} variant="secondary">
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
