import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/useAuthStore';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { BoardPage } from './pages/BoardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
      retry: 2,
    },
  },
});

function AuthRouter() {
  const { session, loading, restoreSession } = useAuthStore();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading SyncStick...</p>
      </div>
    );
  }

  if (!session) {
    if (authView === 'signup') {
      return <SignUpPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToSignUp={() => setAuthView('signup')} />;
  }

  return <BoardPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthRouter />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e1e2e',
            color: '#cdd6f4',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
