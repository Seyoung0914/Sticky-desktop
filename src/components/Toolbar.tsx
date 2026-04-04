import { useAuthStore } from '../stores/useAuthStore';

interface ToolbarProps {
    isSyncing: boolean;
}

export function Toolbar({ isSyncing }: ToolbarProps) {
    const logout = useAuthStore((s) => s.logout);

    return (
        <div className="app-toolbar">
            <div className="toolbar-left">
                <div className="toolbar-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                    <span className="toolbar-title">SYMOA</span>
                </div>
            </div>

            <div className="toolbar-right">
                <div className={`sync-indicator ${isSyncing ? 'syncing' : 'synced'}`}>
                    <span className="sync-dot" />
                    {isSyncing ? 'Syncing...' : 'Synced'}
                </div>
                <button className="btn-toolbar" onClick={logout} title="Logout">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
