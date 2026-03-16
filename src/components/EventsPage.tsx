import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { useAuth } from './Auth';
import { Modal } from './Modal';
import { Plus, FolderPlus, Calendar, CheckCircle, Clock, Trash2, ArrowLeft, Printer } from 'lucide-react';
import { SummaryStats } from './SummaryStats';
import { Ledger } from './Ledger';

import { formatCurrency } from '../utils/currency';

export const EventsPage: React.FC = () => {
  const { state, dispatch } = useStore();
  const { role } = useAuth();
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  
  const [newEventName, setNewEventName] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('');
  const [newEventAmount, setNewEventAmount] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName) {
      dispatch({ type: 'ADD_CATEGORY', payload: { name: newCategoryName } });
      setNewCategoryName('');
    }
  };

  const handleEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategoryId && editingCategoryName) {
      dispatch({ type: 'EDIT_CATEGORY', payload: { id: editingCategoryId, name: editingCategoryName } });
      setEditingCategoryId(null);
      setEditingCategoryName('');
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      dispatch({ type: 'DELETE_CATEGORY', payload: { id } });
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

  const toggleEventStatus = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_EVENT_STATUS', payload: { eventId } });
  };

  const deleteEvent = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this event?')) {
      dispatch({ type: 'DELETE_EVENT', payload: { eventId } });
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
      }
    }
  };

  if (selectedEventId) {
    const event = state.events.find(e => e.id === selectedEventId);
    if (!event) {
      setSelectedEventId(null);
      return null;
    }
    return (
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedEventId(null)}
              className="p-3 bg-white neo-border neo-shadow cursor-pointer hover:bg-gray-50 print:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-3xl font-display uppercase tracking-widest font-black">
              {event.name} Dashboard
            </h2>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center px-4 py-3 bg-white neo-border neo-shadow font-bold uppercase tracking-wider text-sm transition-colors cursor-pointer hover:bg-gray-100 print:hidden"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
        <SummaryStats selectedEventId={selectedEventId} />
        <Ledger selectedEventId={selectedEventId} onSelectEvent={setSelectedEventId} hideEventSelector={true} />
      </div>
    );
  }

  const activeEvents = state.events.filter(e => e.status === 'active');
  const pastEvents = state.events.filter(e => e.status === 'past');

  return (
    <div className="mb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h2 className="text-3xl font-display uppercase tracking-widest font-black">Events</h2>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
          {role === 'admin' && (
            <>
              <button
                onClick={() => setIsManageCategoriesOpen(true)}
                className="w-full sm:w-auto sm:flex-1 md:flex-none flex items-center justify-center px-4 py-3 bg-white neo-border neo-shadow font-bold uppercase text-sm cursor-pointer"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Manage Categories
              </button>
              <button
                onClick={() => setIsAddEventOpen(true)}
                className="w-full sm:w-auto sm:flex-1 md:flex-none flex items-center justify-center px-4 py-3 bg-action text-white neo-border neo-shadow font-bold uppercase text-sm cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Events */}
        <div>
          <h3 className="text-xl font-display uppercase font-black mb-4 flex items-center">
            <Clock className="mr-2 h-5 w-5 text-action" />
            Active Events
          </h3>
          <div className="flex flex-col gap-4">
            {activeEvents.length === 0 ? (
              <div className="bg-white neo-border p-6 text-center text-gray-500 font-bold">
                No active events.
              </div>
            ) : (
              activeEvents.map(event => {
                const category = state.categories.find(c => c.id === event.categoryId);
                return (
                  <div 
                    key={event.id} 
                    onClick={() => setSelectedEventId(event.id)}
                    className="bg-white neo-border neo-shadow-static p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        {category?.name || 'Uncategorized'}
                      </div>
                      <h4 className="text-lg font-bold">{event.name}</h4>
                      <div className="text-sm font-mono mt-1">Fee: RS {formatCurrency(event.amountPerStudent)}</div>
                    </div>
                    {role === 'admin' && (
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button
                          onClick={(e) => toggleEventStatus(e, event.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-400 text-black neo-border font-bold uppercase text-xs cursor-pointer hover:bg-green-500"
                        >
                          Mark as Past
                        </button>
                        <button
                          onClick={(e) => deleteEvent(e, event.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-400 text-black neo-border font-bold uppercase text-xs cursor-pointer hover:bg-red-500"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Past Events */}
        <div>
          <h3 className="text-xl font-display uppercase font-black mb-4 flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
            Past Events
          </h3>
          <div className="flex flex-col gap-4">
            {pastEvents.length === 0 ? (
              <div className="bg-white neo-border p-6 text-center text-gray-500 font-bold">
                No past events.
              </div>
            ) : (
              pastEvents.map(event => {
                const category = state.categories.find(c => c.id === event.categoryId);
                return (
                  <div 
                    key={event.id} 
                    onClick={() => setSelectedEventId(event.id)}
                    className="bg-paper neo-border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 opacity-75 cursor-pointer hover:opacity-100 transition-opacity"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        {category?.name || 'Uncategorized'}
                      </div>
                      <h4 className="text-lg font-bold line-through decoration-2">{event.name}</h4>
                      <div className="text-sm font-mono mt-1">Fee: RS {formatCurrency(event.amountPerStudent)}</div>
                    </div>
                    {role === 'admin' && (
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button
                          onClick={(e) => toggleEventStatus(e, event.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-white text-black neo-border font-bold uppercase text-xs cursor-pointer hover:bg-gray-100"
                        >
                          Reopen
                        </button>
                        <button
                          onClick={(e) => deleteEvent(e, event.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-400 text-black neo-border font-bold uppercase text-xs cursor-pointer hover:bg-red-500"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Manage Categories Modal */}
      <Modal isOpen={isManageCategoriesOpen} onClose={() => {
        setIsManageCategoriesOpen(false);
        setEditingCategoryId(null);
      }} title="Manage Categories">
        <div className="flex flex-col gap-6">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 p-3 bg-white neo-border focus:outline-none focus:ring-0"
              placeholder="New Category Name"
            />
            <button type="submit" className="px-4 py-3 bg-action text-white neo-border neo-shadow font-bold uppercase text-sm cursor-pointer">
              Add
            </button>
          </form>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {state.categories.length === 0 ? (
              <div className="text-center text-gray-500 font-bold py-4">No categories yet.</div>
            ) : (
              state.categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white neo-border">
                  {editingCategoryId === c.id ? (
                    <form onSubmit={handleEditCategory} className="flex flex-1 gap-2 mr-2">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="flex-1 p-2 bg-white neo-border focus:outline-none focus:ring-0 text-sm"
                      />
                      <button type="submit" className="px-3 py-2 bg-green-400 text-black neo-border font-bold uppercase text-xs cursor-pointer">
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingCategoryId(null)} className="px-3 py-2 bg-gray-200 text-black neo-border font-bold uppercase text-xs cursor-pointer">
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="font-bold">{c.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCategoryId(c.id);
                            setEditingCategoryName(c.name);
                          }}
                          className="px-3 py-2 bg-info text-black neo-border font-bold uppercase text-xs cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="px-3 py-2 bg-red-400 text-black neo-border font-bold uppercase text-xs cursor-pointer hover:bg-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
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
              {state.categories.map(c => (
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
    </div>
  );
};
