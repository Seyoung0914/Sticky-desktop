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
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

function getFirstTextNode(node: Node): Text | null {
    if (node.nodeType === Node.TEXT_NODE) return node as Text;
    for (let i = 0; i < node.childNodes.length; i++) {
        const found = getFirstTextNode(node.childNodes[i]);
        if (found) return found;
    }
    return null;
}

function getFullLineText(node: Node): string {
    return node.textContent || '';
}

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
        
        // Get the full text of this line/block
        const lineText = getFullLineText(node);
        // Get the first text node where the number prefix lives
        const firstTextNode = getFirstTextNode(node);

        if (!firstTextNode || !lineText.trim()) {
            if (!lineText.trim()) inList = false;
            continue;
        }

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
                    // Replace the number in the first text node
                    const textContent = firstTextNode.textContent || '';
                    const textMatch = textContent.match(/^(\d+)\.\s/);
                    if (textMatch) {
                        firstTextNode.textContent = textContent.replace(/^(\d+)\.\s/, expectedStr);
                        changed = true;

                        if (firstTextNode === caretNode) {
                            const diff = expectedStr.length - actualStr.length;
                            caretOffset = Math.max(0, caretOffset + diff);
                        }
                    }
                }
            }
        } else if (lineText.trim().length > 0) {
            inList = false;
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
    const editingNoteIdRef = useRef<string | null>(null);

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
        if (selectedNote && editorRef.current && !isInternalUpdate.current && editingNoteIdRef.current !== selectedNote.id) {
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

        editingNoteIdRef.current = selectedNoteId;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            updateNote.mutate({ id: selectedNoteId, updates: { content: value } });
            // Keep guard for a bit to absorb the echo from realtime sync
            setTimeout(() => { editingNoteIdRef.current = null; }, 2000);
        }, 500);
    };

    // Auto-numbering on Enter + list continuation, and renumber on Backspace/Delete
    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Re-number after Backspace/Delete merges lines
        if (e.key === 'Backspace' || e.key === 'Delete') {
            setTimeout(() => {
                if (editorRef.current) {
                    renumberTextLists(editorRef.current);
                    handleEditorInput();
                }
            }, 0);
            return;
        }

        if (e.key !== 'Enter' || e.shiftKey) return;

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let blockNode: Node | null = range.startContainer;

        // Find the nearest block-level element (LI, DIV, P, H1-H3)
        while (blockNode && blockNode !== editorRef.current) {
            if (blockNode.nodeType === Node.ELEMENT_NODE) {
                const tag = (blockNode as HTMLElement).tagName.toUpperCase();
                if (['DIV', 'P', 'H1', 'H2', 'H3', 'LI', 'UL', 'OL'].includes(tag)) {
                    break;
                }
            }
            blockNode = blockNode.parentNode;
        }

        // Check if we're inside an LI (HTML list)
        let liNode: HTMLElement | null = null;
        let node: Node | null = range.startContainer;
        while (node && node !== editorRef.current) {
            if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'LI') {
                liNode = node as HTMLElement;
                break;
            }
            node = node.parentNode;
        }

        if (liNode) {
            const parentList = liNode.parentElement;
            const isChecklist = parentList?.getAttribute('data-checklist') === 'true';
            
            // Get text content (excluding checkbox text)
            let textContent = '';
            for (const child of Array.from(liNode.childNodes)) {
                if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'INPUT') continue;
                textContent += child.textContent || '';
            }

            if (!textContent.trim()) {
                // Empty list item: exit the list
                e.preventDefault();

                // Remove the empty LI
                liNode.remove();

                // If the list is now empty, remove it too
                if (parentList && parentList.children.length === 0) {
                    const newDiv = document.createElement('div');
                    newDiv.innerHTML = '<br>';
                    parentList.parentNode?.replaceChild(newDiv, parentList);

                    const newRange = document.createRange();
                    newRange.setStart(newDiv, 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } else {
                    // Insert a new line after the list
                    const newDiv = document.createElement('div');
                    newDiv.innerHTML = '<br>';
                    parentList?.parentNode?.insertBefore(newDiv, parentList.nextSibling);

                    const newRange = document.createRange();
                    newRange.setStart(newDiv, 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }

                handleEditorInput();
                return;
            }

            if (isChecklist) {
                // Checklist: let browser create the new LI, then inject a checkbox
                e.preventDefault();

                // Split content at cursor and create new LI
                const newLi = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.marginRight = '6px';
                checkbox.style.cursor = 'pointer';
                newLi.appendChild(checkbox);

                // Move content after cursor to new LI
                const afterRange = document.createRange();
                afterRange.setStart(range.startContainer, range.startOffset);
                afterRange.setEndAfter(liNode.lastChild!);
                const fragment = afterRange.extractContents();
                
                // Remove any checkboxes from the extracted fragment
                const extractedCheckboxes = fragment.querySelectorAll('input[type="checkbox"]');
                extractedCheckboxes.forEach(cb => cb.remove());
                
                newLi.appendChild(fragment);

                // If newLi has no text content, add a zero-width space for cursor placement
                if (!newLi.textContent?.replace(/\u200B/g, '').trim()) {
                    newLi.appendChild(document.createTextNode('\u200B'));
                }

                // Insert after current LI
                liNode.parentNode?.insertBefore(newLi, liNode.nextSibling);

                // Place cursor after checkbox in new LI
                const newRange = document.createRange();
                const textNode = newLi.childNodes[1] || newLi.lastChild;
                if (textNode) {
                    if (textNode.nodeType === Node.TEXT_NODE) {
                        newRange.setStart(textNode, 0);
                    } else {
                        newRange.setStartAfter(textNode);
                    }
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }

                handleEditorInput();
                return;
            }

            // For regular ol/ul, let browser handle the default Enter behavior
            // (it creates new <li> automatically)
            setTimeout(() => handleEditorInput(), 0);
            return;
        }

        // Text-based numbered list handling (e.g. "1. item")
        // Use the full textContent of the block to detect numbers even inside <b>, <i>, etc.
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
            
            // Renumber subsequent items after the insertion
            setTimeout(() => {
                if (editorRef.current) renumberTextLists(editorRef.current);
            }, 0);

            handleEditorInput();
        }
    };

    // Handle checkbox toggling in checklists
    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
            const checkbox = target as HTMLInputElement;
            const li = checkbox.closest('li');
            if (li) {
                // Toggle checked class after the checkbox state updates
                setTimeout(() => {
                    if (checkbox.checked) {
                        li.classList.add('checked');
                    } else {
                        li.classList.remove('checked');
                    }
                    handleEditorInput();
                }, 0);
            }
        }
    };

    const handleDelete = () => {
        if (!selectedNoteId) return;
        deleteNote.mutate(selectedNoteId);
        setSelectedNoteId(null);
        setShowDeleteModal(false);
    };

    const openStickyWindow = async (noteId: string) => {
        try {
            const label = `sticky-${noteId.slice(0, 8)}`;
            // 이미 열린 창이 있는지 확인
            const existing = await WebviewWindow.getByLabel(label);
            if (existing) {
                await existing.setFocus();
                return;
            }
            const webview = new WebviewWindow(label, {
                url: `/?noteId=${noteId}`,
                title: 'SYMOA Memo',
                width: 320,
                height: 420,
                x: 20,
                y: 20,
                decorations: false,
                alwaysOnTop: true,
                resizable: true,
                transparent: false,
            });

            webview.once('tauri://error', (e) => {
                console.error('Tauri Window Error:', e);
                alert(`Window Error: ${JSON.stringify(e)}`);
            });
        } catch (error) {
            console.error('Failed to open window:', error);
            alert(`창 열기 실패: ${error}`);
        }
    };

    const getPreview = (content: string) => {
        if (!content.trim()) return 'New Note';
        
        // 블록 태그와 br 태그를 줄바꿈(\n)으로 변환
        let htmlStr = content;
        htmlStr = htmlStr.replace(/<br\s*\/?>/gi, '\n');
        htmlStr = htmlStr.replace(/<\/?(div|p|h[1-6]|ul|ol|li|blockquote|table|tr)[^>]*>/gi, '\n');
        
        const tmp = document.createElement('div');
        tmp.innerHTML = htmlStr;
        const text = tmp.innerText || tmp.textContent || '';
        
        // 첫 줄 추출
        const firstLine = text.split('\n').find((l) => l.trim().length > 0)?.trim();
        
        if (!firstLine) return 'New Note';
        return firstLine.length > 30 ? firstLine.slice(0, 30) + '…' : firstLine;
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
                                        className="editor-btn-icon sticky-btn"
                                        title="스티커 메모로 열기"
                                        onClick={() => openStickyWindow(selectedNote.id)}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                    </button>
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
                                spellCheck={false}
                                suppressContentEditableWarning
                                onInput={handleEditorInput}
                                onKeyDown={handleEditorKeyDown}
                                onClick={handleEditorClick}
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
