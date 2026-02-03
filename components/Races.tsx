
import React, { useState, useMemo } from 'react';
import { Workout, Goal, WorkoutType } from '../types';
import { Trophy, Calendar, MapPin, Flag, Plus, Trash2, Clock, Timer, Medal, Zap, ChevronRight, Target } from 'lucide-react';
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
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            {selectedRace && (
                <WorkoutDetailModal 
                    workout={selectedRace} 
                    goals={goals} 
                    onClose={() => setSelectedRace(null)} 
                />
            )}

            <div className="flex justify-between items-end border-b border-slate-800 pb-6">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter text-white flex items-center">
                        <Trophy className="mr-4 text-brand-500" size={40}/> RACE CENTER
                    </h2>
                    <p className="text-slate-400 mt-2 font-medium">Precision racing history and target event management.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Past Races Column (Primary View - Left) */}
                <div className="lg:col-span-2 space-y-6">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <History className="mr-2 text-slate-400" size={20} /> Race History
                        </h3>
                        <span className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                            {pastRaces.length} Completed
                        </span>
                     </div>
                     
                     {/* Stats Strip */}
                     {pastRaces.length > 0 && (
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                             <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center group hover:border-yellow-500/50 transition">
                                 <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-yellow-500 transition">
                                     <Trophy size={12} className="mr-1.5" /> Wins
                                 </div>
                                 <div className="text-2xl font-black text-white">{stats.wins}</div>
                             </div>
                             <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center group hover:border-slate-300/50 transition">
                                 <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-slate-300 transition">
                                     <Medal size={12} className="mr-1.5" /> Podiums
                                 </div>
                                 <div className="text-2xl font-black text-white">{stats.podiums}</div>
                             </div>
                             <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center group hover:border-blue-400/50 transition">
                                 <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-blue-400 transition">
                                     <Flag size={12} className="mr-1.5" /> Top 10
                                 </div>
                                 <div className="text-2xl font-black text-white">{stats.top10}</div>
                             </div>
                             <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center group hover:border-brand-500/50 transition">
                                 <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-brand-500 transition">
                                     <Zap size={12} className="mr-1.5" /> PBs
                                 </div>
                                 <div className="text-2xl font-black text-white">{stats.pbs}</div>
                             </div>
                         </div>
                     )}

                     {pastRaces.length === 0 ? (
                         <div className="bg-slate-900/50 p-12 rounded-2xl border-2 border-dashed border-slate-800 text-center">
                             <Trophy size={48} className="mx-auto text-slate-700 mb-4 opacity-20"/>
                             <p className="text-slate-500 font-medium italic">No race results found in your training log.</p>
                             <p className="text-xs text-slate-600 mt-2">Log a workout as "Race" to build your performance profile.</p>
                         </div>
                     ) : (
                         <div className="space-y-4">
                             {pastRaces.map(race => {
                                 let badgeStyle = 'bg-slate-900 text-slate-500 border-slate-800';
                                 if (race.place) {
                                     const r = parseInt(race.place.replace(/\D/g, ''));
                                     if (!isNaN(r)) {
                                         if (r === 1) badgeStyle = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 ring-1 ring-yellow-500/20';
                                         else if (r === 2) badgeStyle = 'bg-slate-400/10 text-slate-300 border-slate-400/30';
                                         else if (r === 3) badgeStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
                                         else if (r <= 10) badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                                     }
                                 }

                                 return (
                                     <div 
                                        key={race.id} 
                                        className="bg-slate-800/80 rounded-2xl border border-slate-700/50 hover:border-slate-500 hover:bg-slate-800 transition group relative overflow-hidden cursor-pointer flex"
                                        onClick={() => setSelectedRace(race)}
                                    >
                                        <div className="bg-slate-900/40 w-24 flex flex-col justify-center items-center border-r border-slate-700/50 shrink-0">
                                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">{new Date(race.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                            <span className="text-3xl font-black text-white leading-none mb-1">{new Date(race.date).getDate()}</span>
                                            <span className="text-[10px] font-mono text-slate-600">{new Date(race.date).getFullYear()}</span>
                                        </div>
                                        
                                        <div className="p-5 flex-1 flex justify-between items-center min-w-0">
                                            <div className="min-w-0 pr-4">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h4 className="font-bold text-lg text-white group-hover:text-brand-500 transition truncate">{race.title || race.competition || 'Race'}</h4>
                                                    <div className="flex gap-1.5">
                                                        {race.isPb && <span className="bg-brand-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-sm tracking-tighter">PB</span>}
                                                        {race.isSb && <span className="bg-red-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-sm tracking-tighter">SB</span>}
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 sm:flex items-center gap-x-6 gap-y-2 text-xs">
                                                    <div className="flex items-center text-slate-300">
                                                        <Clock size={14} className="mr-2 text-slate-500"/> 
                                                        <span className="font-mono font-bold">{formatSecondsToTime(race.duration * 60, true)}</span>
                                                    </div>
                                                    <div className="flex items-center text-slate-400">
                                                        <Target size={14} className="mr-2 text-slate-500"/> 
                                                        {race.distance} km
                                                    </div>
                                                    {race.eventName && (
                                                        <div className="flex items-center text-slate-500 hidden sm:flex">
                                                            <Flag size={14} className="mr-2 text-slate-500"/> 
                                                            {race.eventName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-4 shrink-0">
                                                {race.place && (
                                                    <div className={`px-4 py-1.5 rounded-full font-black text-xs border ${badgeStyle} flex items-center justify-center min-w-[50px]`}>
                                                        {race.place}
                                                    </div>
                                                )}
                                                <ChevronRight size={18} className="text-slate-700 group-hover:text-slate-400 transition" />
                                            </div>
                                        </div>

                                        <div className="absolute top-2 right-2 z-20">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(race.id); }}
                                                className="p-1.5 text-slate-700 hover:text-red-400 hover:bg-slate-900 rounded-full opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                </div>

                {/* Upcoming Races Column (Secondary - Right) */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <Calendar size={20} className="mr-2 text-brand-500" /> Next Up
                        </h3>
                        <button 
                            onClick={() => setIsAdding(true)} 
                            className="text-[10px] font-black uppercase tracking-tighter bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-full flex items-center transition shadow-lg shadow-brand-900/20"
                        >
                            <Plus size={14} className="mr-1"/> Add Event
                        </button>
                    </div>

                    {isAdding && (
                        <div className="bg-slate-800 p-6 rounded-2xl border border-brand-500/30 animate-in fade-in slide-in-from-top-4 shadow-2xl">
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1.5 block">Race Name</label>
                                    <input 
                                        type="text" 
                                        value={newRace.name} 
                                        onChange={e => setNewRace({...newRace, name: e.target.value})} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-brand-500 outline-none transition"
                                        placeholder="e.g. City Marathon"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1.5 block">Date</label>
                                        <input 
                                            type="date" 
                                            value={newRace.deadline} 
                                            onChange={e => setNewRace({...newRace, deadline: e.target.value})} 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white focus:border-brand-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1.5 block">Distance (km)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={newRace.targetDistance || ''} 
                                            onChange={e => setNewRace({...newRace, targetDistance: Number(e.target.value)})} 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white focus:border-brand-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1.5 block">Target Time</label>
                                    <input 
                                        type="text" 
                                        value={newRace.targetTime} 
                                        onChange={e => setNewRace({...newRace, targetTime: e.target.value})} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-brand-500 outline-none font-mono"
                                        placeholder="mm:ss"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 text-xs font-bold text-slate-500 hover:text-white py-2 transition">Cancel</button>
                                    <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase py-2 rounded-lg transition shadow-md">Save</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {upcomingRaces.length === 0 && !isAdding ? (
                        <div className="bg-slate-900/30 p-10 rounded-2xl border-2 border-dashed border-slate-800 text-center">
                            <Flag size={32} className="mx-auto text-slate-700 mb-3"/>
                            <p className="text-sm text-slate-500 font-medium">No target races on the horizon.</p>
                            <button onClick={() => setIsAdding(true)} className="text-xs text-brand-500 font-black uppercase tracking-tighter mt-4 hover:text-brand-400 transition">Plan your next peak</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingRaces.map(race => {
                                const days = calculateDaysOut(race.deadline!);
                                return (
                                    <div key={race.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 relative overflow-hidden group hover:border-brand-500/50 transition">
                                        <div className="absolute -bottom-6 -right-6 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition pointer-events-none">
                                            <Timer size={120} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-white text-lg leading-tight truncate pr-4">{race.name}</h4>
                                                <div className="text-[10px] font-black bg-brand-600/20 text-brand-500 px-3 py-1 rounded-full border border-brand-500/20 shrink-0 uppercase tracking-tighter">
                                                    T-Minus {days}d
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-y-2 text-xs text-slate-400 mb-5">
                                                <div className="flex items-center mr-4">
                                                    <Calendar size={14} className="mr-2 text-slate-600"/>
                                                    {new Date(race.deadline!).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                                                </div>
                                                <div className="flex items-center">
                                                    <Target size={14} className="mr-2 text-slate-600"/>
                                                    {race.targetDistance} km
                                                </div>
                                            </div>

                                            {race.targetTime && race.targetTime !== '00:00' && (
                                                <div className="bg-slate-900/60 rounded-xl p-3 flex justify-between items-center border border-slate-700/50">
                                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">A-Goal</span>
                                                    <span className="text-lg font-mono text-white font-black">{race.targetTime}</span>
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
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="p-4 rounded-full bg-red-900/30 text-red-500">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase">Void Result?</h3>
                        </div>
                        <p className="text-slate-400 mb-8 leading-relaxed font-medium">
                            Are you sure you want to permanently delete this race log? This data point will be removed from your performance timeline forever.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button 
                                onClick={() => setDeleteConfirm(null)}
                                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-white transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-8 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest text-white shadow-lg transition bg-red-600 hover:bg-red-500 shadow-red-900/20"
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

// Simplified icon component for history header
const History: React.FC<{className?: string, size?: number}> = ({className, size}) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M12 7v5l4 2"/>
    </svg>
);

export default Races;
