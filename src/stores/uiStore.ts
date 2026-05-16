import { create } from 'zustand';

export type RightPanelTab = 'layers' | 'ai' | 'preview3d' | 'shopping';

interface UIState {
  rightTab: RightPanelTab;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  showGrid: boolean;
  setRightTab: (tab: RightPanelTab) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleGrid: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  rightTab: 'layers',
  leftPanelOpen: true,
  rightPanelOpen: true,
  showGrid: false,
  setRightTab: (tab) => set({ rightTab: tab, rightPanelOpen: true }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
}));
