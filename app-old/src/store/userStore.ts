import { create } from 'zustand';

interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar: string;
  address: any[];
  location?: any;
  gardenStats?: any;
}

interface UserState {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: null,
  setUser: (user, token) => {
    globalThis.__USER_TOKEN__ = token;
    set({ user, token });
  },
  logout: () => {
    globalThis.__USER_TOKEN__ = null;
    set({ user: null, token: null });
  },
}));
