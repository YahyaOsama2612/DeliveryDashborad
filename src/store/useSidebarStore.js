import { create } from 'zustand';

/**
 * useSidebarStore — tracks which module is currently active in the sidebar.
 */
const useSidebarStore = create((set) => ({
  activeModule: null,
  setActiveModule: (module) => set({ activeModule: module }),
}));

export default useSidebarStore;
