// ═══════════════════════════════════════════════════════════════
// Admin Theme Store — Dark/Light mode toggle
// Persisted in localStorage, applies CSS class on <html>
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: (typeof window !== 'undefined' 
        ? (localStorage.getItem('admin-theme') as Theme) || 'light'
        : 'light'),
    
    toggleTheme: () => set((state) => {
        const next = state.theme === 'light' ? 'dark' : 'light';
        if (typeof window !== 'undefined') {
            localStorage.setItem('admin-theme', next);
            document.documentElement.classList.toggle('dark', next === 'dark');
        }
        return { theme: next };
    }),

    setTheme: (theme: Theme) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('admin-theme', theme);
            document.documentElement.classList.toggle('dark', theme === 'dark');
        }
        set({ theme });
    },
}));
