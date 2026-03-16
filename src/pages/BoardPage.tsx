import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotesStore } from '../stores/useNotesStore';
import { useNotesQuery, useCreateNote } from '../hooks/useNotes';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { Toolbar } from '../components/Toolbar';
import { NOTE_COLORS } from '../types/note';
import { useUpdateNote, useDeleteNote } from '../hooks/useNotes';
import { DeleteModal } from '../components/DeleteModal';
import { ColorPicker } from '../components/ColorPicker';
import { TextFormatToolbar } from '../components/TextFormatToolbar';

function renumberTextLists(root: HTMLElement) {
    let currentNumber = 0;
    let inList = false;
    let changed = false;

    const children = Array.from(root.childNodes);
    const selection = window.getSelection();
    let caretNode: Node | null = null;
    let caretOffset = 0;

    if (selection && selection.rangeCount > 0) {
        caretNode = selection.getRangeAt(0).startContainer;
        caretOffset = selection.getRangeAt(0).startOffset;
    }

    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        
        let textNodeToUpdate: Node | null = null;
        let lineText = '';

        if (node.nodeType === Node.TEXT_NODE) {
            textNodeToUpdate = node;
            lineText = node.textContent || '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const firstChild = el.firstChild;
            if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
                textNodeToUpdate = firstChild;
                lineText = firstChild.textContent || '';
            } else {
                const text = el.textContent || '';
                if (!text.trim()) inList = false;
            }
        }

        if (textNodeToUpdate) {
            const match = lineText.match(/^(\d+)\.\s/);
            if (match) {
                if (!inList) {
                    inList = true;
                    currentNumber = parseInt(match[1], 10);
                } else {
                    currentNumber++;
                    const expectedStr = `${currentNumber}. `;
                    const actualStr = `${match[1]}. `;
                    
                    if (expectedStr !== actualStr) {
                        const newText = lineText.replace(/^(\d+)\.\s/, expectedStr);
                        textNodeToUpdate.textContent = newText;
                        changed = true;

                        if (textNodeToUpdate === caretNode) {
                            const diff = expectedStr.length - actualStr.length;
                            caretOffset = Math.max(0, caretOffset + diff);
                        }
                    }
                }
            } else if (lineText.trim().length > 0) {
                inList = false;
            }
        }
    }

    if (changed && caretNode && selection) {
        try {
            const range = document.createRange();
            const maxOffset = caretNode.textContent?.length || 0;
            range.setStart(caretNode, Math.min(caretOffset, maxOffset));
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            console.error('Error restoring selection after renumber', e);
        }
    }

    return changed;
}

export function BoardPage() {
    const notes = useNotesStore((s) => s.notes);
    const { isFetching } = useNotesQuery();
    const createNote = useCreateNote();
    const updateNote = useUpdateNote();
    const deleteNote = useDeleteNote();

    useRealtimeSync();

    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [sortMode, setSortMode] = useState<'newest' | 'oldest'>('newest');
    const [showSortMenu, setShowSortMenu] = useState(false);

    const sortMenuRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInternalUpdate = useRef(false);

    // Sort notes
    const sortedNotes = [...notes].sort((a, b) => {
        if (sortMode === 'oldest') {
            return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    const selectedNote = notes.find((n) => n.id === selectedNoteId);

    // Sync content when selection changes
    useEffect(() => {
        if (selectedNote && editorRef.current) {
            isInternalUpdate.current = true;
            editorRef.current.innerHTML = selectedNote.content;
            isInternalUpdate.current = false;
        } else if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
    }, [selectedNote?.id]); // Only sync when switching notes

    // Sync external content updates
    useEffect(() => {
        if (selectedNote && editorRef.current && !isInternalUpdate.current) {
            const currentContent = editorRef.current.innerHTML;
            if (selectedNote.content !== currentContent) {
                // Save and restore cursor position
                const selection = window.getSelection();
                const hadFocus = document.activeElement === editorRef.current;
                
                let savedPath: number[] | null = null;
                let savedStartOffset = 0;

                if (hadFocus && selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    let current: Node | null = range.startContainer;
                    const path: number[] = [];
                    while (current && current !== editorRef.current) {
                        const parentNode: Node | null = current.parentNode as Node | null;
                        if (!parentNode) {
                            path.length = 0;
                            break;
                        }
                        path.push(Array.from(parentNode.childNodes).indexOf(current as ChildNode));
                        current = parentNode;
                    }
                    if (path.length > 0 || current === editorRef.current) {
                        savedPath = path.reverse();
                        savedStartOffset = range.startOffset;
                    }
                }

                isInternalUpdate.current = true;
                editorRef.current.innerHTML = selectedNote.content;
                isInternalUpdate.current = false;

                if (hadFocus && savedPath && selection) {
                    try {
                        let node: Node = editorRef.current;
                        for (const index of savedPath) {
                            if (!node.childNodes[index]) break;
                            node = node.childNodes[index];
                        }
                        const range = document.createRange();
                        const isText = node.nodeType === Node.TEXT_NODE;
                        const maxOffset = isText ? (node.textContent?.length || 0) : node.childNodes.length;
                        range.setStart(node, Math.min(savedStartOffset, maxOffset));
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } catch {
                        // fallback omitted
                    }
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNote?.content]);

    const handleCreateNote = async () => {
        const newNote = await createNote.mutateAsync({});
        setSelectedNoteId(newNote.id);
    };

    // Close sort menu on outside click
    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
            setShowSortMenu(false);
        }
    }, []);

    useEffect(() => {
        if (showSortMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showSortMenu, handleClickOutside]);

    const handleEditorInput = () => {
        if (!selectedNoteId || !editorRef.current || isInternalUpdate.current) return;
        
        // Auto-renumber lists if needed
        renumberTextLists(editorRef.current);
        
        const value = editorRef.current.innerHTML;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            updateNote.mutate({ id: selectedNoteId, updates: { content: value } });
        }, 500);
    };

    // Auto-numbering on Enter
    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Enter' || e.shiftKey) return;

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let blockNode: Node | null = range.startContainer;

        // Find the nearest block-level element
        while (blockNode && blockNode !== editorRef.current) {
            if (blockNode.nodeType === Node.ELEMENT_NODE) {
                const tag = (blockNode as HTMLElement).tagName.toUpperCase();
                if (['DIV', 'P', 'H1', 'H2', 'H3', 'LI', 'UL', 'OL'].includes(tag)) {
                    break;
                }
            }
            blockNode = blockNode.parentNode;
        }

        let targetNodeToClear: Node | null = null;
        let lineText = '';
        if (blockNode && blockNode !== editorRef.current) {
            lineText = blockNode.textContent || '';
            targetNodeToClear = blockNode;
        } else {
            lineText = range.startContainer.textContent || '';
            targetNodeToClear = range.startContainer;
        }

        const match = lineText.match(/^(\d+)\.\s/);

        if (match) {
            e.preventDefault();
            const nextNum = parseInt(match[1], 10) + 1;

            const contentAfterNumber = lineText.replace(/^\d+\.\s*/, '').trim();
            if (!contentAfterNumber) {
                // Empty list item: clear it and stop numbering
                if (targetNodeToClear && targetNodeToClear !== editorRef.current) {
                    const newRange = document.createRange();
                    newRange.selectNodeContents(targetNodeToClear);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    document.execCommand('delete', false);
                    document.execCommand('insertHTML', false, '<br>');
                    selection.collapseToEnd();
                } else {
                    document.execCommand('insertParagraph', false);
                }
                handleEditorInput();
                return;
            }

            // Normal list item: standard Enter behavior + inject next number
            document.execCommand('insertParagraph', false);
            document.execCommand('insertText', false, `${nextNum}. `);
            
            handleEditorInput();
        }
    };

    const handleDelete = () => {
        if (!selectedNoteId) return;
        deleteNote.mutate(selectedNoteId);
        setSelectedNoteId(null);
        setShowDeleteModal(false);
    };

    const getPreview = (content: string) => {
        if (!content.trim()) return 'New Note';
        // Strip HTML tags, decode entities, get first meaningful line
        const tmp = document.createElement('div');
        tmp.innerHTML = content;
        const text = tmp.textContent || tmp.innerText || '';
        const firstLine = text.split('\n').find((l) => l.trim().length > 0)?.trim();
        return firstLine || 'New Note';
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
            return '오늘';
        }
        return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' });
    };

    return (
        <div className="layout-container">
            {/* Main Content */}
            <div className="layout-body">
                {/* Left Sidebar */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <div className="sort-dropdown-wrapper" ref={sortMenuRef}>
                            <button className="sidebar-btn-icon" title="Sort" onClick={() => setShowSortMenu(!showSortMenu)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="4" y1="6" x2="16" y2="6" />
                                    <line x1="8" y1="12" x2="20" y2="12" />
                                    <line x1="4" y1="18" x2="16" y2="18" />
                                </svg>
                            </button>
                            {showSortMenu && (
                                <div className="sort-dropdown">
                                    <button
                                        className={`sort-option ${sortMode === 'newest' ? 'active' : ''}`}
                                        onClick={() => { setSortMode('newest'); setShowSortMenu(false); }}
                                    >
                                        <span className="check-icon">{sortMode === 'newest' ? '✓' : ''}</span>
                                        최신순
                                    </button>
                                    <button
                                        className={`sort-option ${sortMode === 'oldest' ? 'active' : ''}`}
                                        onClick={() => { setSortMode('oldest'); setShowSortMenu(false); }}
                                    >
                                        <span className="check-icon">{sortMode === 'oldest' ? '✓' : ''}</span>
                                        오래된 순
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="sidebar-btn-icon btn-primary-icon" onClick={handleCreateNote} title="New Note" disabled={createNote.isPending}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                        </button>
                    </div>

                    <div className="sidebar-list">
                        {sortedNotes.map((note) => {
                            const isSelected = note.id === selectedNoteId;
                            const colors = NOTE_COLORS[note.color];

                            return (
                                <div
                                    key={note.id}
                                    className={`sidebar-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedNoteId(note.id)}
                                >
                                    <div className="sidebar-item-indicator" style={{ backgroundColor: colors.header }} />
                                    <div className="sidebar-item-content">
                                        <div className="sidebar-item-title">{getPreview(note.content)}</div>
                                        <div className="sidebar-item-date">{formatDate(note.updated_at)}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {notes.length === 0 && !isFetching && (
                            <div className="sidebar-empty">
                                <p>No notes yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Editor */}
                <div className="editor-pane">
                    {selectedNote ? (
                        <>
                            <div className="editor-toolbar">
                                <Toolbar isSyncing={isFetching} />
                                <div className="editor-actions">
                                    <ColorPicker
                                        currentColor={selectedNote.color}
                                        onSelect={(color) => updateNote.mutate({ id: selectedNote.id, updates: { color } })}
                                    />
                                    <button
                                        className="editor-btn-icon"
                                        title="Delete Note"
                                        onClick={() => setShowDeleteModal(true)}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <TextFormatToolbar editorRef={editorRef} />
                            <div
                                ref={editorRef}
                                className="content-editable"
                                contentEditable
                                suppressContentEditableWarning
                                onInput={handleEditorInput}
                                onKeyDown={handleEditorKeyDown}
                                data-placeholder="Start typing your note..."
                            />
                        </>
                    ) : (
                        <div className="editor-empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                            <h3>Select a note</h3>
                            <p>or create a new one to get started</p>
                        </div>
                    )}
                </div>
            </div>

            {showDeleteModal && (
                <DeleteModal
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
}
