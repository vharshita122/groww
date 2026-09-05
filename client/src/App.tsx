import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UserSession } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const SESSION_STORAGE_KEY = 'marketpulse_session';

export function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Check initial session on mount (catches OAuth redirect callback)
      supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
        if (supaSession?.user) {
          const userSession: UserSession = {
            id: supaSession.user.id,
            email: supaSession.user.email || '',
            isDemo: false,
          };
          setSession(userSession);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userSession));
        }
      });

      // Listen to Supabase Auth state shifts
      const { data: authListener } = supabase.auth.onAuthStateChange((event, supaSession) => {
        if (supaSession?.user) {
          const userSession: UserSession = {
            id: supaSession.user.id,
            email: supaSession.user.email || '',
            isDemo: false,
          };
          setSession(userSession);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userSession));
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase && !session?.isDemo) {
      await supabase.auth.signOut().catch(() => {});
    }
    setSession(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <DashboardPage session={session} onLogout={handleLogout} />;
}

export default App;
