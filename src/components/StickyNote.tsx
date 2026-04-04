import { useState, useRef, useCallback, useEffect } from 'react';

interface StickyNoteProps {
    noteId: string;
    content: string;
    onContentChange: (noteId: string, content: string) => void;
    onClose: () => void;
}

export function StickyNote({ noteId, content, onContentChange, onClose }: StickyNoteProps) {
    const [localContent, setLocalContent] = useState(content);
    const [position, setPosition] = useState({ x: 200, y: 120 });
    const [size, setSize] = useState({ width: 280, height: 300 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
    const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync content from outside (but not while user is editing)
    useEffect(() => {
        setLocalContent(content);
    }, [content]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const val = e.target.value;
            setLocalContent(val);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                onContentChange(noteId, val);
            }, 500);
        },
        [noteId, onContentChange]
    );

    // Drag
    const handleDragStart = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleDragMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPosition({
            x: Math.max(0, dragStartRef.current.posX + dx),
            y: Math.max(0, dragStartRef.current.posY + dy),
        });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    // Resize
    const handleResizeStart = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        resizeStartRef.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleResizeMove = (e: React.PointerEvent) => {
        if (!isResizing) return;
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        setSize({
            width: Math.max(200, resizeStartRef.current.w + dx),
            height: Math.max(150, resizeStartRef.current.h + dy),
        });
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
    };

    return (
        <div
            className="sticky-note-float"
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
            }}
        >
            {/* Header */}
            <div
                className="sticky-note-header"
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
            >
                <div className="sticky-note-header-spacer" />
                <button className="sticky-note-close" onClick={onClose} title="닫기">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Body */}
            <div className="sticky-note-body">
                <textarea
                    className="sticky-note-textarea"
                    value={localContent}
                    onChange={handleChange}
                    placeholder="메모를 입력하세요..."
                />
            </div>

            {/* Resize handle */}
            <div
                className="sticky-note-resize"
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
    );
}
