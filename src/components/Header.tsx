import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './Auth';
import { LogOut, User, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, role, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

  return (
    <header className="flex justify-between items-center py-6 md:py-8 gap-4 print:hidden">
      <h1 className="font-display text-4xl md:text-6xl uppercase tracking-tighter bg-action text-white px-4 py-2 neo-border neo-shadow-static transform -rotate-2">
        KathMC
      </h1>
      
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 bg-white p-2 neo-border neo-shadow hover:bg-gray-50 transition-colors cursor-pointer"
          aria-label="User menu"
          aria-expanded={isMenuOpen}
        >
          <div className="bg-paper w-10 h-10 flex items-center justify-center rounded-full neo-border font-display text-xl font-black">
            {initial}
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-3 w-64 bg-white neo-border neo-shadow-static z-50 flex flex-col">
            <div className="p-4 border-b-4 border-black bg-paper">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Signed in as</p>
              <p className="font-bold text-sm truncate" title={user?.email}>{user?.email}</p>
              <div className={`inline-block mt-3 px-2 py-1 text-xs font-black uppercase tracking-widest neo-border ${role === 'admin' ? 'bg-green-300' : 'bg-gray-200'}`}>
                {role}
              </div>
            </div>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                signOut();
              }}
              className="flex items-center gap-3 p-4 text-left font-bold uppercase tracking-wider hover:bg-red-400 hover:text-black transition-colors cursor-pointer w-full"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
