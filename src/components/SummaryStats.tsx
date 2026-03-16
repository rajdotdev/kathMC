import React from 'react';
import { useStore } from '../store/StoreContext';
import { formatCurrency } from '../utils/currency';

export const SummaryStats: React.FC<{ selectedEventId: string }> = ({ selectedEventId }) => {
  const { state } = useStore();
  
  let totalOwed = 0;
  let totalPaid = 0;

  state.students.forEach(s => {
    const bal = s.balances?.[selectedEventId];
    if (bal) {
      totalOwed += bal.owed;
      totalPaid += bal.paid;
    }
  });

  const remaining = Math.max(0, totalOwed - totalPaid);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
      <div className="bg-white neo-border neo-shadow-static p-6 flex flex-col justify-center items-center text-center border-b-8 border-b-red-500">
        <h3 className="font-sans font-bold uppercase tracking-widest text-sm text-gray-600 mb-2">Total Owed</h3>
        <p className="font-display text-4xl md:text-5xl text-red-600">RS {formatCurrency(totalOwed)}</p>
      </div>
      
      <div className="bg-white neo-border neo-shadow-static p-6 flex flex-col justify-center items-center text-center border-b-8 border-b-green-500">
        <h3 className="font-sans font-bold uppercase tracking-widest text-sm text-gray-600 mb-2">Total Paid</h3>
        <p className="font-display text-4xl md:text-5xl text-green-600">RS {formatCurrency(totalPaid)}</p>
      </div>
      
      <div className="bg-white neo-border neo-shadow-static p-6 flex flex-col justify-center items-center text-center border-b-8 border-b-action">
        <h3 className="font-sans font-bold uppercase tracking-widest text-sm text-gray-600 mb-2">Remaining</h3>
        <p className="font-display text-4xl md:text-5xl">RS {formatCurrency(remaining)}</p>
      </div>
    </div>
  );
};
