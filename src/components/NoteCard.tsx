import { useState, useRef, useCallback, useEffect } from 'react';
import type { Note, NoteColor } from '../types/note';
import { NOTE_COLORS } from '../types/note';
import { useUpdateNote, useDeleteNote } from '../hooks/useNotes';
import { ColorPicker } from './ColorPicker';
import { DeleteModal } from './DeleteModal';

interface NoteCardProps {
    note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
    const updateNote = useUpdateNote();
    const deleteNote = useDeleteNote();

    const [content, setContent] = useState(note.content);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external note content changes
    useEffect(() => {
        setContent(note.content);
    }, [note.content]);

    // Debounced content save
    const saveContent = useCallback(
        (newContent: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                updateNote.mutate({ id: note.id, updates: { content: newContent } });
            }, 500);
        },
        [note.id, updateNote]
    );

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setContent(value);
        saveContent(value);
    };

    // Drag handlers
    const handleDragStart = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            noteX: note.x_position,
            noteY: note.y_position,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleDragMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const newX = dragStartRef.current.noteX + dx;
        const newY = dragStartRef.current.noteY + dy;

        if (cardRef.current) {
            cardRef.current.style.left = `${newX}px`;
            cardRef.current.style.top = `${newY}px`;
        }
    };

    const handleDragEnd = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const newX = Math.max(0, dragStartRef.current.noteX + dx);
        const newY = Math.max(0, dragStartRef.current.noteY + dy);
        updateNote.mutate({ id: note.id, updates: { x_position: newX, y_position: newY } });
    };

    // Resize handlers
    const handleResizeStart = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: note.width,
            height: note.height,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleResizeMove = (e: React.PointerEvent) => {
        if (!isResizing) return;
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        const newWidth = Math.max(180, resizeStartRef.current.width + dx);
        const newHeight = Math.max(120, resizeStartRef.current.height + dy);

        if (cardRef.current) {
            cardRef.current.style.width = `${newWidth}px`;
            cardRef.current.style.height = `${newHeight}px`;
        }
    };

    const handleResizeEnd = (e: React.PointerEvent) => {
        if (!isResizing) return;
        setIsResizing(false);
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        const newWidth = Math.max(180, resizeStartRef.current.width + dx);
        const newHeight = Math.max(120, resizeStartRef.current.height + dy);
        updateNote.mutate({ id: note.id, updates: { width: newWidth, height: newHeight } });
    };

    const handleColorChange = (color: NoteColor) => {
        updateNote.mutate({ id: note.id, updates: { color } });
    };

    const handleDelete = () => {
        deleteNote.mutate(note.id);
        setShowDeleteModal(false);
    };

    const colors = NOTE_COLORS[note.color];

    return (
        <>
            <div
                ref={cardRef}
                className={`note-card ${isDragging ? 'dragging' : ''}`}
                style={{
                    left: note.x_position,
                    top: note.y_position,
                    width: note.width,
                    height: note.height,
                    backgroundColor: colors.bg,
                }}
            >
                {/* Header */}
                <div
                    className="note-header"
                    style={{ backgroundColor: colors.header }}
                    onPointerDown={handleDragStart}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                >
                    <ColorPicker currentColor={note.color} onSelect={handleColorChange} />
                    <div className="note-header-spacer" />
                    <button
                        className="note-btn-delete"
                        onClick={() => setShowDeleteModal(true)}
                        title="Delete"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="note-body">
                    <textarea
                        className="note-textarea"
                        value={content}
                        onChange={handleContentChange}
                        placeholder="Type your note..."
                        style={{ backgroundColor: 'transparent' }}
                    />
                </div>

                {/* Resize Handle */}
                <div
                    className="note-resize-handle"
                    onPointerDown={handleResizeStart}
                    onPointerMove={handleResizeMove}
                    onPointerUp={handleResizeEnd}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4">
                        <line x1="21" y1="15" x2="15" y2="21" />
                        <line x1="21" y1="9" x2="9" y2="21" />
                    </svg>
                </div>
            </div>

            {showDeleteModal && (
                <DeleteModal
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </>
    );
}
