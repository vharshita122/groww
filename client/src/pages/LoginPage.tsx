import React, { useState } from 'react';
import { Activity, ArrowRight, Zap, Lock, Mail } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserSession } from '../types';

interface Props {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase credentials (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) must be configured in client/.env to use Google OAuth.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      // Fallback to Demo Mode automatically
      onLoginSuccess({
        id: 'demo-user',
        email: email || 'demo@marketpulse.in',
        isDemo: true,
      });
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          if (data.session) {
            onLoginSuccess({
              id: data.user.id,
              email: data.user.email || email,
              isDemo: false,
            });
          } else {
            setMessage('Account created successfully! Check your email for confirmation, or login.');
            setIsSignUp(false);
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          onLoginSuccess({
            id: data.user.id,
            email: data.user.email || email,
            isDemo: false,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoQuickAccess = () => {
    onLoginSuccess({
      id: 'demo-user',
      email: 'investor.demo@marketpulse.in',
      isDemo: true,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0a]">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00D09C]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121418] rounded-3xl p-8 border border-slate-800/80 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center space-y-3 mb-8">
          <img src="/groww-logo.svg" alt="Groww" className="w-14 h-14 drop-shadow-xl" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Groww</h1>
          <p className="text-sm text-slate-400 font-medium">
            Simple, Transparent, Free Investing
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center space-x-3 mb-4 disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-slate-800" />
          <span className="px-3 text-xs text-slate-500 font-semibold uppercase">Or Email & Password</span>
          <div className="flex-1 border-t border-slate-800" />
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs mb-4">
            {message}
          </div>
        )}

        {/* Account Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="investor@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D09C] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D09C] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#00D09C] hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-[#00D09C]/20 active:scale-[0.99]"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Registered Account' : 'Sign In with Registered Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-slate-400 hover:text-[#00D09C] font-semibold transition"
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : 'Don’t have an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};


