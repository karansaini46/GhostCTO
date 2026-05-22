import { useEffect } from 'react';
import type { ReactNode } from 'react';

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
        className="absolute inset-0 bg-background/80"
        onClick={onClose}
        type="button"
      />
      <section
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-lg rounded-lg border border-border bg-surface shadow-panel',
          className,
        )}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-normal text-text">{title}</h2>
            {description ? <p className="text-sm leading-6 text-muted">{description}</p> : null}
          </div>
          <Button aria-label="Close modal" onClick={onClose} size="sm" variant="ghost">
            X
          </Button>
        </div>
        <div className="p-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  );
};
