import type { SocialProvider } from '@/entities/session';

/** Presentation metadata for a social sign-in button. */
export type SocialProviderMeta = {
  id: SocialProvider;
  label: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
};

/** Brand-styled metadata for the Google provider. */
export const googleProvider: SocialProviderMeta = {
  id: 'google',
  label: 'Google로 시작하기',
  backgroundColor: '#FFFFFF',
  textColor: '#1F1F1F',
  borderColor: '#DADCE0',
};

/**
 * Brand-styled metadata for the Apple provider. Retained for when Apple sign-in
 * is enabled in the Supabase project (offering social login on iOS requires it
 * for App Store review); not currently offered — see `socialProviders`.
 */
export const appleProvider: SocialProviderMeta = {
  id: 'apple',
  label: 'Apple로 시작하기',
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  borderColor: '#000000',
};

/**
 * Providers actually offered on the sign-in screen, in order. Only Google is
 * enabled in the Supabase project today; add `appleProvider` here once Apple is
 * configured.
 */
export const socialProviders: SocialProviderMeta[] = [googleProvider];
