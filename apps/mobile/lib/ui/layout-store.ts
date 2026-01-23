/**
 * Layout Store
 * 
 * Stores measured positions of UI elements for cross-component animations.
 * Used by flying beans animation to target the bean counter icon.
 */

import { create } from 'zustand';

interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutStore {
  /** Position of the bean icon in the BeanCounter component */
  beanIconPosition: LayoutPosition | null;
  setBeanIconPosition: (position: LayoutPosition | null) => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  beanIconPosition: null,
  setBeanIconPosition: (position) => set({ beanIconPosition: position }),
}));
