import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserSession {
    id: string;
    name: string | null;
    email: string;
    role: string;
    tenantId?: string;
}

interface SessionState {
    user: UserSession | null;
    isSidebarOpen: boolean;
    tableDensity: 'normal' | 'compact';
    setSession: (user: UserSession | null) => void;
    toggleSidebar: () => void;
    setTableDensity: (density: 'normal' | 'compact') => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            user: null,
            isSidebarOpen: true,
            tableDensity: 'compact', // Default for ISP power users
            setSession: (user) => set({ user }),
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
            setTableDensity: (density) => set({ tableDensity: density }),
        }),
        {
            name: 'mikrogestor-session',
            partialize: (state) => ({
                isSidebarOpen: state.isSidebarOpen,
                tableDensity: state.tableDensity
            }), // Only persist UI preferences, not sensitive user data for security
        }
    )
);
