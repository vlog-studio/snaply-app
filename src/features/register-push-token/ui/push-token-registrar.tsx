import { usePushTokenRegistration } from '../model/use-push-token';

/**
 * Headless mount point for push-token registration. Render once high in the tree
 * (it self-gates on authentication) so the token is acquired and kept in sync
 * for the whole authenticated session.
 */
export function PushTokenRegistrar(): null {
  usePushTokenRegistration();
  return null;
}
