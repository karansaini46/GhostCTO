import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button, type ButtonProps } from './Button';

export type CopyButtonProps = Omit<ButtonProps, 'children' | 'onClick'> & {
  label?: string;
  value: string;
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export const CopyButton = ({ label = 'Copy', value, ...props }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <Button
      leftIcon={copied ? <Check /> : <Copy />}
      onClick={async () => {
        await copyText(value);
        setCopied(true);
      }}
      variant="secondary"
      {...props}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
};
