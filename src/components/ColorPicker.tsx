import { useState } from 'react';
import type { NoteColor } from '../types/note';
import { NOTE_COLORS } from '../types/note';

interface ColorPickerProps {
    currentColor: NoteColor;
    onSelect: (color: NoteColor) => void;
}

export function ColorPicker({ currentColor, onSelect }: ColorPickerProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="color-picker-wrapper">
            <button
                className="color-picker-trigger"
                style={{ backgroundColor: NOTE_COLORS[currentColor].header }}
                onClick={() => setOpen(!open)}
                title="Change color"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                </svg>
            </button>
            {open && (
                <div className="color-picker-popover">
                    {(Object.keys(NOTE_COLORS) as NoteColor[]).map((color) => (
                        <button
                            key={color}
                            className={`color-option ${color === currentColor ? 'active' : ''}`}
                            style={{ backgroundColor: NOTE_COLORS[color].bg }}
                            onClick={() => {
                                onSelect(color);
                                setOpen(false);
                            }}
                            title={NOTE_COLORS[color].name}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
