import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

interface SignUpPageProps {
    onSwitchToLogin: () => void;
}

export function SignUpPage({ onSwitchToLogin }: SignUpPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const { signUp, loading, error, clearError } = useAuthStore();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (password.length < 8) {
            setLocalError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setLocalError('Passwords do not match.');
            return;
        }

        const success = await signUp(email, password);
        if (success) {
            const { session } = useAuthStore.getState();
            if (!session) {
                setNeedsVerification(true);
            }
        }
    };

    const displayError = localError || error;

    if (needsVerification) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Check your email</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                        We sent a verification link to <strong style={{ color: 'white' }}>{email}</strong>.
                        <br />
                        Please click the link to verify your account, then return here to sign in.
                    </p>
                    <button onClick={onSwitchToLogin} className="btn-primary" style={{ width: '100%' }}>
                        Go to Login
                    </button>
                    <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Didn't receive an email? Check your spam folder.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <defs>
                            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                        </defs>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                    <h1>SYMOA</h1>
                </div>
                <p className="auth-subtitle">Create your account to get started</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    {displayError && (
                        <div className="auth-error" onClick={() => { clearError(); setLocalError(''); }}>
                            {displayError}
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="signup-email">Email</label>
                        <input
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="signup-password">Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            required
                            minLength={8}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirm-password">Confirm Password</label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            required
                            minLength={8}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="link-btn">
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
}
