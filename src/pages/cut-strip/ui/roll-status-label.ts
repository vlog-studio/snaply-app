import type { RollStatus } from '@/entities/roll';

/**
 * How a roll's development state is written on this screen. Shared by the cut
 * sheet's roll rows and the delete dialog's affected list so the same roll never
 * reads as two different states one tap apart.
 */
export const RollStatusLabels: Record<RollStatus, string> = {
  undeveloped: '미현상',
  developing: '현상 중',
  developed: '현상 완료',
};
