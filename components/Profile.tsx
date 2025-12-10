import React, { useState, useRef } from 'react';
import { UserProfile, PersonalBest, Injury } from '../types';
import { Save, User, Award, Activity, Plus, Trash2, Download, Upload, FileJson, AlertTriangle, Code, Check } from 'lucide-react';
import { createBackupData, restoreBackupData } from '../services/storageService';

interface ProfileProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onGenerateSourceCode: () => string;
}

const Profile: React.FC<ProfileProps> = ({ profile, onSave, onGenerateSourceCode }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (['age', 'weight', 'height'].includes(name)) ? Number(value) : value
    }));
  };

  // PB Handlers
  const addPb = () => {
    setFormData(prev => ({
      ...prev,
      pbs: [...prev.pbs, { distance: '', time: '' }]
    }));
  };
  const updatePb = (index: number, field: keyof PersonalBest, value: string) => {
    const newPbs = [...formData.pbs];
    newPbs[index] = { ...newPbs[index], [field]: value };
    setFormData(prev => ({ ...prev, pbs: newPbs }));
  };
  const removePb = (index: number) => {
    setFormData(prev => ({ ...prev, pbs: prev.pbs.filter((_, i) => i !== index) }));
  };

  // Injury Handlers
  const addInjury = () => {
    setFormData(prev => ({
      ...prev,
      injuryHistory: [...prev.injuryHistory, { id: Date.now().toString(), description: '', date: '', status: 'Active' }]
    }));
  };
  const updateInjury = (index: number, field: keyof Injury, value: string) => {
    const newInjuries = [...formData.injuryHistory];
    newInjuries[index] = { ...newInjuries[index], [field]: value };
    setFormData(prev => ({ ...prev, injuryHistory: newInjuries }));
  };
  const removeInjury = (index: number) => {
    setFormData(prev => ({ ...prev, injuryHistory: prev.injuryHistory.filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    setIsSaving(true);
    onSave(formData);
    setTimeout(() => setIsSaving(false), 500);
  };

  // --- Export / Import Handlers ---
  const handleExport = () => {
    const data = createBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhil_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = restoreBackupData(json);
        if (success) {
          alert('Backup restored successfully! The app will now reload to apply changes.');
          window.location.reload();
        } else {
          alert('Failed to restore. The file might be corrupted or invalid.');
        }
      } catch (err) {
        console.error(err);
        alert('Error parsing the backup file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleGenerateSource = () => {
    const code = onGenerateSourceCode();
    setSourceCode(code);
    setCopySuccess(false);
  };

  const copyToClipboard = () => {
    if (sourceCode) {
        navigator.clipboard.writeText(sourceCode);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-3xl font-bold text-white flex items-center">
             <User className="mr-3 text-brand-500" size={32}/> Athlete Profile
           </h2>
           <p className="text-slate-400">Manage your physiological data and history for better AI coaching.</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-6 rounded-lg flex items-center transition shadow-lg shadow-brand-900/20"
        >
          <Save size={18} className="mr-2" />
          {isSaving ? 'Saved!' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Bio & Vitals */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Vitals</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500 transition" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Weight (kg)</label>
                <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Height (cm)</label>
                <input type="number" name="height" value={formData.height} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500 transition" />
              </div>
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-400 mb-1">Weekly Training Availability</label>
               <input type="text" name="weeklyAvailability" value={formData.weeklyAvailability} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500 transition" placeholder="e.g. 5 days, 8 hours max" />
            </div>
             <div>
               <label className="block text-xs font-medium text-slate-400 mb-1">Primary Race Focus</label>
               <select name="preferredRace" value={formData.preferredRace} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500 transition">
                  <option value="800m">800m</option>
                  <option value="1500m">1500m</option>
                  <option value="3000m">3000m</option>
                  <option value="5000m">5000m</option>
                  <option value="10K">10K</option>
                  <option value="Half Marathon">Half Marathon</option>
                  <option value="Marathon">Marathon</option>
               </select>
            </div>
          </div>
        </div>

        {/* Medical / Injury History */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
           <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
             <h3 className="text-lg font-bold text-white flex items-center"><Activity size={18} className="mr-2 text-red-400"/> Injury History</h3>
             <button onClick={addInjury} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded hover:bg-slate-600"><Plus size={14} /></button>
           </div>
           <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
             {formData.injuryHistory.map((inj, idx) => (
               <div key={idx} className="bg-slate-900/50 p-3 rounded border border-slate-700/50 flex flex-col gap-2 relative">
                 <button onClick={() => removeInjury(idx)} className="absolute right-2 top-2 text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
                 <div className="flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Injury (e.g. IT Band)" 
                     value={inj.description} 
                     onChange={(e) => updateInjury(idx, 'description', e.target.value)}
                     className="flex-1 bg-slate-800 border-none rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none" 
                   />
                 </div>
                 <div className="flex gap-2">
                    <input 
                      type="date" 
                      value={inj.date} 
                      onChange={(e) => updateInjury(idx, 'date', e.target.value)}
                      className="w-32 bg-slate-800 border-none rounded px-2 py-1 text-xs text-slate-400 outline-none" 
                    />
                    <select 
                      value={inj.status} 
                      onChange={(e) => updateInjury(idx, 'status', e.target.value as any)}
                      className={`text-xs rounded px-2 py-1 border-none outline-none ${
                        inj.status === 'Active' ? 'bg-red-900/50 text-red-400' :
                        inj.status === 'Recovering' ? 'bg-orange-900/50 text-orange-400' :
                        'bg-green-900/50 text-green-400'
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Recovering">Recovering</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                 </div>
               </div>
             ))}
             {formData.injuryHistory.length === 0 && <p className="text-slate-500 text-sm italic">No injury history recorded.</p>}
           </div>
        </div>

        {/* Personal Bests */}
        <div className="md:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
           <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
             <h3 className="text-lg font-bold text-white flex items-center"><Award size={18} className="mr-2 text-yellow-400"/> Personal Bests</h3>
             <button onClick={addPb} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded hover:bg-slate-600"><Plus size={14} /></button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.pbs.map((pb, idx) => (
                <div key={idx} className="bg-slate-900 p-3 rounded border border-slate-700 flex items-center gap-3 relative">
                   <div className="p-2 bg-yellow-400/10 rounded-full text-yellow-400">
                     <Award size={20} />
                   </div>
                   <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        placeholder="Dist (e.g. 5K)" 
                        value={pb.distance} 
                        onChange={(e) => updatePb(idx, 'distance', e.target.value)}
                        className="w-full bg-transparent border-b border-slate-700 text-sm font-bold text-white focus:border-brand-500 outline-none pb-1"
                      />
                      <input 
                        type="text" 
                        placeholder="Time (e.g. 17:30)" 
                        value={pb.time} 
                        onChange={(e) => updatePb(idx, 'time', e.target.value)}
                        className="w-full bg-transparent border-b border-slate-700 text-sm font-mono text-brand-400 focus:border-brand-500 outline-none pb-1"
                      />
                   </div>
                   <button onClick={() => removePb(idx)} className="text-slate-600 hover:text-red-400"><Trash2 size={16}/></button>
                </div>
              ))}
           </div>
        </div>

        {/* Data Management & Source Gen */}
        <div className="md:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center border-b border-slate-700 pb-2">
                <FileJson size={18} className="mr-2 text-blue-400"/> Data Management
            </h3>

            {/* Developer Mode: Source Code Generation */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-brand-400 mb-1 flex items-center">
                            <Code size={16} className="mr-2" /> Developer: Generate Static DB
                        </h4>
                        <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                            Generate a TypeScript representation of your current app state. Copy this code into 
                            <span className="font-mono bg-slate-800 px-1 py-0.5 rounded text-white ml-1">src/data/staticDb.ts</span> 
                            to "hardwire" your current data as the new initial state for future deployments.
                        </p>
                    </div>
                    <button 
                        onClick={handleGenerateSource}
                        className="flex items-center px-4 py-2 bg-brand-900/30 hover:bg-brand-900/50 text-brand-400 border border-brand-500/30 text-sm font-bold rounded-lg transition"
                    >
                        Generate Source Code
                    </button>
                </div>

                {sourceCode && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                            <div className="flex justify-between items-center bg-slate-900 px-4 py-2 border-b border-slate-800">
                                <span className="text-xs text-slate-500 font-mono">staticDb.ts content</span>
                                <button 
                                    onClick={copyToClipboard} 
                                    className={`text-xs flex items-center font-bold px-3 py-1 rounded transition ${copySuccess ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                >
                                    {copySuccess ? <><Check size={12} className="mr-1"/> Copied</> : 'Copy Code'}
                                </button>
                            </div>
                            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-64">
                                {sourceCode}
                            </pre>
                        </div>
                    </div>
                )}
            </div>

            {/* Standard JSON Backup */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1">Backup & Restore (JSON)</h4>
                        <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                            Export your entire training history, profile, and settings to a JSON file for safe keeping.
                            <br />
                            <span className="text-orange-400 flex items-center mt-1"><AlertTriangle size={10} className="mr-1"/> Import will overwrite current data.</span>
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleExport}
                            className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition border border-slate-600"
                        >
                            <Download size={16} className="mr-2" /> Export JSON
                        </button>
                        <button 
                            onClick={handleImportClick}
                            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/20"
                        >
                            <Upload size={16} className="mr-2" /> Import JSON
                        </button>
                        {/* Hidden Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;