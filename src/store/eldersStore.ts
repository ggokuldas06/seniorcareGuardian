// src/store/eldersStore.ts
import { create } from 'zustand';
import { Elder } from '../types';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

interface EldersState {
  elders: Elder[];
  isLoading: boolean;
  
  // Actions
  addElder: (elder: Elder) => Promise<void>;
  updateElder: (elderId: string, updates: Partial<Elder>) => Promise<void>;
  removeElder: (elderId: string) => Promise<void>;
  loadElders: () => Promise<void>;
  setElders: (elders: Elder[]) => Promise<void>;
  getElderById: (elderId: string) => Elder | undefined;
}

export const useEldersStore = create<EldersState>((set, get) => ({
  elders: [],
  isLoading: false,

  addElder: async (elder: Elder) => {
    const currentElders = get().elders;
    const updatedElders = [...currentElders, elder];
    
    // Save to cache
    await storage.setItem(STORAGE_KEYS.ELDERS_CACHE, updatedElders);
    
    // Update state
    set({ elders: updatedElders });
  },

  updateElder: async (elderId: string, updates: Partial<Elder>) => {
    const currentElders = get().elders;
    const updatedElders = currentElders.map((elder) =>
      elder.id === elderId ? { ...elder, ...updates } : elder
    );
    
    // Save to cache
    await storage.setItem(STORAGE_KEYS.ELDERS_CACHE, updatedElders);
    
    // Update state
    set({ elders: updatedElders });
  },

  removeElder: async (elderId: string) => {
    const currentElders = get().elders;
    const updatedElders = currentElders.filter((elder) => elder.id !== elderId);
    
    // Save to cache
    await storage.setItem(STORAGE_KEYS.ELDERS_CACHE, updatedElders);
    
    // Update state
    set({ elders: updatedElders });
  },

  loadElders: async () => {
    try {
      set({ isLoading: true });
      const cachedElders = await storage.getItem<Elder[]>(STORAGE_KEYS.ELDERS_CACHE);
      
      if (cachedElders) {
        set({ elders: cachedElders });
      }
    } catch (error) {
      console.error('Error loading elders:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setElders: async (elders: Elder[]) => {
    await storage.setItem(STORAGE_KEYS.ELDERS_CACHE, elders);
    set({ elders });
  },

  getElderById: (elderId: string) => {
    return get().elders.find((elder) => elder.id === elderId);
  },
}));