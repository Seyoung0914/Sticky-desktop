import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotesStore } from '../stores/useNotesStore';
import { useAuthStore } from '../stores/useAuthStore';
import type { Note } from '../types/note';

export function useRealtimeSync() {
    const user = useAuthStore((s) => s.user);
    const addNote = useNotesStore((s) => s.addNote);
    const updateNote = useNotesStore((s) => s.updateNote);
    const removeNote = useNotesStore((s) => s.removeNote);

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('notes-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notes',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    addNote(payload.new as Note);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notes',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const updated = payload.new as Note;
                    if (updated.deleted_at) {
                        removeNote(updated.id);
                    } else {
                        updateNote(updated.id, updated);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notes',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    removeNote((payload.old as Note).id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, addNote, updateNote, removeNote]);
}
