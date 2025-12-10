

import React, { useState } from 'react';
import { Shoe, Workout } from '../types';
import { ShoppingBag, Plus, Save, Trash2, Archive, RotateCcw, X, Footprints, AlertTriangle } from 'lucide-react';

interface ShoeDepositoryProps {
  shoes: Shoe[];
  workouts: Workout[];
  onSave: (shoes: Shoe[]) => void;
}

const ShoeDepository: React.FC<ShoeDepositoryProps> = ({ shoes, workouts, onSave }) => {
  const [activeTab, setActiveTab] = useState<'Active' | 'Retired'>('Active');
  const [isAdding, setIsAdding] = useState(false);
  const [newShoe, setNewShoe] = useState<Partial<Shoe>>({
    brand: '',
    model: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    maxMileage: 800,
    initialDistance: 0
  });

  // Confirmation State
  const [confirmAction, setConfirmAction] = useState<{ type: 'RETIRE' | 'DELETE', id: string, name: string } | null>(null);

  const getMileage = (shoe: Shoe) => {
    const trackedDistance = workouts
      .filter(w => w.shoe === shoe.name)
      .reduce((sum, w) => sum + w.distance, 0);
    return trackedDistance + (shoe.initialDistance || 0);
  };

  const handleAddShoe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoe.brand || !newShoe.model) return;
    
    const name = `${newShoe.brand} ${newShoe.model}`;
    const shoe: Shoe = {
      id: Date.now().toString(),
      name: name,
      brand: newShoe.brand!,
      model: newShoe.model!,
      purchaseDate: newShoe.purchaseDate!,
      status: 'Active',
      maxMileage: newShoe.maxMileage || 800,
      initialDistance: newShoe.initialDistance || 0
    };
    
    onSave([...shoes, shoe]);
    setIsAdding(false);
    setNewShoe({ brand: '', model: '', purchaseDate: new Date().toISOString().split('T')[0], maxMileage: 800, initialDistance: 0 });
  };

  const initiateRetire = (id: string, name: string) => {
     setConfirmAction({ type: 'RETIRE', id, name });
  };

  const initiateDelete = (id: string, name: string) => {
     setConfirmAction({ type: 'DELETE', id, name });
  };

  const executeAction = () => {
      if (!confirmAction) return;
      
      if (confirmAction.type === 'RETIRE') {
          const updated = shoes.map(s => s.id === confirmAction.id ? { ...s, status: 'Retired' as const } : s);
          onSave(updated);
      } else if (confirmAction.type === 'DELETE') {
          onSave(shoes.filter(s => s.id !== confirmAction.id));
      }
      setConfirmAction(null);
  };

  const handleReactivate = (id: string) => {
      const updated = shoes.map(s => s.id === id ? { ...s, status: 'Active' as const } : s);
      onSave(updated);
  };

  const filteredShoes = shoes.filter(s => s.status === activeTab);

  return (
    <div className="max-w-6xl mx-auto pb-10 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center">
            <ShoppingBag className="mr-3 text-brand-500" size={32}/> Shoe Depository
          </h2>
          <p className="text-slate-400">Track mileage and manage your rotation.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-6 rounded-lg flex items-center transition"
        >
          <Plus size={18} className="mr-2" /> Add Shoe
        </button>
      </div>

      {isAdding && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                  <h3 className="text-lg font-bold text-white">Add New Shoe</h3>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddShoe} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Brand</label>
                          <input type="text" value={newShoe.brand} onChange={e => setNewShoe({...newShoe, brand: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" placeholder="e.g. Nike" required />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Model</label>
                          <input type="text" value={newShoe.model} onChange={e => setNewShoe({...newShoe, model: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" placeholder="e.g. Vaporfly 3" required />
                      </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Purchase Date</label>
                          <input type="date" value={newShoe.purchaseDate} onChange={e => setNewShoe({...newShoe, purchaseDate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Max Mileage (km)</label>
                          <input type="number" value={newShoe.maxMileage} onChange={e => setNewShoe({...newShoe, maxMileage: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Initial Dist (km)</label>
                          <input type="number" value={newShoe.initialDistance || ''} onChange={e => setNewShoe({...newShoe, initialDistance: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-brand-500" placeholder="0" />
                      </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                      <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-6 rounded-lg flex items-center">
                          <Save size={18} className="mr-2" /> Save
                      </button>
                  </div>
              </form>
          </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-slate-800 p-1 rounded-lg w-fit">
          <button 
              onClick={() => setActiveTab('Active')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'Active' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
              Active Rotation
          </button>
          <button 
              onClick={() => setActiveTab('Retired')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'Retired' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
              Retired
          </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShoes.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-slate-500">
                  <Footprints size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No {activeTab.toLowerCase()} shoes found.</p>
              </div>
          ) : (
              filteredShoes.map(shoe => {
                  const mileage = getMileage(shoe);
                  const limit = shoe.maxMileage || 800;
                  const percent = Math.min(100, (mileage / limit) * 100);
                  
                  return (
                      <div key={shoe.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition group relative flex flex-col">
                          <div className="p-6 flex-1">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                     <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{shoe.brand}</div>
                                     <h3 className="text-xl font-bold text-white leading-tight">{shoe.model}</h3>
                                  </div>
                                  {activeTab === 'Active' ? (
                                      <button onClick={() => initiateDelete(shoe.id, shoe.name)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18}/></button>
                                  ) : (
                                      <button onClick={() => initiateDelete(shoe.id, shoe.name)} className="text-slate-600 hover:text-red-400"><Trash2 size={18}/></button>
                                  )}
                              </div>
                              
                              <div className="mt-6 mb-2 flex justify-between items-end">
                                  <div className="text-3xl font-mono font-bold text-white">{mileage.toFixed(1)} <span className="text-sm font-sans text-slate-500">km</span></div>
                                  <div className="text-xs text-slate-500 mb-1">Limit: {limit} km</div>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                                  <div 
                                      className={`h-full transition-all duration-1000 ${percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-orange-500' : 'bg-brand-500'}`} 
                                      style={{ width: `${percent}%` }}
                                  ></div>
                              </div>

                              <div className="text-xs text-slate-500 flex justify-between">
                                  <span>Purchased: {new Date(shoe.purchaseDate).toLocaleDateString()}</span>
                                  {percent >= 100 && <span className="text-red-400 font-bold">Max Limit Reached</span>}
                              </div>
                              {shoe.initialDistance && shoe.initialDistance > 0 && (
                                <div className="text-[10px] text-slate-600 mt-1">
                                    Includes {shoe.initialDistance}km initial
                                </div>
                              )}
                          </div>
                          
                          {/* Actions Footer */}
                          <div className="bg-slate-900/50 p-3 border-t border-slate-800 flex justify-end">
                              {activeTab === 'Active' ? (
                                  <button 
                                      onClick={() => initiateRetire(shoe.id, shoe.name)} 
                                      className="text-xs flex items-center text-slate-400 hover:text-orange-400 font-medium transition"
                                  >
                                      <Archive size={14} className="mr-1" /> Retire Shoe
                                  </button>
                              ) : (
                                  <button 
                                      onClick={() => handleReactivate(shoe.id)} 
                                      className="text-xs flex items-center text-slate-400 hover:text-brand-400 font-medium transition"
                                  >
                                      <RotateCcw size={14} className="mr-1" /> Reactivate
                                  </button>
                              )}
                          </div>
                      </div>
                  );
              })
          )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center space-x-3 mb-4">
                      <div className={`p-3 rounded-full ${confirmAction.type === 'DELETE' ? 'bg-red-900/30 text-red-500' : 'bg-orange-900/30 text-orange-500'}`}>
                          {confirmAction.type === 'DELETE' ? <AlertTriangle size={24} /> : <Archive size={24} />}
                      </div>
                      <h3 className="text-xl font-bold text-white">
                          {confirmAction.type === 'DELETE' ? 'Delete Shoe?' : 'Retire Shoe?'}
                      </h3>
                  </div>
                  
                  <p className="text-slate-400 mb-6 leading-relaxed">
                      {confirmAction.type === 'DELETE' 
                        ? `Are you sure you want to permanently delete "${confirmAction.name}"? This cannot be undone.` 
                        : `Are you sure you want to retire "${confirmAction.name}"? It will be moved to the archive.`}
                  </p>
                  
                  <div className="flex justify-end space-x-3">
                      <button 
                          onClick={() => setConfirmAction(null)}
                          className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={executeAction}
                          className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition flex items-center ${
                              confirmAction.type === 'DELETE' 
                              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
                              : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'
                          }`}
                      >
                          {confirmAction.type === 'DELETE' ? 'Delete' : 'Retire'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ShoeDepository;