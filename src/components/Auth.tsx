import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';

type UserRole = 'admin' | 'viewer';

interface AuthContextType {
  user: any;
  role: UserRole;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const Auth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (currentSession: any) => {
    if (!currentSession) {
      setSession(null);
      setRole('viewer');
      setLoading(false);
      return;
    }

    const email = currentSession.user.email || '';
    
    // Check if email contains 082@kathford.edu.np OR is one of the specific admin emails with typos
    const isKathford082 = email.includes('082@kathford.edu.np') || email.includes('082@kahtford.edu.np') || email === 'aryalraj30@gmail.com';
    
    if (!isKathford082) {
      setError('Access Denied. Only Kathford 082 students can access this application.');
      await supabase.auth.signOut();
      setSession(null);
      setRole('viewer');
      setLoading(false);
      return;
    }

    // Determine role
    const adminEmails = [
      'amikshyaacharya.082@kathford.edu.np',
      'amikshyaacharya.082@kahtford.edu.np',
      'rajshekhararyal.082@kathford.edu.np',
      'rajshekhararyal.082@kahtford.edu.np'
    ];

    if (adminEmails.includes(email.toLowerCase())) {
      setRole('admin');
    } else {
      setRole('viewer');
    }

    setError(null);
    setSession(currentSession);
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setError(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-4">
        <div className="bg-white p-8 max-w-md w-full neo-border neo-shadow-static text-center space-y-6">
          <div>
            <h1 className="text-4xl font-display font-black uppercase tracking-widest mb-2">Kathford MC</h1>
            <p className="font-bold text-gray-600">Ledger & Student Management</p>
          </div>

          {error && (
            <div className="bg-red-100 border-4 border-red-500 p-4 text-left flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <p className="font-bold text-red-900 text-sm">{error}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black text-white font-bold uppercase tracking-wider neo-shadow hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>
          </div>
          
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Requires a valid 082@kathford.edu.np email
            <br />
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: session.user, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
