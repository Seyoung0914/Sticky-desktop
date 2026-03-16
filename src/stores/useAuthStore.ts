import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    error: string | null;

    login: (email: string, password: string) => Promise<boolean>;
    signUp: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    restoreSession: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    loading: true,
    error: null,

    login: async (email, password) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            set({ loading: false, error: error.message });
            return false;
        }
        set({ user: data.user, session: data.session, loading: false });
        return true;
    },

    signUp: async (email, password) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            set({ loading: false, error: error.message });
            return false;
        }
        set({ user: data.user, session: data.session, loading: false });
        return true;
    },

    logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
    },

    restoreSession: async () => {
        set({ loading: true });
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            set({ user: data.session.user, session: data.session, loading: false });
        } else {
            set({ loading: false });
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((_event, session) => {
            set({ user: session?.user ?? null, session });
        });
    },

    clearError: () => set({ error: null }),
}));
