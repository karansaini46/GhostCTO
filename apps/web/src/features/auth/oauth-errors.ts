const oauthErrorMessages: Record<string, string> = {
  google_conflict:
    'That email is already linked to another Google account. Sign in with email or contact support.',
  google_denied: 'Google sign-in was cancelled. You can try again when you are ready.',
  google_invalid: 'Google sign-in expired or could not be verified. Please try again.',
  google_unverified:
    'Google could not confirm that email address. Use a verified Google account or sign in with email.',
};

export const getOAuthErrorMessage = (errorCode: string | null): string | null => {
  if (!errorCode) {
    return null;
  }

  return oauthErrorMessages[errorCode] ?? null;
};
