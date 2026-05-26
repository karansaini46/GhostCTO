import { Download } from 'lucide-react';

import { Button, type ButtonProps } from './Button';

export type ExportButtonProps = ButtonProps & {
  label?: string;
};

export const ExportButton = ({ label = 'Export', ...props }: ExportButtonProps) => (
  <Button leftIcon={<Download />} variant="secondary" {...props}>
    {label}
  </Button>
);
