import type { SocialProvider } from '@/entities/session';

/** Presentation metadata for a social sign-in button. */
export type SocialProviderMeta = {
  id: SocialProvider;
  label: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
};

/** Brand-styled providers, in the order they are offered on the sign-in screen. */
export const socialProviders: SocialProviderMeta[] = [
  {
    id: 'google',
    label: 'Google로 시작하기',
    backgroundColor: '#FFFFFF',
    textColor: '#1F1F1F',
    borderColor: '#DADCE0',
  },
  {
    id: 'apple',
    label: 'Apple로 시작하기',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    borderColor: '#000000',
  },
];
