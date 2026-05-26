import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from './Button';

export type DrawerProps = {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export const Drawer = ({ children, className, onClose, open, title }: DrawerProps) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label="Close navigation"
        className="absolute inset-0 bg-text/20 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          'animate-enter relative h-full w-[min(22rem,86vw)] overflow-y-auto border-r border-subtle bg-surface-card shadow-panel',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-subtle p-4">
          <p className="text-sm font-semibold text-text">{title}</p>
          <Button aria-label="Close navigation" onClick={onClose} size="sm" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </aside>
    </div>
  );
};
