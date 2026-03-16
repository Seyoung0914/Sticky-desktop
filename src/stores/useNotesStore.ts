import { create } from 'zustand';
import type { Note } from '../types/note';

interface NotesState {
    notes: Note[];
    setNotes: (notes: Note[]) => void;
    addNote: (note: Note) => void;
    updateNote: (id: string, updates: Partial<Note>) => void;
    removeNote: (id: string) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
    notes: [],

    setNotes: (notes) => set({ notes }),

    addNote: (note) =>
        set((state) => {
            // Avoid duplicates
            if (state.notes.some((n) => n.id === note.id)) return state;
            return { notes: [...state.notes, note] };
        }),

    updateNote: (id, updates) =>
        set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),

    removeNote: (id) =>
        set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
        })),
}));
