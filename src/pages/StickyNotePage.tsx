import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCurrentWindow } from '@tauri-apps/api/window';
import '../App.css';

interface StickyNoteData {
    id: string;
    content: string;
    color: string;
}

const COLOR_MAP: Record<string, { bg: string; header: string }> = {
    yellow: { bg: '#FFF9C4', header: '#f0c800' },
    pink: { bg: '#F8BBD0', header: '#F48FB1' },
    blue: { bg: '#BBDEFB', header: '#90CAF9' },
    green: { bg: '#C8E6C9', header: '#A5D6A7' },
    purple: { bg: '#E1BEE7', header: '#CE93D8' },
};

export function StickyNotePage() {
    const [note, setNote] = useState<StickyNoteData | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const noteId = new URLSearchParams(window.location.search).get('noteId');

    // 노트 데이터 로드
    useEffect(() => {
        if (!noteId) return;
        (async () => {
            const { data } = await supabase
                .from('notes')
                .select('id, content, color')
                .eq('id', noteId)
                .single();
            if (data) {
                setNote(data as StickyNoteData);
            }
        })();
    }, [noteId]);

    // 에디터에 콘텐츠 동기화
    useEffect(() => {
        if (note && editorRef.current && !editorRef.current.innerHTML) {
            editorRef.current.innerHTML = note.content || '';
        }
    }, [note]);

    // 포커스 상태 — 컨테이너 밖 클릭 시 해제
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 디바운스 저장
    const saveContent = useCallback(
        (html: string) => {
            if (!noteId) return;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(async () => {
                await supabase
                    .from('notes')
                    .update({ content: html })
                    .eq('id', noteId);
            }, 500);
        },
        [noteId]
    );

    const handleInput = () => {
        if (!editorRef.current) return;
        saveContent(editorRef.current.innerHTML);
    };

    const applyFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleClose = async () => {
        const win = getCurrentWindow();
        await win.close();
    };

    const colors = COLOR_MAP[note?.color || 'yellow'] || COLOR_MAP.yellow;

    if (!note) {
        return (
            <div className="sticky-page" style={{ background: '#FFF9C4' }}>
                <div className="sticky-page-loading">로딩 중...</div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="sticky-page"
            style={{ background: colors.bg }}
        >
            {/* 타이틀바 (드래그 영역) */}
            <div className="sticky-page-titlebar" data-tauri-drag-region>
                <div style={{ flex: 1 }} data-tauri-drag-region />
                <button className="close-btn" onClick={handleClose} title="닫기">
                    ✕
                </button>
            </div>

            {/* 에디터 */}
            <div
                ref={editorRef}
                className="sticky-page-editor"
                contentEditable
                spellCheck={false}
                suppressContentEditableWarning
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                data-placeholder="메모를 입력하세요..."
            />

            {/* 포맷 툴바 — 포커스 시에만 표시 */}
            {isFocused && (
                <div className="sticky-page-toolbar">
                    <button
                        className="sticky-fmt-btn"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
                        title="굵게"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        className="sticky-fmt-btn"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
                        title="기울임"
                    >
                        <em>I</em>
                    </button>
                    <button
                        className="sticky-fmt-btn"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}
                        title="밑줄"
                    >
                        <span style={{ textDecoration: 'underline' }}>U</span>
                    </button>
                    <button
                        className="sticky-fmt-btn"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat('strikeThrough'); }}
                        title="취소선"
                    >
                        <span style={{ textDecoration: 'line-through' }}>ab</span>
                    </button>
                    <button
                        className="sticky-fmt-btn"
                        onMouseDown={(e) => { e.preventDefault(); applyFormat('insertUnorderedList'); }}
                        title="목록"
                    >
                        ☰
                    </button>
                </div>
            )}
        </div>
    );
}
