import { create } from 'zustand';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ISP_ADMIN' | 'TECHNICIAN';
    tenantId?: string;
}

interface SessionState {
    user: UserProfile | null;
    isAuthenticated: boolean;
    login: (user: UserProfile) => void;
    logout: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    user: null,
    isAuthenticated: false,
    login: (user) => set({ user, isAuthenticated: true }),
    logout: () => set({ user: null, isAuthenticated: false }),
}));
