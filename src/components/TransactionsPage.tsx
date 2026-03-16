import React, { useState, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { useAuth } from './Auth';
import { Trash2, Search, Filter, Download, ReceiptText, Calendar, TrendingUp, CreditCard, DollarSign, Printer, X } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export const TransactionsPage: React.FC = () => {
  const { state, dispatch } = useStore();
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // All, 7Days, 30Days
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    return state.transactions.filter(t => {
      const student = state.students.find(s => s.id === t.studentId);
      const event = state.events.find(e => e.id === t.eventId);
      const searchLower = search.toLowerCase();
      const method = t.paymentMethod || 'Cash';
      const tDate = new Date(t.date);
      
      const matchesSearch = (
        student?.name.toLowerCase().includes(searchLower) ||
        student?.rollNo?.toLowerCase().includes(searchLower) ||
        event?.name.toLowerCase().includes(searchLower) ||
        method.toLowerCase().includes(searchLower)
      );

      const matchesMethod = filterMethod === 'All' || method === filterMethod;
      
      let matchesDate = true;
      if (dateFilter === '7Days') matchesDate = tDate >= sevenDaysAgo;
      if (dateFilter === '30Days') matchesDate = tDate >= thirtyDaysAgo;

      return matchesSearch && matchesMethod && matchesDate;
    });
  }, [state.transactions, state.students, state.events, search, filterMethod, dateFilter]);

  // Summary Stats
  const totalCollected = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const avgTransaction = filteredTransactions.length > 0 ? totalCollected / filteredTransactions.length : 0;

  const handleDeletePayment = (transactionId: string) => {
    if (window.confirm('Are you sure you want to delete this payment? This will update the student\'s paid amount.')) {
      dispatch({ type: 'DELETE_PAYMENT', payload: { transactionId } });
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Student', 'Event', 'Payment Method', 'Amount'];
    const rows = filteredTransactions.map(t => {
      const student = state.students.find(s => s.id === t.studentId);
      const event = state.events.find(e => e.id === t.eventId);
      return [
        new Date(t.date).toLocaleDateString(),
        `"${student?.name || 'Unknown'}"`,
        `"${event?.name || 'Global Payment'}"`,
        t.paymentMethod || 'Cash',
        t.amount
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="mb-12 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-4xl font-display uppercase tracking-widest font-black">Transactions</h2>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-wider neo-shadow hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-action text-white p-6 neo-border neo-shadow-static flex items-center gap-4">
          <div className="p-4 bg-white neo-border rounded-full">
            <DollarSign className="w-8 h-8 text-action" />
          </div>
          <div>
            <p className="font-bold uppercase text-sm tracking-wider opacity-80">Total Collected</p>
            <p className="text-3xl font-black font-mono">RS {formatCurrency(totalCollected)}</p>
          </div>
        </div>
        <div className="bg-warning text-black p-6 neo-border neo-shadow-static flex items-center gap-4">
          <div className="p-4 bg-white neo-border rounded-full">
            <ReceiptText className="w-8 h-8 text-warning" />
          </div>
          <div>
            <p className="font-bold uppercase text-sm tracking-wider opacity-80">Transactions</p>
            <p className="text-3xl font-black font-mono">{filteredTransactions.length}</p>
          </div>
        </div>
        <div className="bg-info text-black p-6 neo-border neo-shadow-static flex items-center gap-4">
          <div className="p-4 bg-white neo-border rounded-full">
            <TrendingUp className="w-8 h-8 text-info" />
          </div>
          <div>
            <p className="font-bold uppercase text-sm tracking-wider opacity-80">Avg. Size</p>
            <p className="text-3xl font-black font-mono">RS {formatCurrency(avgTransaction)}</p>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-paper p-6 neo-border neo-shadow-static flex flex-col md:flex-row gap-4 items-center">
        <h3 className="text-xl font-display uppercase font-black flex items-center gap-2 whitespace-nowrap mr-4">
          <Filter className="w-6 h-6" /> Filters
        </h3>
        
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-black" />
          </div>
          <input
            type="text"
            placeholder="Search student or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white neo-border focus:outline-none focus:ring-0 font-bold"
          />
        </div>

        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CreditCard className="h-5 w-5 text-black" />
          </div>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="w-full pl-10 pr-8 py-3 bg-white neo-border font-bold uppercase text-sm cursor-pointer focus:outline-none appearance-none"
          >
            <option value="All">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="eSewa">eSewa</option>
            <option value="Khalti">Khalti</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-black" />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-10 pr-8 py-3 bg-white neo-border font-bold uppercase text-sm cursor-pointer focus:outline-none appearance-none"
          >
            <option value="All">All Time</option>
            <option value="7Days">Last 7 Days</option>
            <option value="30Days">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white neo-border neo-shadow-static overflow-x-auto">
        <table className="w-full text-left border-collapse block md:table">
          <thead className="hidden md:table-header-group">
            <tr className="bg-paper border-b-4 border-black">
              <th className="p-4 font-display text-xl uppercase tracking-wide">Date</th>
              <th className="p-4 font-display text-xl uppercase tracking-wide">Student</th>
              <th className="p-4 font-display text-xl uppercase tracking-wide">Event</th>
              <th className="p-4 font-display text-xl uppercase tracking-wide">Method</th>
              <th className="p-4 font-display text-xl uppercase tracking-wide">Amount</th>
              <th className="p-4 font-display text-xl uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {filteredTransactions.map((transaction, idx) => {
              const student = state.students.find(s => s.id === transaction.studentId);
              const event = state.events.find(e => e.id === transaction.eventId);
              
              const methodColors: Record<string, string> = {
                'Cash': 'bg-green-200 text-green-900',
                'Bank Transfer': 'bg-blue-200 text-blue-900',
                'eSewa': 'bg-emerald-200 text-emerald-900',
                'Khalti': 'bg-purple-200 text-purple-900',
                'Other': 'bg-gray-200 text-gray-900'
              };
              const badgeColor = methodColors[transaction.paymentMethod || 'Cash'] || methodColors['Other'];

              return (
                <tr key={transaction.id} className={`block md:table-row border-b-4 border-black last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-paper/50'} hover:bg-info/10 transition-colors`}>
                  <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex flex-col md:block gap-1">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Date</span>
                      <span className="font-mono text-lg font-bold break-words">{new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex flex-col md:block gap-1">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Student</span>
                      <span className="font-bold text-lg break-words">{student?.name || 'Unknown Student'}</span>
                    </div>
                  </td>
                  <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex flex-col md:block gap-1">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Event</span>
                      <span className="font-bold text-lg break-words">{event?.name || 'Global Payment'}</span>
                    </div>
                  </td>
                  <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex flex-col md:block gap-1">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Method</span>
                      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border-2 border-black w-fit ${badgeColor}`}>
                        {transaction.paymentMethod || 'Cash'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex flex-col md:block gap-1">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Amount</span>
                      <span className="font-mono text-lg text-green-600 font-black break-words">RS {formatCurrency(transaction.amount)}</span>
                    </div>
                  </td>
                  <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex flex-col md:block md:text-right gap-2 mt-2 md:mt-0">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Actions</span>
                      <div className="flex gap-2 flex-wrap md:justify-end">
                        <button
                          onClick={() => setSelectedReceipt({ transaction, student, event })}
                          className="p-2 bg-secondary text-black neo-border neo-shadow hover:bg-yellow-400 transition-colors cursor-pointer"
                          title="View Receipt"
                        >
                          <ReceiptText className="w-4 h-4" />
                        </button>
                        {role === 'admin' && (
                          <button
                            onClick={() => handleDeletePayment(transaction.id)}
                            className="p-2 bg-red-400 text-black neo-border neo-shadow hover:bg-red-500 transition-colors cursor-pointer"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredTransactions.length === 0 && (
              <tr className="block md:table-row">
                <td colSpan={6} className="p-12 text-center block md:table-cell">
                  <div className="flex flex-col items-center justify-center opacity-50">
                    <ReceiptText className="w-16 h-16 mb-4" />
                    <p className="font-display text-2xl uppercase tracking-widest font-black">No transactions found</p>
                    <p className="font-bold mt-2">Try adjusting your filters or search query.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div className="bg-white neo-border neo-shadow-static w-full max-w-md print:border-none print:shadow-none print:max-w-full">
            {/* Modal Header - Hidden when printing */}
            <div className="flex justify-between items-center p-4 border-b-4 border-black bg-paper print:hidden">
              <h3 className="font-display text-xl uppercase font-black tracking-widest flex items-center gap-2">
                <ReceiptText className="w-5 h-5" /> Receipt
              </h3>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Receipt Content */}
            <div className="p-8 space-y-6 print:p-0">
              <div className="text-center border-b-4 border-dashed border-gray-300 pb-6">
                <h2 className="text-3xl font-display uppercase font-black tracking-widest mb-2">Payment Receipt</h2>
                <p className="font-mono text-gray-500 font-bold">ID: {selectedReceipt.transaction.id.split('-')[0].toUpperCase()}</p>
                <p className="font-mono text-gray-500 font-bold">{new Date(selectedReceipt.transaction.date).toLocaleString()}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase text-gray-500 text-sm tracking-wider">Student</span>
                  <span className="font-black text-lg">{selectedReceipt.student?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase text-gray-500 text-sm tracking-wider">Event</span>
                  <span className="font-black text-lg">{selectedReceipt.event?.name || 'Global Payment'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase text-gray-500 text-sm tracking-wider">Payment Method</span>
                  <span className="font-black text-lg uppercase">{selectedReceipt.transaction.paymentMethod || 'Cash'}</span>
                </div>
              </div>

              <div className="border-t-4 border-black pt-6 flex justify-between items-center bg-paper -mx-8 px-8 pb-8 print:bg-transparent print:mx-0 print:px-0 print:pb-0">
                <span className="font-display text-xl uppercase font-black tracking-widest">Total Paid</span>
                <span className="font-mono text-3xl font-black">RS {formatCurrency(selectedReceipt.transaction.amount)}</span>
              </div>
            </div>

            {/* Modal Footer - Hidden when printing */}
            <div className="p-4 border-t-4 border-black bg-paper flex justify-end gap-4 print:hidden">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-6 py-2 bg-white text-black font-bold uppercase tracking-wider neo-border neo-shadow hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handlePrintReceipt}
                className="flex items-center gap-2 px-6 py-2 bg-action text-white font-bold uppercase tracking-wider neo-border neo-shadow hover:bg-action/80 transition-colors cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
