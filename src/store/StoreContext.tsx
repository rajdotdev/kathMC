import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { supabase } from '../lib/supabase';
import { enqueueAction, getQueuedActions, removeQueuedAction } from '../lib/offlineQueue';

export type Transaction = {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  eventId?: string;
  paymentMethod?: string;
};

export type Student = {
  id: string;
  rollNo?: string;
  name: string;
  phone?: string;
  email?: string;
  amountOwed: number;
  amountPaid: number;
  balances?: Record<string, { owed: number; paid: number; paymentMethod?: string }>;
};

export type EventCategory = {
  id: string;
  name: string;
};

export type EventRecord = {
  id: string;
  name: string;
  categoryId: string;
  date: string;
  status: 'active' | 'past';
  amountPerStudent: number;
};

export type State = {
  students: Student[];
  transactions: Transaction[];
  totalGoal: number;
  categories: EventCategory[];
  events: EventRecord[];
};

export type Action =
  | { type: 'ADD_PAYMENT'; payload: { id?: string; date?: string; studentId: string; amount: number; eventId?: string; paymentMethod?: string } }
  | { type: 'SET_GOAL'; payload: number }
  | { type: 'GLOBAL_RESET' }
  | { type: 'ADD_STUDENT'; payload: { id?: string; name: string; rollNo?: string; phone?: string; email?: string; amountOwed: number; eventId?: string } }
  | { type: 'UPDATE_STUDENT'; payload: { id: string; name: string; rollNo?: string; phone?: string; email?: string } }
  | { type: 'REMOVE_STUDENT'; payload: { studentId: string } }
  | { type: 'ADD_EXISTING_STUDENT_TO_EVENT'; payload: { studentId: string; amountOwed: number; eventId?: string } }
  | { type: 'REMOVE_STUDENT_FROM_EVENT'; payload: { studentId: string; eventId: string } }
  | { type: 'CLEAR_STUDENT_BALANCES'; payload: { studentId: string } }
  | { type: 'IMPORT_STUDENTS'; payload: { id?: string; name: string; rollNo?: string; phone?: string; email?: string }[] }
  | { type: 'ADD_CATEGORY'; payload: { id?: string; name: string } }
  | { type: 'EDIT_CATEGORY'; payload: { id: string; name: string } }
  | { type: 'DELETE_CATEGORY'; payload: { id: string } }
  | { type: 'ADD_EVENT'; payload: { id?: string; name: string; categoryId: string; date: string; amount: number; applyToAll: boolean } }
  | { type: 'TOGGLE_EVENT_STATUS'; payload: { eventId: string } }
  | { type: 'DELETE_EVENT'; payload: { eventId: string } }
  | { type: 'DELETE_PAYMENT'; payload: { transactionId: string } }
  | { type: 'LOAD_STATE'; payload: State };

type InternalAction = Action | { type: '_INTERNAL_SYNC'; payload: State };

const initialState: State = {
  students: [],
  transactions: [],
  totalGoal: 0,
  categories: [],
  events: []
};

function reducer(state: State, action: InternalAction): State {
  switch (action.type) {
    case 'ADD_PAYMENT': {
      const { id, date, studentId, amount, eventId, paymentMethod } = action.payload;
      const newTransaction: Transaction = {
        id: id || crypto.randomUUID(),
        studentId,
        amount,
        date: date || new Date().toISOString(),
        eventId,
        paymentMethod: paymentMethod || 'Cash',
      };
      return {
        ...state,
        students: state.students.map((s) => {
          if (s.id === studentId) {
            const newBalances = { ...(s.balances || {}) };
            if (eventId && eventId !== 'all') {
              if (!newBalances[eventId]) newBalances[eventId] = { owed: 0, paid: 0 };
              newBalances[eventId] = {
                ...newBalances[eventId],
                paid: newBalances[eventId].paid + amount
              };
            }
            return { ...s, amountPaid: s.amountPaid + amount, balances: newBalances };
          }
          return s;
        }),
        transactions: [newTransaction, ...state.transactions],
      };
    }
    case 'SET_GOAL':
      return { ...state, totalGoal: action.payload };
    case 'GLOBAL_RESET':
      return {
        ...state,
        students: state.students.map((s) => {
          const newBalances = { ...(s.balances || {}) };
          Object.keys(newBalances).forEach(eventId => {
            newBalances[eventId] = { ...newBalances[eventId], paid: 0 };
          });
          return { ...s, amountPaid: 0, balances: newBalances };
        }),
        transactions: [],
      };
    case 'ADD_STUDENT': {
      const { id, name, rollNo, phone, email, amountOwed, eventId } = action.payload;
      const balances = eventId && eventId !== 'all' ? { [eventId]: { owed: amountOwed, paid: 0 } } : {};
      const newStudent: Student = {
        id: id || crypto.randomUUID(),
        name,
        rollNo,
        phone,
        email,
        amountOwed: eventId && eventId !== 'all' ? amountOwed : amountOwed, // if eventId is set, amountOwed is the event balance, which is also the global amountOwed for a new student
        amountPaid: 0,
        balances,
      };
      return { ...state, students: [...state.students, newStudent] };
    }
    case 'UPDATE_STUDENT': {
      const { id, name, rollNo, phone, email } = action.payload;
      return {
        ...state,
        students: state.students.map(s => s.id === id ? { ...s, name, rollNo, phone, email } : s)
      };
    }
    case 'REMOVE_STUDENT': {
      return {
        ...state,
        students: state.students.filter(s => s.id !== action.payload.studentId),
        transactions: state.transactions.filter(t => t.studentId !== action.payload.studentId)
      };
    }
    case 'ADD_EXISTING_STUDENT_TO_EVENT': {
      const { studentId, amountOwed, eventId } = action.payload;
      return {
        ...state,
        students: state.students.map(s => {
          if (s.id === studentId) {
            const newBalances = { ...(s.balances || {}) };
            if (eventId && eventId !== 'all') {
              newBalances[eventId] = { owed: amountOwed, paid: 0 };
            }
            return {
              ...s,
              amountOwed: s.amountOwed + amountOwed,
              balances: newBalances
            };
          }
          return s;
        })
      };
    }
    case 'REMOVE_STUDENT_FROM_EVENT': {
      const { studentId, eventId } = action.payload;
      return {
        ...state,
        transactions: state.transactions.filter(t => !(t.studentId === studentId && t.eventId === eventId)),
        students: state.students.map(s => {
          if (s.id === studentId && s.balances && s.balances[eventId]) {
            const eventBalance = s.balances[eventId];
            const newBalances = { ...s.balances };
            delete newBalances[eventId];
            return {
              ...s,
              amountOwed: Math.max(0, s.amountOwed - eventBalance.owed),
              amountPaid: Math.max(0, s.amountPaid - eventBalance.paid),
              balances: newBalances
            };
          }
          return s;
        })
      };
    }
    case 'CLEAR_STUDENT_BALANCES': {
      const { studentId } = action.payload;
      return {
        ...state,
        transactions: state.transactions.filter(t => t.studentId !== studentId),
        students: state.students.map(s => {
          if (s.id === studentId) {
            return {
              ...s,
              amountOwed: 0,
              amountPaid: 0,
              balances: {}
            };
          }
          return s;
        })
      };
    }
    case 'IMPORT_STUDENTS': {
      const existingStudents = [...state.students];
      const newStudentsList: Student[] = [];
      
      action.payload.forEach(s => {
        // Try to find existing student by rollNo if provided
        const existingIndex = s.rollNo ? existingStudents.findIndex(ex => ex.rollNo === s.rollNo) : -1;
        
        if (existingIndex >= 0) {
          // Update existing student
          const ex = existingStudents[existingIndex];
          existingStudents[existingIndex] = {
            ...ex,
            name: s.name || ex.name, // Keep existing name if not provided
            phone: s.phone || ex.phone,
            email: s.email || ex.email
          };
        } else {
          // Create new student
          newStudentsList.push({
            id: s.id || crypto.randomUUID(),
            name: s.name,
            rollNo: s.rollNo,
            phone: s.phone,
            email: s.email,
            amountOwed: 0,
            amountPaid: 0,
            balances: {}
          });
        }
      });
      
      return { ...state, students: [...existingStudents, ...newStudentsList] };
    }
    case 'ADD_CATEGORY': {
      const newCategory: EventCategory = {
        id: action.payload.id || crypto.randomUUID(),
        name: action.payload.name,
      };
      return { ...state, categories: [...(state.categories || []), newCategory] };
    }
    case 'EDIT_CATEGORY': {
      return {
        ...state,
        categories: state.categories.map(c => c.id === action.payload.id ? { ...c, name: action.payload.name } : c)
      };
    }
    case 'DELETE_CATEGORY': {
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload.id)
      };
    }
    case 'ADD_EVENT': {
      const newEvent: EventRecord = {
        id: action.payload.id || crypto.randomUUID(),
        name: action.payload.name,
        categoryId: action.payload.categoryId,
        date: action.payload.date,
        status: 'active',
        amountPerStudent: action.payload.amount,
      };
      
      let updatedStudents = state.students;
      if (action.payload.applyToAll && action.payload.amount > 0) {
        updatedStudents = state.students.map(s => {
          const newBalances = { ...(s.balances || {}) };
          newBalances[newEvent.id] = { owed: action.payload.amount, paid: 0 };
          return {
            ...s,
            amountOwed: s.amountOwed + action.payload.amount,
            balances: newBalances
          };
        });
      }

      return { 
        ...state, 
        events: [...(state.events || []), newEvent],
        students: updatedStudents
      };
    }
    case 'TOGGLE_EVENT_STATUS': {
      return {
        ...state,
        events: state.events.map(e => 
          e.id === action.payload.eventId 
            ? { ...e, status: e.status === 'active' ? 'past' : 'active' } 
            : e
        )
      };
    }
    case 'DELETE_EVENT': {
      const eventId = action.payload.eventId;
      return {
        ...state,
        events: state.events.filter(e => e.id !== eventId),
        transactions: state.transactions.filter(t => t.eventId !== eventId),
        students: state.students.map(s => {
          if (s.balances && s.balances[eventId]) {
            const eventBalance = s.balances[eventId];
            const newBalances = { ...s.balances };
            delete newBalances[eventId];
            return {
              ...s,
              amountOwed: Math.max(0, s.amountOwed - eventBalance.owed),
              amountPaid: Math.max(0, s.amountPaid - eventBalance.paid),
              balances: newBalances
            };
          }
          return s;
        })
      };
    }
    case 'DELETE_PAYMENT': {
      const transaction = state.transactions.find(t => t.id === action.payload.transactionId);
      if (!transaction) return state;
      
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload.transactionId),
        students: state.students.map(s => {
          if (s.id === transaction.studentId) {
            const newBalances = { ...(s.balances || {}) };
            if (transaction.eventId && newBalances[transaction.eventId]) {
              newBalances[transaction.eventId] = {
                ...newBalances[transaction.eventId],
                paid: Math.max(0, newBalances[transaction.eventId].paid - transaction.amount)
              };
            }
            return {
              ...s,
              amountPaid: Math.max(0, s.amountPaid - transaction.amount),
              balances: newBalances
            };
          }
          return s;
        })
      };
    }
    case 'LOAD_STATE':
    case '_INTERNAL_SYNC':
      return {
        ...initialState,
        ...action.payload,
        categories: action.payload.categories || initialState.categories,
        events: action.payload.events || initialState.events
      };
    default:
      return state;
  }
}

const StoreContext = createContext<{
  state: State;
  dispatch: (action: Action, isSyncingQueue?: boolean) => Promise<void>;
} | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatchInternal] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncQueue = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const actions = await getQueuedActions();
      if (actions.length > 0) {
        console.log(`Syncing ${actions.length} offline actions...`);
        for (const action of actions) {
          try {
            // Re-dispatch the action to run DB ops
            await dispatch(action as any, true);
            await removeQueuedAction(action.id);
          } catch (err) {
            console.error('Failed to sync action:', action, err);
          }
        }
        console.log('Sync complete.');
        loadData();
      }
    } catch (err) {
      console.error('Error syncing offline queue:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    window.addEventListener('online', syncQueue);
    return () => window.removeEventListener('online', syncQueue);
  }, []);

  const loadData = async () => {
    try {
      const [
        { data: students },
        { data: transactions },
        { data: categories },
        { data: events },
        { data: settings }
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('categories').select('*'),
        supabase.from('events').select('*'),
        supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
      ]);

      const mappedEvents = (events || []).map(e => ({
        id: e.id,
        name: e.name,
        categoryId: e.category_id,
        date: e.date,
        status: e.status,
        amountPerStudent: Number(e.amount_per_student)
      }));

      const validEventIds = new Set(mappedEvents.map(e => e.id));

      const mappedTransactions = (transactions || [])
        .filter(t => !t.event_id || validEventIds.has(t.event_id))
        .map(t => {
          // If a transaction has an orphaned event_id, delete it from the DB asynchronously
          if (t.event_id && !validEventIds.has(t.event_id)) {
            supabase.from('transactions').delete().eq('id', t.id).then();
          }
          return {
            id: t.id,
            studentId: t.student_id,
            amount: Number(t.amount),
            date: t.date,
            eventId: t.event_id || undefined,
            paymentMethod: t.payment_method || undefined
          };
        });

      // Calculate actual paid amounts from transactions
      const studentPayments: Record<string, { total: number, byEvent: Record<string, number> }> = {};
      mappedTransactions.forEach(t => {
        if (!studentPayments[t.studentId]) {
          studentPayments[t.studentId] = { total: 0, byEvent: {} };
        }
        studentPayments[t.studentId].total += t.amount;
        if (t.eventId) {
          studentPayments[t.studentId].byEvent[t.eventId] = (studentPayments[t.studentId].byEvent[t.eventId] || 0) + t.amount;
        }
      });

      const mappedStudents = (students || []).map(s => {
        const balances = { ...(s.balances || {}) };
        let cleanedOwed = Number(s.amount_owed);
        let needsCleanup = false;

        // Clean up balances for deleted events
        Object.keys(balances).forEach(eventId => {
          if (!validEventIds.has(eventId)) {
            cleanedOwed -= balances[eventId].owed;
            delete balances[eventId];
            needsCleanup = true;
          }
        });

        // Sync paid amounts with actual transactions
        const actualPayments = studentPayments[s.id] || { total: 0, byEvent: {} };
        const actualTotalPaid = actualPayments.total;
        
        if (Number(s.amount_paid) !== actualTotalPaid) {
          needsCleanup = true;
        }

        Object.keys(balances).forEach(eventId => {
          const actualEventPaid = actualPayments.byEvent[eventId] || 0;
          if (balances[eventId].paid !== actualEventPaid) {
            balances[eventId].paid = actualEventPaid;
            needsCleanup = true;
          }
        });

        if (needsCleanup) {
          // Asynchronously fix the data in Supabase so it's clean for next time
          supabase.from('students').update({
            amount_owed: Math.max(0, cleanedOwed),
            amount_paid: actualTotalPaid,
            balances
          }).eq('id', s.id).then();
        }

        return {
          id: s.id,
          name: s.name,
          rollNo: s.roll_no,
          phone: s.phone,
          email: s.email,
          amountOwed: Math.max(0, cleanedOwed),
          amountPaid: actualTotalPaid,
          balances
        };
      });

      const mappedCategories = (categories || []).map(c => ({
        id: c.id,
        name: c.name
      }));

      dispatchInternal({
        type: 'LOAD_STATE',
        payload: {
          students: mappedStudents,
          transactions: mappedTransactions,
          categories: mappedCategories,
          events: mappedEvents,
          totalGoal: settings ? Number(settings.total_goal) : 0
        }
      });
    } catch (err) {
      console.error('Failed to load state from Supabase', err);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadData().then(() => {
      if (navigator.onLine) {
        syncQueue();
      }
    });
  }, []);

  const dispatch = async (action: Action, isSyncingQueue = false) => {
    try {
      // Pre-process action to inject IDs so optimistic update matches DB
      let processedAction = action;
      
      switch (action.type) {
        case 'ADD_PAYMENT':
          processedAction = { ...action, payload: { ...action.payload, id: crypto.randomUUID(), date: new Date().toISOString() } };
          break;
        case 'ADD_STUDENT':
          processedAction = { ...action, payload: { ...action.payload, id: crypto.randomUUID() } };
          break;
        case 'ADD_CATEGORY':
          processedAction = { ...action, payload: { ...action.payload, id: crypto.randomUUID() } };
          break;
        case 'ADD_EVENT':
          processedAction = { ...action, payload: { ...action.payload, id: crypto.randomUUID() } };
          break;
        case 'IMPORT_STUDENTS':
          processedAction = { ...action, payload: action.payload.map(s => ({ ...s, id: crypto.randomUUID() })) };
          break;
      }

      // Optimistic update (only if not syncing from queue, as it was already applied optimistically when offline)
      if (!isSyncingQueue) {
        dispatchInternal(processedAction);
      }

      if (!navigator.onLine) {
        console.log('Offline: queueing action', processedAction.type);
        await enqueueAction({
          type: processedAction.type,
          payload: 'payload' in processedAction ? processedAction.payload : undefined
        });
        return;
      }

      const runDbOps = async () => {
        switch (processedAction.type) {
          case 'ADD_PAYMENT': {
            const { id, date, studentId, amount, eventId, paymentMethod } = processedAction.payload;
            const { error } = await supabase.from('transactions').insert({
              id,
              student_id: studentId,
              amount: amount,
              date,
              event_id: eventId === 'all' ? null : eventId,
              payment_method: paymentMethod || 'Cash'
            });
            
            if (error) {
              // Fallback if payment_method column doesn't exist
              await supabase.from('transactions').insert({
                id,
                student_id: studentId,
                amount: amount,
                date,
                event_id: eventId === 'all' ? null : eventId
              });
            }
            
            const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single();
            if (student) {
              const newAmountPaid = Number(student.amount_paid) + amount;
              const newBalances = { ...(student.balances || {}) };
              if (eventId && eventId !== 'all') {
                if (!newBalances[eventId]) newBalances[eventId] = { owed: 0, paid: 0 };
                newBalances[eventId].paid += amount;
                newBalances[eventId].paymentMethod = paymentMethod || 'Cash';
              }
              await supabase.from('students').update({
                amount_paid: newAmountPaid,
                balances: newBalances
              }).eq('id', student.id);
            }
            break;
          }
          case 'SET_GOAL': {
            await supabase.from('app_settings').upsert({ id: 1, total_goal: processedAction.payload });
            break;
          }
          case 'GLOBAL_RESET': {
            await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            const { data: students } = await supabase.from('students').select('*');
            const updates = (students || []).map(s => {
              const newBalances = { ...(s.balances || {}) };
              Object.keys(newBalances).forEach(eventId => {
                newBalances[eventId] = { ...newBalances[eventId], paid: 0 };
              });
              return {
                id: s.id,
                name: s.name,
                roll_no: s.roll_no,
                amount_owed: s.amount_owed,
                amount_paid: 0,
                balances: newBalances
              };
            });
            for (let i = 0; i < updates.length; i += 100) {
              await supabase.from('students').upsert(updates.slice(i, i + 100));
            }
            break;
          }
          case 'ADD_STUDENT': {
            const { id, name, rollNo, phone, email, amountOwed, eventId } = processedAction.payload;
            const balances = eventId && eventId !== 'all' ? { [eventId]: { owed: amountOwed, paid: 0 } } : {};
            await supabase.from('students').insert({
              id,
              name,
              roll_no: rollNo,
              phone,
              email,
              amount_owed: amountOwed,
              amount_paid: 0,
              balances
            });
            break;
          }
          case 'UPDATE_STUDENT': {
            const { id, name, rollNo, phone, email } = processedAction.payload;
            await supabase.from('students').update({
              name,
              roll_no: rollNo,
              phone,
              email
            }).eq('id', id);
            break;
          }
          case 'REMOVE_STUDENT': {
            await supabase.from('students').delete().eq('id', processedAction.payload.studentId);
            break;
          }
          case 'ADD_EXISTING_STUDENT_TO_EVENT': {
            const { studentId, amountOwed, eventId } = processedAction.payload;
            const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single();
            if (student) {
              const newBalances = { ...(student.balances || {}) };
              if (eventId && eventId !== 'all') {
                newBalances[eventId] = { owed: amountOwed, paid: 0 };
              }
              await supabase.from('students').update({
                amount_owed: Number(student.amount_owed) + amountOwed,
                balances: newBalances
              }).eq('id', studentId);
            }
            break;
          }
          case 'REMOVE_STUDENT_FROM_EVENT': {
            const { studentId, eventId } = processedAction.payload;
            await supabase.from('transactions').delete().match({ student_id: studentId, event_id: eventId });
            
            const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single();
            if (student && student.balances && student.balances[eventId]) {
              const eventBalance = student.balances[eventId];
              const newBalances = { ...student.balances };
              delete newBalances[eventId];
              
              await supabase.from('students').update({
                amount_owed: Math.max(0, Number(student.amount_owed) - eventBalance.owed),
                amount_paid: Math.max(0, Number(student.amount_paid) - eventBalance.paid),
                balances: newBalances
              }).eq('id', studentId);
            }
            break;
          }
          case 'CLEAR_STUDENT_BALANCES': {
            const { studentId } = processedAction.payload;
            await supabase.from('transactions').delete().eq('student_id', studentId);
            await supabase.from('students').update({
              amount_owed: 0,
              amount_paid: 0,
              balances: {}
            }).eq('id', studentId);
            break;
          }
          case 'IMPORT_STUDENTS': {
            const { data: existingStudents } = await supabase.from('students').select('*');
            const upserts: any[] = [];
            
            processedAction.payload.forEach(s => {
              const existingIndex = s.rollNo ? (existingStudents || []).findIndex(ex => ex.roll_no === s.rollNo) : -1;
              if (existingIndex >= 0) {
                const ex = existingStudents![existingIndex];
                upserts.push({
                  id: ex.id,
                  name: s.name || ex.name,
                  roll_no: s.rollNo || ex.roll_no,
                  phone: s.phone || ex.phone,
                  email: s.email || ex.email,
                  amount_owed: ex.amount_owed,
                  amount_paid: ex.amount_paid,
                  balances: ex.balances
                });
              } else {
                upserts.push({
                  id: s.id,
                  name: s.name,
                  roll_no: s.rollNo,
                  phone: s.phone,
                  email: s.email,
                  amount_owed: 0,
                  amount_paid: 0,
                  balances: {}
                });
              }
            });
            
            for (let i = 0; i < upserts.length; i += 100) {
              await supabase.from('students').upsert(upserts.slice(i, i + 100));
            }
            break;
          }
          case 'ADD_CATEGORY': {
            const { id, name } = processedAction.payload;
            await supabase.from('categories').insert({ id, name });
            break;
          }
          case 'EDIT_CATEGORY': {
            const { id, name } = processedAction.payload;
            await supabase.from('categories').update({ name }).eq('id', id);
            break;
          }
          case 'DELETE_CATEGORY': {
            const { id } = processedAction.payload;
            await supabase.from('categories').delete().eq('id', id);
            break;
          }
          case 'ADD_EVENT': {
            const { id, name, categoryId, date, amount, applyToAll } = processedAction.payload;
            await supabase.from('events').insert({
              id,
              name,
              category_id: categoryId,
              date,
              status: 'active',
              amount_per_student: amount
            });
            
            if (applyToAll && amount > 0) {
              const { data: currentStudents } = await supabase.from('students').select('*');
              const updates = (currentStudents || []).map(s => {
                const newBalances = { ...(s.balances || {}) };
                newBalances[id!] = { owed: amount, paid: 0 };
                return {
                  id: s.id,
                  name: s.name,
                  roll_no: s.roll_no,
                  amount_owed: Number(s.amount_owed) + amount,
                  amount_paid: s.amount_paid,
                  balances: newBalances
                };
              });
              
              for (let i = 0; i < updates.length; i += 100) {
                await supabase.from('students').upsert(updates.slice(i, i + 100));
              }
            }
            break;
          }
          case 'TOGGLE_EVENT_STATUS': {
            const { data: event } = await supabase.from('events').select('*').eq('id', processedAction.payload.eventId).single();
            if (event) {
              await supabase.from('events').update({
                status: event.status === 'active' ? 'past' : 'active'
              }).eq('id', processedAction.payload.eventId);
            }
            break;
          }
          case 'DELETE_EVENT': {
            const eventId = processedAction.payload.eventId;
            
            await supabase.from('transactions').delete().eq('event_id', eventId);
            
            const { data: students } = await supabase.from('students').select('*');
            const updates = [];
            for (const s of (students || [])) {
              if (s.balances && s.balances[eventId]) {
                const eventBalance = s.balances[eventId];
                const newBalances = { ...s.balances };
                delete newBalances[eventId];
                
                updates.push({
                  id: s.id,
                  name: s.name,
                  roll_no: s.roll_no,
                  amount_owed: Math.max(0, Number(s.amount_owed) - eventBalance.owed),
                  amount_paid: Math.max(0, Number(s.amount_paid) - eventBalance.paid),
                  balances: newBalances
                });
              }
            }
            
            for (let i = 0; i < updates.length; i += 100) {
              await supabase.from('students').upsert(updates.slice(i, i + 100));
            }
            
            await supabase.from('events').delete().eq('id', eventId);
            break;
          }
          case 'DELETE_PAYMENT': {
            await supabase.from('transactions').delete().eq('id', processedAction.payload.transactionId);
            break;
          }
        }
      };

      if (isSyncingQueue) {
        await runDbOps();
      } else {
        // Run DB ops asynchronously so UI doesn't block
        runDbOps().then(() => {
          // Reload data after mutation to ensure 100% sync with DB
          loadData();
        }).catch(err => {
          console.error('Error executing action in DB:', err);
          // If it fails, reload state to revert optimistic update
          loadData();
        });
      }
    } catch (err) {
      console.error('Error executing action:', err);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="font-display text-2xl uppercase tracking-widest animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
