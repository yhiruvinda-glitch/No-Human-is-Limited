

import React, { useState } from 'react';
import { Course, SurfaceType } from '../types';
import { Map, Plus, Save, Trash2, Trophy, MapPin, Edit2, X, Mountain, AlertTriangle } from 'lucide-react';

interface CoursesProps {
  courses: Course[];
  onSave: (courses: Course[]) => void;
}

const Courses: React.FC<CoursesProps> = ({ courses, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{id: string, name: string} | null>(null);
  
  const [formData, setFormData] = useState<Partial<Course>>({
      name: '',
      distance: 0,
      location: '',
      surface: 'Road',
      description: '',
      elevationGain: undefined
  });

  const handleEdit = (course: Course) => {
      setFormData(course);
      setEditId(course.id);
      setIsEditing(true);
  };

  const handleAddNew = () => {
      setFormData({
          name: '',
          distance: 0,
          location: '',
          surface: 'Road',
          description: '',
          elevationGain: undefined
      });
      setEditId(null);
      setIsEditing(true);
  };

  const initiateDelete = (course: Course) => {
      setDeleteConfirmation({ id: course.id, name: course.name });
  };

  const confirmDelete = () => {
      if (deleteConfirmation) {
          const updated = courses.filter(c => c.id !== deleteConfirmation.id);
          onSave(updated);
          setDeleteConfirmation(null);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.distance) return;

      if (editId) {
          // Update existing
          const updated = courses.map(c => c.id === editId ? { ...c, ...formData } as Course : c);
          onSave(updated);
      } else {
          // Create new
          const newCourse: Course = {
              ...formData as Course,
              id: Date.now().toString(),
              bestEffort: undefined
          };
          onSave([...courses, newCourse]);
      }
      setIsEditing(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-3xl font-bold text-white flex items-center">
             <Map className="mr-3 text-brand-500" size={32}/> Course Manager
           </h2>
           <p className="text-slate-400">Track standard routes and automatically maintain course records.</p>
        </div>
        {!isEditing && (
            <button 
            onClick={handleAddNew}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-6 rounded-lg flex items-center transition"
            >
            <Plus size={18} className="mr-2" /> New Course
            </button>
        )}
      </div>

      {isEditing ? (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
                  <h3 className="text-xl font-bold text-white">{editId ? 'Edit Course' : 'Create New Course'}</h3>
                  <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Course Name</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" placeholder="e.g. Lake Loop 5K" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Distance (km)</label>
                          <input type="number" step="0.01" value={formData.distance} onChange={e => setFormData({...formData, distance: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" required />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Elevation Gain (m)</label>
                          <input type="number" value={formData.elevationGain || ''} onChange={e => setFormData({...formData, elevationGain: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" placeholder="e.g. 120" />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Location / Start Point</label>
                          <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" placeholder="e.g. City Park Entrance" />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Surface</label>
                          <select value={formData.surface} onChange={e => setFormData({...formData, surface: e.target.value as SurfaceType})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500">
                             {['Road', 'Trail', 'Track', 'Mixed', 'Grass'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                      <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" rows={3} placeholder="Flat out and back, rolling hills in middle..." />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                      <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-6 rounded-lg flex items-center">
                          <Save size={18} className="mr-2" /> Save Course
                      </button>
                  </div>
              </form>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-slate-500">
                      No courses defined yet. Create one to start tracking records!
                  </div>
              ) : (
                  courses.map(course => (
                      <div key={course.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition group relative">
                          <div className="p-5">
                              <div className="flex justify-between items-start mb-2">
                                  <h3 className="text-lg font-bold text-white">{course.name}</h3>
                                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                                      <button onClick={() => handleEdit(course)} className="text-slate-400 hover:text-brand-400"><Edit2 size={16}/></button>
                                      <button onClick={() => initiateDelete(course)} className="text-slate-400 hover:text-red-400"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
                                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-white font-mono">{course.distance} km</span>
                                  <span>{course.surface}</span>
                                  {course.elevationGain && (
                                      <span className="flex items-center text-slate-300">
                                          <Mountain size={12} className="mr-1 text-slate-500" />
                                          {course.elevationGain}m gain
                                      </span>
                                  )}
                                  {course.location && <span className="flex items-center"><MapPin size={12} className="mr-1"/> {course.location}</span>}
                              </div>
                              <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{course.description || "No description."}</p>
                              
                              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center">
                                      <Trophy size={12} className="text-yellow-500 mr-1" /> Course Record
                                  </div>
                                  {course.bestEffort ? (
                                      <div className="flex justify-between items-end">
                                          <div className="text-xl font-mono font-bold text-yellow-400 leading-none">
                                              {course.bestEffort.formattedTime}
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                              {new Date(course.bestEffort.date).toLocaleDateString()}
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="text-sm text-slate-600 italic">No attempts yet</div>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center space-x-3 mb-4">
                      <div className="p-3 rounded-full bg-red-900/30 text-red-500">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white">Delete Course?</h3>
                  </div>
                  
                  <p className="text-slate-400 mb-6 leading-relaxed">
                      Are you sure you want to permanently delete <span className="text-white font-bold">"{deleteConfirmation.name}"</span>? All associated course records will be lost.
                  </p>
                  
                  <div className="flex justify-end space-x-3">
                      <button 
                          onClick={() => setDeleteConfirmation(null)}
                          className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDelete}
                          className="px-6 py-2 rounded-lg font-bold text-white shadow-lg transition bg-red-600 hover:bg-red-500 shadow-red-900/20"
                      >
                          Delete
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Courses;
