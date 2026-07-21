/** Supported social identity providers a session can be created from. */
export type SocialProvider = 'google' | 'apple';

/** The authenticated account the application currently acts on behalf of. */
export type User = {
  id: string;
  displayName: string;
  provider: SocialProvider;
  avatarUrl?: string;
};
