import { useState, useEffect, useRef, useCallback } from 'react';

interface TextFormatToolbarProps {
    editorRef: React.RefObject<HTMLDivElement | null>;
}

type BlockType = 'text' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'checklist';

const BLOCK_OPTIONS: { type: BlockType; label: string; icon: string }[] = [
    { type: 'text', label: '텍스트', icon: 'T' },
    { type: 'h1', label: '제목 1', icon: 'H₁' },
    { type: 'h2', label: '제목 2', icon: 'H₂' },
    { type: 'h3', label: '제목 3', icon: 'H₃' },
    { type: 'ul', label: '글머리 기호 목록', icon: '⁝≡' },
    { type: 'ol', label: '번호 매기기 목록', icon: '¹≡' },
    { type: 'checklist', label: '할 일 목록', icon: '☑≡' },
];

export function TextFormatToolbar({ editorRef }: TextFormatToolbarProps) {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [currentBlock, setCurrentBlock] = useState<BlockType>('text');
    const toolbarRef = useRef<HTMLDivElement>(null);
    const dropdownBtnRef = useRef<HTMLDivElement>(null);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

    const detectCurrentBlock = useCallback((): BlockType => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return 'text';
        let node: Node | null = selection.getRangeAt(0).startContainer;
        while (node && node !== editorRef.current) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const tag = el.tagName.toLowerCase();
                if (tag === 'h1') return 'h1';
                if (tag === 'h2') return 'h2';
                if (tag === 'h3') return 'h3';
                if (tag === 'li') {
                    const parent = el.parentElement;
                    if (parent?.tagName.toLowerCase() === 'ol') return 'ol';
                    if (parent?.tagName.toLowerCase() === 'ul') {
                        // Check if checklist
                        if (el.querySelector('input[type="checkbox"]')) return 'checklist';
                        return 'ul';
                    }
                }
            }
            node = node.parentNode;
        }
        return 'text';
    }, [editorRef]);

    const checkActiveFormats = useCallback(() => {
        const formats = new Set<string>();
        if (document.queryCommandState('bold')) formats.add('bold');
        if (document.queryCommandState('italic')) formats.add('italic');
        if (document.queryCommandState('underline')) formats.add('underline');
        if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
        setActiveFormats(formats);
        setCurrentBlock(detectCurrentBlock());
    }, [detectCurrentBlock]);

    const showToolbarIfSelection = useCallback(() => {
        // Small delay to let the selection finalize
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !editorRef.current) {
                setVisible(false);
                setShowBlockMenu(false);
                return;
            }

            const range = selection.getRangeAt(0);
            if (!editorRef.current.contains(range.commonAncestorContainer)) {
                setVisible(false);
                setShowBlockMenu(false);
                return;
            }

            const rect = range.getBoundingClientRect();
            const toolbarWidth = 280;
            let left = rect.left + rect.width / 2 - toolbarWidth / 2;
            left = Math.max(8, left);

            setPosition({
                top: rect.bottom + 8,
                left,
            });
            setVisible(true);
            checkActiveFormats();
        }, 10);
    }, [editorRef, checkActiveFormats]);

    // Hide toolbar when selection collapses (e.g. clicking away)
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                setVisible(false);
                setShowBlockMenu(false);
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    // Show toolbar on mouseup anywhere (in case drag ends outside editor)
    useEffect(() => {
        document.addEventListener('mouseup', showToolbarIfSelection);
        return () => document.removeEventListener('mouseup', showToolbarIfSelection);
    }, [showToolbarIfSelection]);

    // Close block menu on outside click
    useEffect(() => {
        if (!showBlockMenu) return;
        const handleClick = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setShowBlockMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showBlockMenu]);

    const applyFormat = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
        checkActiveFormats();
    };

    const applyBlockType = (type: BlockType) => {
        const editor = editorRef.current;
        if (!editor) return;

        switch (type) {
            case 'text':
                document.execCommand('formatBlock', false, 'div');
                break;
            case 'h1':
                document.execCommand('formatBlock', false, 'h1');
                break;
            case 'h2':
                document.execCommand('formatBlock', false, 'h2');
                break;
            case 'h3':
                document.execCommand('formatBlock', false, 'h3');
                break;
            case 'ul':
                document.execCommand('insertUnorderedList', false);
                break;
            case 'ol':
                document.execCommand('insertOrderedList', false);
                break;
            case 'checklist': {
                // Insert a simple checklist using unordered list with checkboxes
                document.execCommand('insertUnorderedList', false);
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    let node: Node | null = selection.getRangeAt(0).startContainer;
                    while (node && node.nodeName !== 'LI') {
                        node = node.parentNode;
                    }
                    if (node && node.nodeName === 'LI') {
                        const li = node as HTMLElement;
                        if (!li.querySelector('input[type="checkbox"]')) {
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.style.marginRight = '6px';
                            checkbox.style.cursor = 'pointer';
                            li.insertBefore(checkbox, li.firstChild);
                        }
                    }
                }
                break;
            }
        }

        setCurrentBlock(type);
        setShowBlockMenu(false);
        editor.focus();
    };

    const currentLabel = BLOCK_OPTIONS.find((o) => o.type === currentBlock)?.label || '텍스트';

    if (!visible) return null;

    return (
        <div
            ref={toolbarRef}
            className="text-format-toolbar"
            style={{ top: position.top, left: position.left }}
            onMouseDown={(e) => e.preventDefault()}
        >
            {/* Block type dropdown */}
            <div className="fmt-block-dropdown-wrapper" ref={dropdownBtnRef}>
                <button
                    className="fmt-btn-dropdown"
                    onClick={() => setShowBlockMenu(!showBlockMenu)}
                    title="블록 형식"
                >
                    <span className="fmt-btn-label">{currentLabel}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
                {showBlockMenu && (() => {
                    const btnRect = dropdownBtnRef.current?.getBoundingClientRect();
                    const menuHeight = 220;
                    const spaceBelow = btnRect ? window.innerHeight - btnRect.bottom - 8 : 999;
                    const openUp = spaceBelow < menuHeight && btnRect;
                    const menuStyle: React.CSSProperties = btnRect ? {
                        left: btnRect.left,
                        ...(openUp
                            ? { bottom: window.innerHeight - btnRect.top + 4 }
                            : { top: btnRect.bottom + 4 }),
                    } : {};
                    return (
                        <div className="fmt-block-menu" style={menuStyle}>
                            {BLOCK_OPTIONS.map((opt) => (
                                <button
                                    key={opt.type}
                                    className={`fmt-block-option ${currentBlock === opt.type ? 'active' : ''}`}
                                    onClick={() => applyBlockType(opt.type)}
                                >
                                    <span className="fmt-block-icon">{opt.icon}</span>
                                    <span className="fmt-block-label">{opt.label}</span>
                                    {currentBlock === opt.type && <span className="fmt-block-check">✓</span>}
                                </button>
                            ))}
                        </div>
                    );
                })()}
            </div>

            <div className="fmt-divider" />

            <button
                className={`fmt-btn ${activeFormats.has('bold') ? 'active' : ''}`}
                onClick={() => applyFormat('bold')}
                title="Bold"
            >
                <strong>B</strong>
            </button>
            <button
                className={`fmt-btn ${activeFormats.has('italic') ? 'active' : ''}`}
                onClick={() => applyFormat('italic')}
                title="Italic"
            >
                <em>I</em>
            </button>
            <button
                className={`fmt-btn ${activeFormats.has('underline') ? 'active' : ''}`}
                onClick={() => applyFormat('underline')}
                title="Underline"
            >
                <span style={{ textDecoration: 'underline' }}>U</span>
            </button>
            <button
                className={`fmt-btn ${activeFormats.has('strikeThrough') ? 'active' : ''}`}
                onClick={() => applyFormat('strikeThrough')}
                title="Strikethrough"
            >
                <span style={{ textDecoration: 'line-through' }}>S</span>
            </button>
        </div>
    );
}
