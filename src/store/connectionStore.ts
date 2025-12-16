// src/store/connectionStore.ts
import { create } from 'zustand';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface ConnectionState {
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  error: string | null;
  
  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setReconnectAttempts: (attempts: number) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setLastConnectedAt: (date: Date) => void;
  setError: (error: string | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'disconnected',
  reconnectAttempts: 0,
  lastConnectedAt: null,
  error: null,

  setStatus: (status: ConnectionStatus) => set({ status }),

  setReconnectAttempts: (attempts: number) => set({ reconnectAttempts: attempts }),

  incrementReconnectAttempts: () => {
    const current = get().reconnectAttempts;
    set({ reconnectAttempts: current + 1 });
  },

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  setLastConnectedAt: (date: Date) => set({ lastConnectedAt: date }),

  setError: (error: string | null) => set({ error }),
}));