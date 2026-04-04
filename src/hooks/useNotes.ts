import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useNotesStore } from '../stores/useNotesStore';
import { useAuthStore } from '../stores/useAuthStore';
import type { Note, NoteUpdate } from '../types/note';
import toast from 'react-hot-toast';

const NOTES_KEY = ['notes'];

export function useNotesQuery() {
    const setNotes = useNotesStore((s) => s.setNotes);
    const user = useAuthStore((s) => s.user);

    return useQuery({
        queryKey: NOTES_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .is('deleted_at', null)
                .order('updated_at', { ascending: false });

            if (error) {
                toast.error(`Failed to load notes: ${error.message}`);
                throw error;
            }
            const notes = (data ?? []) as Note[];
            setNotes(notes);
            return notes;
        },
        enabled: !!user,
    });
}

export function useCreateNote() {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const addNote = useNotesStore((s) => s.addNote);

    return useMutation({
        mutationFn: async (partial?: Partial<Note>) => {
            if (!user) throw new Error('Not authenticated');

            const newNote = {
                user_id: user.id,
                content: '',
                color: 'yellow',
                x_position: 100,
                y_position: 100,
                width: 250,
                height: 200,
                is_pinned: false,
                ...partial,
            };

            const { data, error } = await supabase
                .from('notes')
                .insert(newNote)
                .select()
                .single();

            if (error) {
                toast.error(`Failed to create note: ${error.message}`);
                throw error;
            }
            return data as Note;
        },
        onSuccess: (note) => {
            addNote(note);
            queryClient.invalidateQueries({ queryKey: NOTES_KEY });
        },
    });
}

export function useUpdateNote() {
    const updateNoteInStore = useNotesStore((s) => s.updateNote);

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: NoteUpdate }) => {
            const { data, error } = await supabase
                .from('notes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                toast.error(`Failed to update note: ${error.message}`);
                throw error;
            }
            return data as Note;
        },
        onSuccess: (note) => {
            updateNoteInStore(note.id, note);
        },
    });
}

export function useDeleteNote() {
    const queryClient = useQueryClient();
    const removeNote = useNotesStore((s) => s.removeNote);

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('notes').delete().eq('id', id);
            if (error) {
                toast.error(`Failed to delete note: ${error.message}`);
                throw error;
            }
            return id;
        },
        onSuccess: (id) => {
            removeNote(id);
            queryClient.invalidateQueries({ queryKey: NOTES_KEY });
        },
    });
}
