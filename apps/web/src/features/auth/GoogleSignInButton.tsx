import { Button } from '../../components/ui';
import { getGoogleAuthUrl } from './auth-api';

type GoogleSignInButtonProps = {
  disabled?: boolean;
};

export const GoogleSignInButton = ({ disabled = false }: GoogleSignInButtonProps) => {
  const continueWithGoogle = () => {
    window.location.assign(getGoogleAuthUrl());
  };

  return (
    <Button
      className="w-full"
      disabled={disabled}
      onClick={continueWithGoogle}
      type="button"
      variant="secondary"
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-subtle bg-background text-xs font-semibold text-text"
      >
        G
      </span>
      Continue with Google
    </Button>
  );
};
