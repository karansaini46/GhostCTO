import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from './Button';

export type ModalProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export const Modal = ({
  children,
  className,
  description,
  footer,
  onClose,
  open,
  title,
}: ModalProps) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-text/20 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <section
        aria-modal="true"
        className={cn(
          'animate-rise relative z-10 w-full max-w-lg rounded-panel border border-subtle bg-surface-card shadow-panel',
          className,
        )}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-subtle p-5">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-normal text-text">{title}</h2>
            {description ? <p className="text-sm leading-6 text-secondary">{description}</p> : null}
          </div>
          <Button aria-label="Close modal" onClick={onClose} size="sm" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-subtle px-5 py-4">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  );
};
