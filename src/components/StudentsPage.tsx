import React, { useState } from 'react';
import { useStore, Student } from '../store/StoreContext';
import { useAuth } from './Auth';
import { Modal } from './Modal';
import { Plus, Search, Upload, Trash2, Edit2, Mail, MessageCircle } from 'lucide-react';
import Papa from 'papaparse';

export const StudentsPage: React.FC = () => {
  const { state, dispatch } = useStore();
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [studentForm, setStudentForm] = useState({
    name: '',
    rollNo: '',
    phone: '',
    email: ''
  });

  const filteredStudents = state.students.filter(s => {
    const searchLower = search.toLowerCase();
    const matchesName = s.name.toLowerCase().includes(searchLower);
    const matchesRoll = s.rollNo?.toLowerCase().includes(searchLower);
    const matchesPhone = s.phone?.toLowerCase().includes(searchLower);
    const matchesEmail = s.email?.toLowerCase().includes(searchLower);
    return matchesName || matchesRoll || matchesPhone || matchesEmail;
  }).sort((a, b) => {
    if (!a.rollNo && !b.rollNo) return a.name.localeCompare(b.name);
    if (!a.rollNo) return 1;
    if (!b.rollNo) return -1;
    const numA = parseInt(a.rollNo, 10);
    const numB = parseInt(b.rollNo, 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
    return a.rollNo.localeCompare(b.rollNo);
  });

  const handleOpenAdd = () => {
    setStudentForm({ name: '', rollNo: '', phone: '', email: '' });
    setEditingStudent(null);
    setIsAddStudentOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setStudentForm({
      name: student.name,
      rollNo: student.rollNo || '',
      phone: student.phone || '',
      email: student.email || ''
    });
    setEditingStudent(student);
    setIsAddStudentOpen(true);
  };

  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentForm.name && studentForm.rollNo) {
      if (editingStudent) {
        dispatch({
          type: 'UPDATE_STUDENT',
          payload: { 
            id: editingStudent.id,
            name: studentForm.name, 
            rollNo: studentForm.rollNo,
            phone: studentForm.phone,
            email: studentForm.email
          }
        });
      } else {
        dispatch({
          type: 'ADD_STUDENT',
          payload: { 
            name: studentForm.name, 
            rollNo: studentForm.rollNo,
            phone: studentForm.phone,
            email: studentForm.email,
            amountOwed: 0 
          }
        });
      }
      setIsAddStudentOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newStudents: any[] = [];
        
        results.data.forEach((row: any) => {
          // Smart column mapping
          const keys = Object.keys(row);
          
          const getVal = (possibleNames: string[]) => {
            const key = keys.find(k => possibleNames.some(p => k.toLowerCase().includes(p)));
            return key ? row[key]?.trim() : '';
          };
          
          const rollNo = getVal(['roll', 'id', 'no']);
          const name = getVal(['name', 'student']);
          const phone = getVal(['phone', 'mobile', 'contact', 'whatsapp']);
          const email = getVal(['email', 'mail']);
          
          // We need at least a roll number or a name to import
          if (rollNo || name) {
            newStudents.push({ 
              name: name || `Student ${rollNo}`, 
              rollNo, 
              phone, 
              email 
            });
          }
        });
        
        if (newStudents.length > 0) {
          dispatch({ type: 'IMPORT_STUDENTS', payload: newStudents });
          alert(`Successfully imported/updated ${newStudents.length} students.`);
        } else {
          alert('No valid student data found in CSV. Please ensure columns have headers like "Roll No", "Name", "Phone", "Email".');
        }
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      }
    });
    
    e.target.value = ''; // reset
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name}? This will also remove all their payment records.`)) {
      dispatch({ type: 'REMOVE_STUDENT', payload: { studentId: id } });
    }
  };

  return (
    <div className="mb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h2 className="text-3xl font-display uppercase tracking-widest font-black">Students</h2>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
          <div className="relative w-full sm:flex-1 md:w-64">
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
          {role === 'admin' && (
            <>
              <label className="w-full sm:w-auto sm:flex-1 md:flex-none flex items-center justify-center px-4 py-3 bg-white neo-border neo-shadow font-bold uppercase text-sm cursor-pointer hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <button
                onClick={handleOpenAdd}
                className="w-full sm:w-auto sm:flex-1 md:flex-none flex items-center justify-center px-4 py-3 bg-info neo-border neo-shadow font-bold uppercase text-sm cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white neo-border neo-shadow-static overflow-x-auto">
        <table className="w-full text-left border-collapse block md:table">
          <thead className="hidden md:table-header-group">
            <tr className="bg-paper border-b-4 border-black">
              <th className="p-4 font-display text-xl uppercase tracking-wide">Roll No</th>
              <th className="p-4 font-display text-xl uppercase tracking-wide">Name</th>
              <th className="p-4 font-display text-xl uppercase tracking-wide">Contact</th>
              {role === 'admin' && <th className="p-4 font-display text-xl uppercase tracking-wide text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {filteredStudents.map((student, idx) => (
              <tr key={student.id} className={`block md:table-row border-b-4 border-black last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-paper/50'} hover:bg-info/10 transition-colors`}>
                <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                  <div className="flex flex-col md:block gap-1">
                    <span className="md:hidden font-bold uppercase text-xs text-gray-500">Roll No</span>
                    <span className="font-mono text-lg font-bold break-words">{student.rollNo || '-'}</span>
                  </div>
                </td>
                <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                  <div className="flex flex-col md:block gap-1">
                    <span className="md:hidden font-bold uppercase text-xs text-gray-500">Name</span>
                    <span className="font-bold text-lg break-words">{student.name}</span>
                  </div>
                </td>
                <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                  <div className="flex flex-col md:block gap-1">
                    <span className="md:hidden font-bold uppercase text-xs text-gray-500">Contact</span>
                    <div className="flex flex-col gap-1 text-sm">
                      {student.phone ? (
                        <a href={`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline font-medium w-fit">
                          <MessageCircle className="w-4 h-4 shrink-0" /> <span className="break-all">{student.phone}</span>
                        </a>
                      ) : <span className="text-gray-400">-</span>}
                      {student.email ? (
                        <a href={`mailto:${student.email}`} className="flex items-center gap-2 text-blue-600 hover:underline font-medium w-fit max-w-full">
                          <Mail className="w-4 h-4 shrink-0" /> <span className="break-all">{student.email}</span>
                        </a>
                      ) : <span className="text-gray-400 hidden md:inline">-</span>}
                    </div>
                  </div>
                </td>
                {role === 'admin' && (
                  <td className="p-4 block md:table-cell border-b-2 border-dashed border-gray-200 md:border-none">
                    <div className="flex flex-col md:block md:text-right gap-2 mt-2 md:mt-0">
                      <span className="md:hidden font-bold uppercase text-xs text-gray-500">Actions</span>
                      <div className="flex gap-2 flex-wrap md:justify-end">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-2 bg-warning text-black neo-border neo-shadow hover:bg-yellow-400 transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="p-2 bg-red-400 text-black neo-border neo-shadow hover:bg-red-500 transition-colors cursor-pointer"
                          title="Remove Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr className="block md:table-row">
                <td colSpan={4} className="p-8 text-center font-bold text-lg text-gray-500 block md:table-cell">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Student Modal */}
      <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title={editingStudent ? "Edit Student" : "Add New Student"}>
        <form onSubmit={handleSubmitStudent} className="flex flex-col gap-4">
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Student Name</label>
            <input
              type="text"
              required
              value={studentForm.name}
              onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Roll No</label>
            <input
              type="text"
              required
              value={studentForm.rollNo}
              onChange={(e) => setStudentForm({...studentForm, rollNo: e.target.value})}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              placeholder="e.g. 101"
            />
          </div>
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Phone / WhatsApp (Optional)</label>
            <input
              type="text"
              value={studentForm.phone}
              onChange={(e) => setStudentForm({...studentForm, phone: e.target.value})}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              placeholder="e.g. 9800000000"
            />
          </div>
          <div>
            <label className="block font-bold uppercase text-sm mb-2">Email (Optional)</label>
            <input
              type="email"
              value={studentForm.email}
              onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
              className="w-full p-3 bg-white neo-border focus:outline-none focus:ring-0"
              placeholder="e.g. student@example.com"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-info text-black neo-border neo-shadow font-bold uppercase tracking-wider mt-2 cursor-pointer">
            {editingStudent ? "Save Changes" : "Add Student"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
