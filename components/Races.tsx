
import React, { useState, useMemo } from 'react';
import { Workout, Goal, WorkoutType } from '../types';
import { Trophy, Calendar, MapPin, Flag, Plus, Trash2, Clock, Timer, Medal, Zap } from 'lucide-react';
import { formatSecondsToTime } from '../utils/analytics';
import WorkoutDetailModal from './WorkoutDetailModal';

interface RacesProps {
    workouts: Workout[];
    goals: Goal[];
    onAddGoal: (goal: Goal) => void;
    onDeleteRace: (id: string) => void;
}

const Races: React.FC<RacesProps> = ({ workouts, goals, onAddGoal, onDeleteRace }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [selectedRace, setSelectedRace] = useState<Workout | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form State for Next Race
    const [newRace, setNewRace] = useState<Partial<Goal>>({
        name: '',
        targetDistance: 0,
        targetTime: '',
        deadline: new Date().toISOString().split('T')[0]
    });

    const upcomingRaces = goals
        .filter(g => g.deadline && new Date(g.deadline) >= new Date(new Date().setHours(0,0,0,0)))
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

    const pastRaces = useMemo(() => {
        return workouts
            .filter(w => w.type === WorkoutType.RACE)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [workouts]);

    // Calculate Race Stats
    const stats = useMemo(() => {
        let wins = 0;
        let podiums = 0;
        let top10 = 0;
        let pbs = 0;

        pastRaces.forEach(r => {
            if (r.isPb) pbs++;
            
            if (r.place) {
                // Extract number from string like "1st", "2", "7th"
                const rank = parseInt(r.place.replace(/\D/g, ''));
                if (!isNaN(rank)) {
                    if (rank === 1) wins++;
                    if (rank <= 3) podiums++;
                    if (rank <= 10) top10++;
                }
            }
        });

        return { wins, podiums, top10, pbs, count: pastRaces.length };
    }, [pastRaces]);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRace.name || !newRace.deadline || !newRace.targetDistance) return;

        const goal: Goal = {
            id: Date.now().toString(),
            name: newRace.name,
            targetDistance: Number(newRace.targetDistance),
            targetTime: newRace.targetTime || '00:00',
            currentBest: '00:00',
            baseline: '00:00',
            deadline: newRace.deadline
        };
        onAddGoal(goal);
        setIsAdding(false);
        setNewRace({ name: '', targetDistance: 0, targetTime: '', deadline: new Date().toISOString().split('T')[0] });
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            onDeleteRace(deleteConfirm);
            setDeleteConfirm(null);
        }
    };

    const calculateDaysOut = (dateStr: string) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const target = new Date(dateStr);
        const diff = target.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {selectedRace && (
                <WorkoutDetailModal 
                    workout={selectedRace} 
                    goals={goals} 
                    onClose={() => setSelectedRace(null)} 
                />
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center">
                        <Trophy className="mr-3 text-brand-500" size={32}/> Race Center
                    </h2>
                    <p className="text-slate-400">Manage upcoming events and review your racing history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Upcoming Races Column */}
                <div className="md:col-span-1 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Next Up</h3>
                        <button 
                            onClick={() => setIsAdding(true)} 
                            className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-full flex items-center transition"
                        >
                            <Plus size={14} className="mr-1"/> Add Race
                        </button>
                    </div>

                    {isAdding && (
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
                            <form onSubmit={handleAddSubmit} className="space-y-3">
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Race Name</label>
                                    <input 
                                        type="text" 
                                        value={newRace.name} 
                                        onChange={e => setNewRace({...newRace, name: e.target.value})} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-brand-500 outline-none"
                                        placeholder="e.g. City Marathon"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Date</label>
                                        <input 
                                            type="date" 
                                            value={newRace.deadline} 
                                            onChange={e => setNewRace({...newRace, deadline: e.target.value})} 
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-brand-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Dist (km)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={newRace.targetDistance || ''} 
                                            onChange={e => setNewRace({...newRace, targetDistance: Number(e.target.value)})} 
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-brand-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Target Time</label>
                                    <input 
                                        type="text" 
                                        value={newRace.targetTime} 
                                        onChange={e => setNewRace({...newRace, targetTime: e.target.value})} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-brand-500 outline-none font-mono"
                                        placeholder="mm:ss"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 text-xs text-slate-400 hover:text-white py-2">Cancel</button>
                                    <button type="submit" className="flex-1 bg-brand-600 text-white text-xs font-bold py-2 rounded">Save</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {upcomingRaces.length === 0 && !isAdding ? (
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-700 text-center">
                            <Flag size={24} className="mx-auto text-slate-600 mb-2"/>
                            <p className="text-sm text-slate-500">No upcoming races.</p>
                            <button onClick={() => setIsAdding(true)} className="text-xs text-brand-400 font-bold mt-2">Plan your next event</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingRaces.map(race => {
                                const days = calculateDaysOut(race.deadline!);
                                return (
                                    <div key={race.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                                            <Timer size={60} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-white truncate max-w-[70%]">{race.name}</h4>
                                                <span className="text-xs font-mono bg-brand-900/40 text-brand-400 px-2 py-0.5 rounded border border-brand-500/20">{days} Days</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                                <Calendar size={12}/>
                                                <span>{new Date(race.deadline!).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                                <span>•</span>
                                                <span>{race.targetDistance}km</span>
                                            </div>
                                            {race.targetTime && race.targetTime !== '00:00' && (
                                                <div className="bg-slate-900/50 rounded px-2 py-1.5 flex justify-between items-center border border-slate-700/50">
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Target</span>
                                                    <span className="text-sm font-mono text-white font-bold">{race.targetTime}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Past Races Column */}
                <div className="md:col-span-2 space-y-4">
                     <h3 className="text-lg font-bold text-white">Race History</h3>
                     
                     {/* Race Stats Summary */}
                     {pastRaces.length > 0 && (
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                                 <div className="flex items-center text-xs text-yellow-500 font-bold uppercase mb-1">
                                     <Trophy size={12} className="mr-1" /> Wins
                                 </div>
                                 <div className="text-xl font-bold text-white">{stats.wins}</div>
                             </div>
                             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                                 <div className="flex items-center text-xs text-slate-300 font-bold uppercase mb-1">
                                     <Medal size={12} className="mr-1" /> Podiums
                                 </div>
                                 <div className="text-xl font-bold text-white">{stats.podiums}</div>
                             </div>
                             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                                 <div className="flex items-center text-xs text-blue-400 font-bold uppercase mb-1">
                                     <Flag size={12} className="mr-1" /> Top 10
                                 </div>
                                 <div className="text-xl font-bold text-white">{stats.top10}</div>
                             </div>
                             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                                 <div className="flex items-center text-xs text-brand-400 font-bold uppercase mb-1">
                                     <Zap size={12} className="mr-1" /> PBs
                                 </div>
                                 <div className="text-xl font-bold text-white">{stats.pbs}</div>
                             </div>
                         </div>
                     )}

                     {pastRaces.length === 0 ? (
                         <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center">
                             <p className="text-slate-500">No completed races found in history.</p>
                             <p className="text-xs text-slate-600 mt-1">Log a "Race" workout type to see it here.</p>
                         </div>
                     ) : (
                         <div className="space-y-3">
                             {pastRaces.map(race => {
                                 // Rank Parsing for visual style
                                 let rank = 0;
                                 let rankDisplay = race.place || '';
                                 let badgeStyle = 'bg-slate-800 text-slate-500 border-slate-700';

                                 if (race.place) {
                                     const r = parseInt(race.place.replace(/\D/g, ''));
                                     if (!isNaN(r)) {
                                         rank = r;
                                         if (r === 1) badgeStyle = 'bg-yellow-500 text-slate-900 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]';
                                         else if (r === 2) badgeStyle = 'bg-slate-300 text-slate-900 border-slate-200 shadow-[0_0_10px_rgba(203,213,225,0.3)]';
                                         else if (r === 3) badgeStyle = 'bg-orange-400 text-slate-900 border-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.3)]';
                                         else if (r <= 10) badgeStyle = 'bg-blue-600 text-white border-blue-500 shadow-lg';
                                         else badgeStyle = 'bg-slate-700 text-slate-300 border-slate-600';
                                     }
                                 }

                                 return (
                                     <div 
                                        key={race.id} 
                                        className="bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-500 transition group relative overflow-hidden cursor-pointer flex"
                                        onClick={() => setSelectedRace(race)}
                                    >
                                         {/* Delete Button */}
                                        <div className="absolute top-2 right-2 z-20">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(race.id); }}
                                                className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-900/50 rounded-full opacity-0 group-hover:opacity-100 transition"
                                                title="Delete Race"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Date Side */}
                                        <div className="bg-slate-900/50 w-20 flex flex-col justify-center items-center border-r border-slate-700 shrink-0">
                                            <span className="text-xs text-slate-500 uppercase font-bold">{new Date(race.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                            <span className="text-2xl font-bold text-white">{new Date(race.date).getDate()}</span>
                                            <span className="text-xs text-slate-600">{new Date(race.date).getFullYear()}</span>
                                        </div>
                                        
                                        {/* Main Content */}
                                        <div className="p-4 flex-1 flex justify-between items-center">
                                            <div className="min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-lg text-white group-hover:text-brand-400 transition truncate">{race.title || race.competition || 'Race'}</h4>
                                                    {race.isPb && <span className="bg-yellow-500 text-slate-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded">PB</span>}
                                                    {race.isSb && <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">SB</span>}
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                                    <div className="flex items-center font-medium text-slate-300">
                                                        <Clock size={12} className="mr-1"/> 
                                                        {formatSecondsToTime(race.duration * 60, true)}
                                                    </div>
                                                    <span className="text-slate-600">|</span>
                                                    <div className="flex items-center">
                                                        <MapPin size={12} className="mr-1"/> 
                                                        {race.distance} km
                                                        {race.route ? ` • ${race.route}` : ''}
                                                    </div>
                                                    {race.eventName && (
                                                        <>
                                                            <span className="text-slate-600">|</span>
                                                            <div className="flex items-center text-slate-500">
                                                                <Flag size={12} className="mr-1"/> 
                                                                {race.eventName}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Large Place Badge on Right */}
                                            {rankDisplay && (
                                                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-sm border-2 ${badgeStyle} shadow-sm`}>
                                                    {rankDisplay}
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 rounded-full bg-red-900/30 text-red-500">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Delete Race?</h3>
                        </div>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                            Are you sure you want to permanently delete this race log? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setDeleteConfirm(null)}
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

export default Races;
