import type { SocialProvider } from '@/entities/session';

/** Presentation metadata for a social sign-in button. */
export type SocialProviderMeta = {
  id: SocialProvider;
  label: string;
  /** Short badge glyph shown before the label. Replaced by brand assets when real auth is wired. */
  badge: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
};

/** Brand-styled providers, in the order they are offered on the sign-in screen. */
export const socialProviders: SocialProviderMeta[] = [
  {
    id: 'kakao',
    label: '카카오로 시작하기',
    badge: 'K',
    backgroundColor: '#FEE500',
    textColor: '#191600',
    borderColor: '#FEE500',
  },
  {
    id: 'naver',
    label: '네이버로 시작하기',
    badge: 'N',
    backgroundColor: '#03C75A',
    textColor: '#FFFFFF',
    borderColor: '#03C75A',
  },
  {
    id: 'google',
    label: 'Google로 시작하기',
    badge: 'G',
    backgroundColor: '#FFFFFF',
    textColor: '#1F1F1F',
    borderColor: '#DADCE0',
  },
  {
    id: 'apple',
    label: 'Apple로 시작하기',
    badge: 'A',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    borderColor: '#000000',
  },
];
