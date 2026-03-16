interface DeleteModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteModal({ onConfirm, onCancel }: DeleteModalProps) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                </div>
                <h3>Delete Note</h3>
                <p>Are you sure you want to delete this note? This action cannot be undone.</p>
                <div className="modal-actions">
                    <button className="btn-cancel" onClick={onCancel}>Cancel</button>
                    <button className="btn-delete" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </div>
    );
}
