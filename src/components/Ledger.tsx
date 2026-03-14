import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore, Student } from '../store/StoreContext';
import { Modal } from './Modal';
import { Search, Filter, Plus, Trash2, CalendarPlus, CheckSquare, Undo2, MessageCircle, Mail, Bell } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export const Ledger: React.FC<{ selectedEventId: string; onSelectEvent: (id: string) => void; hideEventSelector?: boolean }> = ({ selectedEventId, onSelectEvent, hideEventSelector }) => {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [fullPayStudent, setFullPayStudent] = useState<Student | null>(null);
  const [reminderStudent, setReminderStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentToAdd, setStudentToAdd] = useState('');
  const [newStudentOwed, setNewStudentOwed] = useState('');

  const [isRemoveStudentOpen, setIsRemoveStudentOpen] = useState(false);
  const [selectedRemoveStudentIds, setSelectedRemoveStudentIds] = useState<string[]>([]);
  const [removeStudentSearch, setRemoveStudentSearch] = useState('');

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('');
  const [newEventAmount, setNewEventAmount] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);

  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState('');
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState('Cash');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkPaymentSearch, setBulkPaymentSearch] = useState('');

  // If the selected event was deleted, reset to ''
  useEffect(() => {
    if (selectedEventId !== '' && !state.events.find(e => e.id === selectedEventId)) {
      onSelectEvent('');
    }
  }, [selectedEventId, state.events, onSelectEvent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/'
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getStudentBalances = (student: Student) => {
    if (selectedEventId === '') {
      return { owed: 0, paid: 0 };
    }
    return student.balances?.[selectedEventId] || { owed: 0, paid: 0 };
  };

  const sortStudentsByRollNo = (a: Student, b: Student) => {
    if (!a.rollNo && !b.rollNo) return a.name.localeCompare(b.name);
    if (!a.rollNo) return 1;
    if (!b.rollNo) return -1;
    const numA = parseInt(a.rollNo, 10);
    const numB = parseInt(b.rollNo, 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
    return a.rollNo.localeCompare(b.rollNo);
  };

  const filteredStudents = useMemo(() => {
    return state.students.filter(s => {
      const searchLower = search.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchLower) || s.rollNo?.toLowerCase().includes(searchLower);
      const { owed, paid } = getStudentBalances(s);
      let matchesFilter = true;
      if (filterStatus === 'paid') matchesFilter = owed > 0 && paid >= owed;
      if (filterStatus === 'unpaid') matchesFilter = owed > paid;
      return matchesSearch && matchesFilter;
    }).sort(sortStudentsByRollNo);
  }, [state.students, search, filterStatus, selectedEventId]);

  const removableStudents = useMemo(() => {
    if (!isRemoveStudentOpen || selectedEventId === '') return [];
    return state.students.filter(s => {
      const inEvent = s.balances && s.balances[selectedEventId];
      const searchLower = removeStudentSearch.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchLower) || s.rollNo?.toLowerCase().includes(searchLower);
      return inEvent && matchesSearch;
    }).sort(sortStudentsByRollNo);
  }, [state.students, removeStudentSearch, selectedEventId, isRemoveStudentOpen]);

  const bulkPaymentStudents = useMemo(() => {
    if (!isBulkPaymentOpen) return [];
    return state.students.filter(s => {
      const { owed, paid } = getStudentBalances(s);
      const searchLower = bulkPaymentSearch.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchLower) || s.rollNo?.toLowerCase().includes(searchLower);
      return owed > paid && matchesSearch;
    }).sort(sortStudentsByRollNo);
  }, [state.students, bulkPaymentSearch, selectedEventId, isBulkPaymentOpen]);

  const handleQuickLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent && paymentAmount && selectedEventId !== '') {
      dispatch({ 
        type: 'ADD_PAYMENT', 
        payload: { 
          studentId: selectedStudent.id, 
          amount: parseFloat(paymentAmount),
          eventId: selectedEventId,
          paymentMethod
        } 
      });
      setSelectedStudent(null);
      setPaymentAmount('');
      setPaymentMethod('Cash');
    }
  };

  const handleBulkPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length > 0 && selectedEventId !== '') {
      const fixedAmount = bulkPaymentAmount ? parseFloat(bulkPaymentAmount) : null;
      
      selectedStudentIds.forEach(studentId => {
        const student = state.students.find(s => s.id === studentId);
        if (!student) return;
        
        const { owed, paid } = getStudentBalances(student);
        const remaining = owed - paid;
        
        const amountToPay = fixedAmount !== null ? Math.min(fixedAmount, remaining) : remaining;
        
        if (amountToPay > 0) {
          dispatch({
            type: 'ADD_PAYMENT',
            payload: {
              studentId,
              amount: amountToPay,
              eventId: selectedEventId,
              paymentMethod: bulkPaymentMethod
            }
          });
        }
      });
      setIsBulkPaymentOpen(false);
      setBulkPaymentAmount('');
      setBulkPaymentMethod('Cash');
      setSelectedStudentIds([]);
    }
  };

  const handleOpenAddStudent = () => {
    if (selectedEventId !== '') {
      const event = state.events.find(e => e.id === selectedEventId);
      if (event) {
        setNewStudentOwed(event.amountPerStudent.toString());
      }
    } else {
      setNewStudentOwed('');
    }
    setIsAddStudentOpen(true);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentToAdd && newStudentOwed && selectedEventId !== '') {
      dispatch({
        type: 'ADD_EXISTING_STUDENT_TO_EVENT',
        payload: { 
          studentId: studentToAdd, 
          amountOwed: parseFloat(newStudentOwed),
          eventId: selectedEventId
        }
      });
      setIsAddStudentOpen(false);
      setStudentToAdd('');
      setNewStudentOwed('');
    }
  };

  const handleRemoveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRemoveStudentIds.length > 0 && selectedEventId !== '') {
      selectedRemoveStudentIds.forEach(studentId => {
        dispatch({ type: 'REMOVE_STUDENT_FROM_EVENT', payload: { studentId, eventId: selectedEventId } });
      });
      setIsRemoveStudentOpen(false);
      setSelectedRemoveStudentIds([]);
      setRemoveStudentSearch('');
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEventName && newEventCategory && newEventAmount) {
      dispatch({
        type: 'ADD_EVENT',
        payload: {
          name: newEventName,
          categoryId: newEventCategory,
          date: new Date().toISOString(),
          amount: parseFloat(newEventAmount),
          applyToAll
        }
      });
      setNewEventName('');
      setNewEventAmount('');
      setIsAddEventOpen(false);
    }
  };

  const handleFullPay = (method: string) => {
    if (fullPayStudent) {
      const { owed, paid } = getStudentBalances(fullPayStudent);
      const remaining = owed - paid;
      if (remaining > 0) {
        dispatch({
          type: 'ADD_PAYMENT',
          payload: { 
            studentId: fullPayStudent.id, 
            amount: remaining,
            eventId: selectedEventId,
            paymentMethod: method
          }
        });
      }
      setFullPayStudent(null);
    }
  };

  return (
    <div className="mb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 print:hidden">
        <div className="flex w-full md:w-auto gap-4">
          {selectedEventId !== '' && (
            <>
              <div className="relative flex-1 md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-black" />
                </div>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white neo-border neo-shadow focus:outline-none focus:ring-0"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-black" />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'paid' | 'unpaid')}
                  className="w-full pl-10 pr-8 py-3 bg-white neo-border neo-shadow font-bold uppercase text-sm cursor-pointer focus:outline-none appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid Only</option>
                  <option value="unpaid">Unpaid Only</option>
                </select>
              </div>
            </>
          )}
        </div>
        
        <div className="flex flex-col lg:flex-row w-full lg:w-auto gap-3 lg:gap-4 ml-auto">
          {!hideEventSelector && (
            <select
              value={selectedEventId}
              onChange={(e) => {
                if (e.target.value === 'NEW_EVENT') {
                  setIsAddEventOpen(true);
                } else {
                  onSelectEvent(e.target.value);
                }
              }}
              className="w-full lg:w-auto px-4 py-3 bg-white neo-border neo-shadow font-bold uppercase text-sm cursor-pointer focus:outline-none"
            >
              <option value="" disabled>Select an Event</option>
              {state.events?.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
              <option value="NEW_EVENT">+ Create New Event</option>
            </select>
          )}

          {selectedEventId !== '' && (
            <div className="flex w-full lg:w-auto gap-3 lg:gap-4">
              <button
                onClick={() => setIsBulkPaymentOpen(true)}
                className="flex-1 lg:flex-none flex items-center justify-center px-2 sm:px-4 py-3 bg-action text-white neo-border neo-shadow font-bold uppercase text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                <CheckSquare className="h-4 w-4 mr-1 sm:mr-2" />
                Bulk Payment
              </button>
              <button
                onClick={handleOpenAddStudent}
                className="flex-1 lg:flex-none flex items-center justify-center px-2 sm:px-4 py-3 bg-info neo-border neo-shadow font-bold uppercase text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                Add Student
              </button>
              <button
                onClick={() => setIsRemoveStudentOpen(true)}
                className="flex-1 lg:flex-none flex items-center justify-center px-2 sm:px-4 py-3 bg-red-400 text-black neo-border neo-shadow font-bold uppercase text-xs sm:text-sm cursor-pointer hover:bg-red-500 whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
                Bulk Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedEventId === '' ? (
        <div className="p-12 bg-white neo-border neo-shadow text-center print:hidden">
          <h2 className="text-2xl font-black uppercase tracking-wider mb-2">Please choose an event</h2>
          <p className="text-gray-600">Select an event from the dropdown above to display the dashboard.</p>
        </div>
      ) : (
        <>
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold uppercase mb-2">
              {state.events.find(e => e.id === selectedEventId)?.name} Ledger
              {filterStatus === 'paid' ? ' - PAID STUDENTS' : filterStatus === 'unpaid' ? ' - UNPAID STUDENTS' : ''}
            </h1>
            <p className="text-sm text-gray-600">
              Printed on {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white neo-border neo-shadow-static overflow-x-auto">
            <table className="w-full text-left border-collapse block md:table">
          <thead className="hidden md:table-header-group">
            <tr className="bg-paper border-b-4 border-black">
              <th className="p-2 md:p-3 font-display text-base uppercase tracking-wide">Roll No</th>
              <th className="p-2 md:p-3 font-display text-base uppercase tracking-wide">Student</th>
              <th className="p-2 md:p-3 font-display text-base uppercase tracking-wide">Total</th>
              <th className="p-2 md:p-3 font-display text-base uppercase tracking-wide">Paid</th>
              <th className="p-2 md:p-3 font-display text-base uppercase tracking-wide">Remaining</th>
              <th className="p-2 md:p-3 font-display text-base uppercase tracking-wide text-center">Status</th>
              <th className="p-2 md:p-3 font-display text-base uppercase tracking-wide text-right print:hidden">Action</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {filteredStudents.map((student, idx) => {
              const { owed, paid } = getStudentBalances(student);
              const remaining = Math.max(0, owed - paid);
              const isPaid = owed > 0 && paid >= owed;
              const lastTransaction = state.transactions.find(t => t.studentId === student.id && (selectedEventId === 'all' ? t.eventId === undefined : t.eventId === selectedEventId));
              const currentPaymentMethod = lastTransaction?.paymentMethod || student.balances?.[selectedEventId]?.paymentMethod;
              const displayPaymentMethod = currentPaymentMethod === 'Bank Transfer' ? 'Bank' : currentPaymentMethod;
              
              return (
                <tr key={student.id} className={`block md:table-row border-b-4 border-black last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-paper/50'} hover:bg-info/10 transition-colors`}>
                  <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex justify-between items-center md:block">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Roll No</span>
                      <span className="font-mono text-sm md:text-base font-bold">{student.rollNo || '-'}</span>
                    </div>
                  </td>
                  <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex justify-between items-center md:block">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Student</span>
                      <span className="font-bold text-sm md:text-base">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex justify-between items-center md:block">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Total</span>
                      <span className="font-mono text-sm md:text-base font-bold">RS {formatCurrency(owed)}</span>
                    </div>
                  </td>
                  <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex justify-between items-center md:block">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Paid</span>
                      <span className="font-mono text-sm md:text-base text-green-600 font-bold">RS {formatCurrency(paid)}</span>
                    </div>
                  </td>
                  <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex justify-between items-center md:block">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Remaining</span>
                      <span className="font-mono text-sm md:text-base text-red-600 font-bold">RS {formatCurrency(remaining)}</span>
                    </div>
                  </td>
                  <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none text-center md:text-left">
                    <div className="flex justify-between items-center md:block">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Status</span>
                      {isPaid ? (
                        <div className="inline-flex flex-col items-center justify-center transform md:-rotate-2 bg-green-400 text-black border-2 border-black px-2 py-1 font-display uppercase tracking-widest text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <span>Paid</span>
                          {currentPaymentMethod && (
                            <span className="text-[9px] leading-none opacity-80 mt-0.5">{displayPaymentMethod}</span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-block bg-red-400 text-black border-2 border-black px-2 py-1 font-display uppercase tracking-widest text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          Unpaid
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2 md:p-3 block md:table-cell text-right print:hidden">
                    <div className="flex justify-end gap-2 w-full">
                      {(isPaid || owed === 0) ? (
                        lastTransaction ? (
                          <button
                            onClick={() => dispatch({ type: 'DELETE_PAYMENT', payload: { transactionId: lastTransaction.id } })}
                            className="flex-1 md:flex-none flex items-center justify-center px-3 py-2 neo-border font-bold uppercase text-[10px] bg-yellow-400 text-black neo-shadow cursor-pointer hover:bg-yellow-500"
                            title="Undo Last Payment"
                          >
                            <Undo2 className="w-3 h-3 mr-1" />
                            Undo
                          </button>
                        ) : (
                          <span className="text-gray-400 font-bold text-[10px] uppercase px-3 py-2">Settled</span>
                        )
                      ) : (
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setReminderStudent(student)}
                              className="p-2 neo-border neo-shadow transition-colors bg-yellow-100 text-yellow-700 cursor-pointer hover:bg-yellow-200"
                              title="Send Reminder"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex gap-2 flex-1 md:flex-none">
                            <button
                              onClick={() => setFullPayStudent(student)}
                              className="flex-1 md:flex-none px-3 py-2 neo-border font-bold uppercase text-[10px] bg-green-400 text-black neo-shadow cursor-pointer hover:bg-green-500"
                              title="Mark as Fully Paid"
                            >
                              Paid
                            </button>
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="flex-1 md:flex-none px-3 py-2 neo-border font-bold uppercase text-[10px] bg-action text-white neo-shadow cursor-pointer hover:bg-blue-600"
                              title="Log Partial Payment"
                            >
                              Log Pay
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr className="block md:table-row">
                <td colSpan={7} className="p-8 text-center font-bold text-lg text-gray-500 block md:table-cell">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
          {filteredStudents.length > 0 && (
            <tfoot className="bg-paper border-t-4 border-black block md:table-footer-group">
              <tr className="block md:table-row">
                <td className="p-2 md:p-3 block md:table-cell font-display text-base uppercase tracking-wide md:text-right border-b-2 border-dashed border-gray-200 md:border-none" colSpan={2}>
                  <div className="flex justify-between md:block">
                    <span className="md:hidden font-bold uppercase text-xs text-gray-500">Summary</span>
                    <span>Total:</span>
                  </div>
                </td>
                <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                  <div className="flex justify-between items-center md:block">
                    <span className="md:hidden font-bold uppercase text-xs text-gray-500">Total Owed</span>
                    <span className="font-mono text-base font-bold">RS {formatCurrency(filteredStudents.reduce((sum, s) => sum + getStudentBalances(s).owed, 0))}</span>
                  </div>
                </td>
                <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                  <div className="flex justify-between items-center md:block">
                    <span className="md:hidden font-bold uppercase text-xs text-gray-500">Total Paid</span>
                    <span className="font-mono text-base text-green-600 font-bold">RS {formatCurrency(filteredStudents.reduce((sum, s) => sum + getStudentBalances(s).paid, 0))}</span>
                  </div>
                </td>
                <td className="p-2 md:p-3 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                  <div className="flex justify-between items-center md:block">
                    <span className="md:hidden font-bold uppercase text-xs text-gray-500">Total Remaining</span>
                    <span className="font-mono text-base text-red-600 font-bold">RS {formatCurrency(filteredStudents.reduce((sum, s) => {
                      const { owed, paid } = getStudentBalances(s);
                      return sum + Math.max(0, owed - paid);
                    }, 0))}</span>
                  </div>
                </td>
                <td className="hidden md:table-cell print:hidden" colSpan={2}></td>
                <td className="hidden print:table-cell"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </>
      )}

      {/* Full Pay Modal */}
      <Modal isOpen={!!fullPayStudent} onClose={() => setFullPayStudent(null)} title="Select Payment Method">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['Cash', 'Bank Transfer', 'eSewa', 'Khalti', 'Other'].map(method => (
            <button
              key={method}
              onClick={() => handleFullPay(method)}
              className="p-4 neo-border neo-shadow font-bold uppercase hover:bg-action hover:text-white transition-colors cursor-pointer"
            >
              {method}
            </button>
          ))}
        </div>
      </Modal>

      {/* Quick Log Modal */}
      <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Quick Log Payment">
        {selectedStudent && (
          <form onSubmit={handleQuickLog} className="flex flex-col gap-4">
            <div>
              <p className="font-bold mb-2">Student: <span className="text-action">{selectedStudent.name}</span></p>
              <p className="font-bold mb-4">Remaining Balance: <span className="font-mono">RS {formatCurrency(getStudentBalances(selectedStudent).owed - getStudentBalances(selectedStudent).paid)}</span></p>
            </div>
            <div>
              <label className="block font-bold uppercase text-sm mb-2">Payment Amount (RS)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={getStudentBalances(selectedStudent).owed - getStudentBalances(selectedStudent).paid}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-sm mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="eSewa">eSewa</option>
                <option value="Khalti">Khalti</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3 bg-action text-white neo-border neo-shadow font-bold uppercase tracking-wider mt-2 cursor-pointer">
              Submit Payment
            </button>
          </form>
        )}
      </Modal>

      {/* Bulk Payment Modal */}
      <Modal isOpen={isBulkPaymentOpen} onClose={() => {
        setIsBulkPaymentOpen(false);
        setSelectedStudentIds([]);
        setBulkPaymentAmount('');
        setBulkPaymentSearch('');
      }} title="Bulk Payment">
        <form onSubmit={handleBulkPayment} className="flex flex-col gap-4 max-h-[80vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase text-sm mb-2">Payment Amount (RS)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={bulkPaymentAmount}
                onChange={(e) => setBulkPaymentAmount(e.target.value)}
                className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
                placeholder="Leave empty to pay full remaining balance"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-sm mb-2">Payment Method</label>
              <select
                value={bulkPaymentMethod}
                onChange={(e) => setBulkPaymentMethod(e.target.value)}
                className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="eSewa">eSewa</option>
                <option value="Khalti">Khalti</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2">
              <label className="block font-bold uppercase text-sm">Select Students</label>
              <button
                type="button"
                onClick={() => {
                  if (selectedStudentIds.length === bulkPaymentStudents.length && bulkPaymentStudents.length > 0) {
                    setSelectedStudentIds([]);
                  } else {
                    setSelectedStudentIds(bulkPaymentStudents.map(s => s.id));
                  }
                }}
                className="text-xs font-bold uppercase text-action hover:underline cursor-pointer"
              >
                {selectedStudentIds.length > 0 ? 'Deselect All' : 'Select All Filtered'}
              </button>
            </div>
            <div className="mb-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or roll no..."
                value={bulkPaymentSearch}
                onChange={(e) => setBulkPaymentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white neo-border focus:outline-none focus:ring-0 text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 neo-border p-2 flex flex-col gap-2 min-h-[200px]">
              {bulkPaymentStudents.map(s => {
                  const { owed, paid } = getStudentBalances(s);
                  const remaining = owed - paid;
                  return (
                    <label key={s.id} className="flex items-center justify-between p-2 hover:bg-white cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds([...selectedStudentIds, s.id]);
                            } else {
                              setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                            }
                          }}
                          className="w-4 h-4 neo-border"
                        />
                        <span className="font-bold">{s.name} {s.rollNo ? `(${s.rollNo})` : ''}</span>
                      </div>
                      <span className="font-mono text-sm text-red-600 font-bold">RS {formatCurrency(remaining)}</span>
                    </label>
                  );
                })}
              {bulkPaymentStudents.length === 0 && (
                <div className="text-center text-gray-500 font-bold py-4">No students found.</div>
              )}
            </div>
          </div>
          <button 
            type="submit" 
            disabled={selectedStudentIds.length === 0}
            className={`w-full py-3 neo-border font-bold uppercase tracking-wider mt-2 shrink-0 ${selectedStudentIds.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-action text-white neo-shadow cursor-pointer'}`}
          >
            Apply Payment ({selectedStudentIds.length})
          </button>
        </form>
      </Modal>

      {/* Add Student Modal */}
      <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title="Add Student to Event">
        <form onSubmit={handleAddStudent} className="flex flex-col gap-4">
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Select Student</label>
            <select
              required
              value={studentToAdd}
              onChange={(e) => setStudentToAdd(e.target.value)}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
            >
              <option value="" disabled>Select a student</option>
              {state.students
                .filter(s => selectedEventId === '' ? true : !(s.balances && s.balances[selectedEventId]))
                .sort(sortStudentsByRollNo)
                .map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.rollNo ? `(${s.rollNo})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Amount Owed (RS)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={newStudentOwed}
              onChange={(e) => setNewStudentOwed(e.target.value)}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              placeholder="0.00"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-info text-black neo-border neo-shadow font-bold uppercase tracking-wider mt-2 cursor-pointer">
            Add Student
          </button>
        </form>
      </Modal>

      {/* Remove Student Modal */}
      <Modal isOpen={isRemoveStudentOpen} onClose={() => {
        setIsRemoveStudentOpen(false);
        setSelectedRemoveStudentIds([]);
        setRemoveStudentSearch('');
      }} title="Bulk Remove Students">
        <form onSubmit={handleRemoveStudent} className="flex flex-col gap-4 max-h-[80vh]">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2">
              <label className="block font-bold uppercase text-sm">Select Students to Remove</label>
              <button
                type="button"
                onClick={() => {
                  if (selectedRemoveStudentIds.length === removableStudents.length && removableStudents.length > 0) {
                    setSelectedRemoveStudentIds([]);
                  } else {
                    setSelectedRemoveStudentIds(removableStudents.map(s => s.id));
                  }
                }}
                className="text-xs font-bold uppercase text-red-600 hover:underline cursor-pointer"
              >
                {selectedRemoveStudentIds.length > 0 ? 'Deselect All' : 'Select All Filtered'}
              </button>
            </div>
            <div className="mb-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or roll no..."
                value={removeStudentSearch}
                onChange={(e) => setRemoveStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white neo-border focus:outline-none focus:ring-0 text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 neo-border p-2 flex flex-col gap-2 min-h-[200px]">
              {removableStudents.map(s => (
                <label key={s.id} className="flex items-center justify-between p-2 hover:bg-white cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRemoveStudentIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRemoveStudentIds([...selectedRemoveStudentIds, s.id]);
                        } else {
                          setSelectedRemoveStudentIds(selectedRemoveStudentIds.filter(id => id !== s.id));
                        }
                      }}
                      className="w-4 h-4 neo-border accent-red-500"
                    />
                    <span className="font-bold">{s.name} {s.rollNo ? `(${s.rollNo})` : ''}</span>
                  </div>
                </label>
              ))}
              {removableStudents.length === 0 && (
                <div className="text-center text-gray-500 font-bold py-4">No students found in this event.</div>
              )}
            </div>
          </div>
          <button 
            type="submit" 
            disabled={selectedRemoveStudentIds.length === 0}
            className={`w-full py-3 neo-border font-bold uppercase tracking-wider mt-2 shrink-0 ${selectedRemoveStudentIds.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 text-white neo-shadow cursor-pointer hover:bg-red-600'}`}
          >
            Remove Students ({selectedRemoveStudentIds.length})
          </button>
        </form>
      </Modal>

      {/* Add Event Modal */}
      <Modal isOpen={isAddEventOpen} onClose={() => setIsAddEventOpen(false)} title="New Event">
        <form onSubmit={handleAddEvent} className="flex flex-col gap-4">
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Event Name</label>
            <input
              type="text"
              required
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              placeholder="e.g. Science Museum Visit"
            />
          </div>
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Category</label>
            <select
              required
              value={newEventCategory}
              onChange={(e) => setNewEventCategory(e.target.value)}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
            >
              <option value="" disabled>Select a category</option>
              {state.categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Amount Per Student (RS)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={newEventAmount}
              onChange={(e) => setNewEventAmount(e.target.value)}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              placeholder="0.00"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="w-5 h-5 neo-border"
            />
            <span className="font-bold text-sm">Add this amount to all students' owed balance</span>
          </label>
          <button type="submit" className="w-full py-3 bg-action text-white neo-border neo-shadow font-bold uppercase tracking-wider mt-2 cursor-pointer">
            Create Event
          </button>
        </form>
      </Modal>

      {/* Reminder Options Modal */}
      <Modal isOpen={!!reminderStudent} onClose={() => setReminderStudent(null)} title="Send Reminder">
        {reminderStudent && (
          <div className="flex flex-col gap-4">
            <p className="font-bold mb-2">Choose reminder method for <span className="text-action">{reminderStudent.name}</span>:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  const remaining = getStudentBalances(reminderStudent).owed - getStudentBalances(reminderStudent).paid;
                  if (reminderStudent.phone && reminderStudent.phone.trim() !== '' && reminderStudent.phone !== '-') {
                    window.open(`https://wa.me/${reminderStudent.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${reminderStudent.name}, this is a reminder that you have a pending balance of RS ${formatCurrency(remaining)} for ${selectedEventId === 'all' ? 'your overall dues' : state.events.find(e => e.id === selectedEventId)?.name}. Please pay at your earliest convenience. Thank you!`)}`, '_blank', 'noopener,noreferrer');
                    setReminderStudent(null);
                  } else {
                    alert('Please add a phone number for this student first.');
                  }
                }}
                className={`flex items-center justify-center gap-2 p-4 neo-border neo-shadow font-bold uppercase transition-colors ${(!reminderStudent.phone || reminderStudent.phone.trim() === '' || reminderStudent.phone === '-') ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'}`}
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
              <button
                onClick={() => {
                  const remaining = getStudentBalances(reminderStudent).owed - getStudentBalances(reminderStudent).paid;
                  if (reminderStudent.email && reminderStudent.email.trim() !== '' && reminderStudent.email !== '-') {
                    window.location.href = `mailto:${reminderStudent.email}?subject=Payment Reminder&body=${encodeURIComponent(`Hi ${reminderStudent.name},\n\nThis is a reminder that you have a pending balance of RS ${formatCurrency(remaining)} for ${selectedEventId === 'all' ? 'your overall dues' : state.events.find(e => e.id === selectedEventId)?.name}.\n\nPlease pay at your earliest convenience.\n\nThank you!`)}`;
                    setReminderStudent(null);
                  } else {
                    alert('Please add an email address for this student first.');
                  }
                }}
                className={`flex items-center justify-center gap-2 p-4 neo-border neo-shadow font-bold uppercase transition-colors ${(!reminderStudent.email || reminderStudent.email.trim() === '' || reminderStudent.email === '-') ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200'}`}
              >
                <Mail className="w-5 h-5" />
                Email
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
