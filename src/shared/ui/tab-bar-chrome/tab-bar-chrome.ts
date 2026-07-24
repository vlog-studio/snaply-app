import { create } from 'zustand';

// Screens occasionally replace the bottom chrome with their own action bar
// (e.g. the archive's clip selection mode). The tab navigator and the screen
// live in different slices, so this tiny store is their shared switch: the
// screen flips it, the navigator hides the tab bar and the safelight button.
type TabBarChromeState = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const useTabBarChromeStore = create<TabBarChromeState>()((set) => ({
  hidden: false,
  setHidden: (hidden) => set({ hidden }),
}));

export function useTabBarHidden(): boolean {
  return useTabBarChromeStore((state) => state.hidden);
}

export function useSetTabBarHidden() {
  return useTabBarChromeStore((state) => state.setHidden);
}
