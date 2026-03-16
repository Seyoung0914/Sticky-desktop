export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export interface Note {
    id: string;
    user_id: string;
    content: string;
    color: NoteColor;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type NoteInsert = Omit<Note, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type NoteUpdate = Partial<Omit<Note, 'id' | 'user_id' | 'created_at'>>;

export const NOTE_COLORS: Record<NoteColor, { bg: string; header: string; name: string }> = {
    yellow: { bg: '#FFF9C4', header: '#FFF176', name: 'Yellow' },
    pink: { bg: '#F8BBD0', header: '#F48FB1', name: 'Pink' },
    blue: { bg: '#BBDEFB', header: '#90CAF9', name: 'Blue' },
    green: { bg: '#C8E6C9', header: '#A5D6A7', name: 'Green' },
    purple: { bg: '#E1BEE7', header: '#CE93D8', name: 'Purple' },
};
