import { create } from 'zustand';

type TabBarVisibilityState = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const useTabBarVisibilityStore = create<TabBarVisibilityState>()((set) => ({
  hidden: false,
  setHidden: (hidden) => set({ hidden }),
}));

export function useTabBarHidden(): boolean {
  return useTabBarVisibilityStore((state) => state.hidden);
}

export function useSetTabBarHidden() {
  return useTabBarVisibilityStore((state) => state.setHidden);
}
