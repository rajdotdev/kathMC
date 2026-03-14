import React, { useState } from 'react';
import { StoreProvider } from './store/StoreContext';
import { Header } from './components/Header';
import { SummaryStats } from './components/SummaryStats';
import { Ledger } from './components/Ledger';
import { EventsPage } from './components/EventsPage';
import { StudentsPage } from './components/StudentsPage';
import { TransactionsPage } from './components/TransactionsPage';
import { LayoutDashboard, Calendar, Users, Printer, AlertTriangle, Receipt } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'students' | 'transactions'>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const isMissingEnvVars = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
      {isMissingEnvVars && (
        <div className="mb-8 p-6 bg-red-100 border-4 border-red-500 text-red-900 neo-shadow">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <h2 className="text-2xl font-black uppercase tracking-wider">Missing Database Keys!</h2>
          </div>
          <p className="font-bold mb-2">Your app cannot connect to the database because the Supabase keys are missing.</p>
          <ul className="list-disc pl-6 font-medium space-y-1">
            <li>If you are on <strong>Netlify</strong>, go to Site Configuration &gt; Environment Variables, add <code className="bg-red-200 px-1">VITE_SUPABASE_URL</code> and <code className="bg-red-200 px-1">VITE_SUPABASE_ANON_KEY</code>, and then <strong>Trigger a new deploy</strong>.</li>
            <li>If you are running locally, make sure you have a <code className="bg-red-200 px-1">.env</code> file in your project root.</li>
          </ul>
        </div>
      )}

      <Header />
      
      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 print:hidden">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 md:flex-none flex items-center justify-center px-6 py-3 neo-border font-bold uppercase tracking-wider text-sm transition-colors cursor-pointer ${activeTab === 'dashboard' ? 'bg-black text-white neo-shadow-static' : 'bg-white hover:bg-gray-100 neo-shadow'}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 md:flex-none flex items-center justify-center px-6 py-3 neo-border font-bold uppercase tracking-wider text-sm transition-colors cursor-pointer ${activeTab === 'events' ? 'bg-black text-white neo-shadow-static' : 'bg-white hover:bg-gray-100 neo-shadow'}`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Events
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 md:flex-none flex items-center justify-center px-6 py-3 neo-border font-bold uppercase tracking-wider text-sm transition-colors cursor-pointer ${activeTab === 'students' ? 'bg-black text-white neo-shadow-static' : 'bg-white hover:bg-gray-100 neo-shadow'}`}
          >
            <Users className="w-4 h-4 mr-2" />
            Students
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 md:flex-none flex items-center justify-center px-6 py-3 neo-border font-bold uppercase tracking-wider text-sm transition-colors cursor-pointer ${activeTab === 'transactions' ? 'bg-black text-white neo-shadow-static' : 'bg-white hover:bg-gray-100 neo-shadow'}`}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Transactions
          </button>
        </div>
        {activeTab === 'dashboard' && (
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center px-6 py-3 bg-white neo-border neo-shadow font-bold uppercase tracking-wider text-sm transition-colors cursor-pointer hover:bg-gray-100"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        )}
      </div>

      <main>
        {activeTab === 'dashboard' && (
          <>
            {selectedEventId && selectedEventId !== '' && (
              <SummaryStats selectedEventId={selectedEventId} />
            )}
            <Ledger selectedEventId={selectedEventId} onSelectEvent={setSelectedEventId} />
          </>
        )}
        {activeTab === 'events' && <EventsPage />}
        {activeTab === 'students' && <StudentsPage />}
        {activeTab === 'transactions' && <TransactionsPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
