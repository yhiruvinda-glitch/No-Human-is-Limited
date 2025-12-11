import React, { useState, useMemo } from 'react';
import { Season, PersonalBest, Workout, Goal, WorkoutType } from '../types';
import { Archive, Play, Trophy, Calendar, ChevronDown, ChevronUp, Flame, Target, List, History, Medal, Flag, Zap, Clock, MapPin, Heart, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { calculateSeasonBests, getWorkoutSummary, formatMetric, formatSecondsToTime } from '../utils/analytics';
import WorkoutDetailModal from './WorkoutDetailModal';

interface SeasonsProps {
    currentSeason: Season | null;
    pastSeasons: Season[];
    onStartSeason: (name: string, startDate: string, startPbs: PersonalBest[], targetPbs: PersonalBest[]) => void;
    onEndSeason: () => void;
    onUpdateSeason: (season: Season) => void;
    workouts: Workout[]; // Needed to calculate end-of-season stats
    goals: Goal[]; // Needed for workout detail analysis
}

const DISTANCES = ['1500m', '3000m', '5000m', '10K', 'Half Marathon'];

const FILTER_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Easy', value: WorkoutType.EASY },
  { label: 'Long', value: WorkoutType.LONG },
  { label: 'Tempo', value: WorkoutType.TEMPO },
  { label: 'Threshold', value: WorkoutType.THRESHOLD },
  { label: 'Intervals', value: WorkoutType.INTERVAL },
  { label: 'Speed', value: WorkoutType.SPEED },
  { label: 'Hills', value: WorkoutType.HILLS },
  { label: 'Race', value: WorkoutType.RACE },
  { label: 'Treadmill', value: WorkoutType.TREADMILL },
  { label: 'Cycling', value: WorkoutType.CYCLE },
  { label: 'X-Train', value: WorkoutType.CROSS_TRAINING },
];

const Seasons: React.FC<SeasonsProps> = ({ currentSeason, pastSeasons, onStartSeason, onEndSeason, onUpdateSeason, workouts, goals }) => {
    const [isStarting, setIsStarting] = useState(false);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SBS'>('OVERVIEW');
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [filter, setFilter] = useState('ALL');
    
    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editStartPbs, setEditStartPbs] = useState<PersonalBest[]>([]);
    const [editTargetPbs, setEditTargetPbs] = useState<PersonalBest[]>([]);
    
    // Past Season View State
    const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);
    const [pastSeasonView, setPastSeasonView] = useState<'SUMMARY' | 'RACES'>('SUMMARY');

    // Form State
    const [newSeasonName, setNewSeasonName] = useState('');
    const [newSeasonDate, setNewSeasonDate] = useState(new Date().toISOString().split('T')[0]);
    const [startPbs, setStartPbs] = useState<Record<string, string>>({});
    const [targetPbs, setTargetPbs] = useState<Record<string, string>>({});

    // Dynamic SBs for Active Season
    const currentSBs = useMemo(() => {
        if (!currentSeason) return [];
        const seasonWorkouts = workouts.filter(w => new Date(w.date) >= new Date(currentSeason.startDate));
        return calculateSeasonBests(seasonWorkouts);
    }, [currentSeason, workouts]);

    const handleStartClick = () => {
        setIsStarting(true);
        const initialPbs: Record<string, string> = {};
        DISTANCES.forEach(d => initialPbs[d] = '');
        setStartPbs(initialPbs);
        setTargetPbs(initialPbs);
        // Reset date to today
        setNewSeasonDate(new Date().toISOString().split('T')[0]);
    };

    const handleConfirmStart = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newSeasonName || !newSeasonDate) return;

        const sPbs: PersonalBest[] = Object.entries(startPbs)
            .filter(([_, time]) => (time as string).trim() !== '')
            .map(([dist, time]) => ({ distance: dist, time: time as string }));
        
        const tPbs: PersonalBest[] = Object.entries(targetPbs)
            .filter(([_, time]) => (time as string).trim() !== '')
            .map(([dist, time]) => ({ distance: dist, time: time as string }));

        onStartSeason(newSeasonName, newSeasonDate, sPbs, tPbs);
        setIsStarting(false);
        setNewSeasonName('');
    };

    const handleEditClick = () => {
        if (!currentSeason) return;
        setEditStartPbs([...currentSeason.startPbs]);
        setEditTargetPbs([...currentSeason.targetPbs]);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditStartPbs([]);
        setEditTargetPbs([]);
    };

    const handleSaveEdit = () => {
        if (!currentSeason) return;
        const updatedSeason = {
            ...currentSeason,
            startPbs: editStartPbs.filter(pb => pb.distance && pb.time),
            targetPbs: editTargetPbs.filter(pb => pb.distance && pb.time)
        };
        onUpdateSeason(updatedSeason);
        setIsEditing(false);
    };

    const updatePbList = (
        listSetter: React.Dispatch<React.SetStateAction<PersonalBest[]>>,
        index: number, 
        field: keyof PersonalBest, 
        value: string
    ) => {
        listSetter(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const toggleAccordion = (id: string) => {
        if (expandedSeasonId !== id) {
            setFilter('ALL');
            setPastSeasonView('SUMMARY'); // Reset to summary when opening
        }
        setExpandedSeasonId(expandedSeasonId === id ? null : id);
    };

    const handleEndSeasonClick = () => {
        setShowEndConfirm(true);
    };

    const confirmEndSeason = () => {
        onEndSeason();
        setShowEndConfirm(false);
    };

    // Helper to filter workouts for a specific season
    const getSeasonWorkouts = (season: Season) => {
        const start = new Date(season.startDate);
        const end = season.endDate ? new Date(season.endDate) : new Date();
        return workouts.filter(w => {
            const d = new Date(w.date);
            return d >= start && d <= end;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    // Calculate dynamic stats for filtered view
    const calculateStats = (filteredWorkouts: Workout[]) => {
        let dist = 0;
        let dur = 0;
        let durForPace = 0;
        let trackDist = 0;
        let trackDur = 0;
        let raceWins = 0;
        let racePodium = 0;
        let raceTop10 = 0;
        let racePbs = 0;
        const count = filteredWorkouts.length;
  
        filteredWorkouts.forEach(w => {
            dist += w.distance;
            dur += w.duration;
            if (w.distance > 0) {
                durForPace += w.duration;
            }

            if (w.surface === 'Track' || w.surface === 'Indoor') {
                trackDist += w.distance;
                if (w.distance > 0) {
                    trackDur += w.duration;
                }
            }
            if (w.type === WorkoutType.RACE) {
                if (w.isPb) racePbs++;
                if (w.place) {
                    const p = parseInt(w.place.replace(/\D/g, ''));
                    if (!isNaN(p)) {
                        if (p === 1) raceWins++;
                        if (p <= 3) racePodium++;
                        if (p <= 10) raceTop10++;
                    }
                }
            }
        });
  
        const avgPaceSec = dist > 0 ? (durForPace * 60) / dist : 0;
        const trackLaps = (trackDist * 1000) / 400;
        const avgLapSec = trackLaps > 0 ? (trackDur * 60) / trackLaps : 0;
  
        return {
            dist,
            dur,
            count,
            avgPace: formatSecondsToTime(avgPaceSec),
            trackLaps,
            avgLap: formatSecondsToTime(avgLapSec, true),
            raceWins,
            racePodium,
            raceTop10,
            racePbs
        };
    };

    const MetricCard = ({ label, value, unit }: { label: string, value: string | number, unit?: string }) => (
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center min-w-[80px] flex-1 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</span>
            <span className="text-lg font-bold text-white mt-1">
                {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </span>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-8 relative">
            
            {/* Shared Detail Modal */}
            {selectedWorkout && (
                <WorkoutDetailModal 
                    workout={selectedWorkout} 
                    goals={goals} 
                    onClose={() => setSelectedWorkout(null)} 
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center">
                        <Archive className="mr-3 text-brand-500" size={32} /> Season Manager
                    </h2>
                    <p className="text-slate-400">Manage active seasons and view archives of past training cycles.</p>
                </div>
            </div>

            {/* Active Season Card */}
            {currentSeason ? (
                <div className="bg-brand-900/10 border border-brand-500/50 rounded-xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
                    
                    {/* Header */}
                    <div className="p-6 pb-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold bg-brand-500 text-slate-900 px-2 py-0.5 rounded uppercase">Active</span>
                                <span className="text-xs text-brand-300 font-mono">Started {new Date(currentSeason.startDate).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white">{currentSeason.name}</h3>
                        </div>
                        <button 
                            type="button"
                            onClick={handleEndSeasonClick}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition"
                        >
                            End Season
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="px-6 border-b border-brand-500/20 flex space-x-6">
                        <button 
                            onClick={() => setActiveTab('OVERVIEW')}
                            className={`pb-3 text-sm font-bold flex items-center border-b-2 transition ${
                                activeTab === 'OVERVIEW' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Target size={16} className="mr-2" /> Overview & Goals
                        </button>
                        <button 
                             onClick={() => setActiveTab('SBS')}
                             className={`pb-3 text-sm font-bold flex items-center border-b-2 transition ${
                                activeTab === 'SBS' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Flame size={16} className="mr-2" /> Season Bests (SBs)
                            <span className="ml-2 bg-brand-500/20 text-brand-400 text-[10px] px-1.5 py-0.5 rounded-full">{currentSBs.length}</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 relative">
                        {activeTab === 'OVERVIEW' ? (
                            <>
                                {/* Edit Button (Only when not editing) */}
                                {!isEditing && (
                                    <div className="absolute top-6 right-6 z-10">
                                        <button onClick={handleEditClick} className="text-xs flex items-center text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 px-3 py-1.5 rounded transition border border-slate-700">
                                            <Edit2 size={12} className="mr-1"/> Edit Goals
                                        </button>
                                    </div>
                                )}

                                {isEditing ? (
                                    <div className="animate-in fade-in space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Edit Targets */}
                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3 flex items-center">
                                                    <Target size={14} className="mr-1"/> Edit Targets
                                                </h4>
                                                <div className="space-y-2">
                                                    {editTargetPbs.map((pb, i) => (
                                                        <div key={i} className="flex gap-2 items-center">
                                                            <input value={pb.distance} onChange={(e) => updatePbList(setEditTargetPbs, i, 'distance', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-brand-500 outline-none" placeholder="e.g. 5000m"/>
                                                            <input value={pb.time} onChange={(e) => updatePbList(setEditTargetPbs, i, 'time', e.target.value)} className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white font-mono focus:border-brand-500 outline-none" placeholder="15:00"/>
                                                            <button onClick={() => setEditTargetPbs(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"><Trash2 size={14}/></button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => setEditTargetPbs(prev => [...prev, {distance:'', time:''}])} className="text-xs flex items-center text-brand-400 hover:text-brand-300 mt-2 font-medium px-1 py-1"><Plus size={14} className="mr-1"/> Add Target</button>
                                                </div>
                                            </div>
                                            {/* Edit Baseline */}
                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                                    <History size={14} className="mr-1"/> Edit Baseline
                                                </h4>
                                                <div className="space-y-2">
                                                    {editStartPbs.map((pb, i) => (
                                                        <div key={i} className="flex gap-2 items-center">
                                                            <input value={pb.distance} onChange={(e) => updatePbList(setEditStartPbs, i, 'distance', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-slate-500 outline-none" placeholder="e.g. 5000m"/>
                                                            <input value={pb.time} onChange={(e) => updatePbList(setEditStartPbs, i, 'time', e.target.value)} className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white font-mono focus:border-slate-500 outline-none" placeholder="15:30"/>
                                                            <button onClick={() => setEditStartPbs(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"><Trash2 size={14}/></button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => setEditStartPbs(prev => [...prev, {distance:'', time:''}])} className="text-xs flex items-center text-slate-400 hover:text-slate-300 mt-2 font-medium px-1 py-1"><Plus size={14} className="mr-1"/> Add Baseline</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3 border-t border-brand-500/20 pt-4">
                                            <button onClick={handleCancelEdit} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded transition">Cancel</button>
                                            <button onClick={handleSaveEdit} className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded text-sm font-bold shadow-lg shadow-brand-900/20 transition flex items-center">
                                                <Save size={16} className="mr-2"/> Save Changes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Targets</h4>
                                            <div className="space-y-2">
                                                {currentSeason.targetPbs.length === 0 ? <p className="text-sm text-slate-500 italic">No targets set.</p> :
                                                currentSeason.targetPbs.map((target, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                                        <span className="text-sm text-slate-300 font-bold">{target.distance}</span>
                                                        <span className="text-sm font-mono text-brand-400 bg-brand-900/20 px-2 py-0.5 rounded">{target.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Start Baseline</h4>
                                            <div className="space-y-2">
                                                {currentSeason.startPbs.length === 0 ? <p className="text-sm text-slate-500 italic">No starting data.</p> :
                                                currentSeason.startPbs.map((pb, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                                        <span className="text-sm text-slate-400">{pb.distance}</span>
                                                        <span className="text-sm font-mono text-slate-500">{pb.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Current Season Bests</h4>
                                {currentSBs.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-900/30 rounded-lg border border-dashed border-slate-700 text-slate-500">
                                        <Trophy size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No Season Bests detected yet.</p>
                                        <p className="text-xs mt-1">Log races or hard efforts to populate this grid.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {currentSBs.map((sb, idx) => (
                                            <div key={idx} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 hover:border-brand-500/50 transition group">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center">
                                                    <Flame size={10} className="mr-1 text-brand-500" /> {sb.distance}
                                                </div>
                                                <div className="text-xl font-mono font-bold text-white group-hover:text-brand-400 transition">
                                                    {sb.time}
                                                </div>
                                                {sb.date && (
                                                    <div className="text-xs text-slate-400 mt-2 flex items-center">
                                                        <Calendar size={12} className="mr-1 text-slate-500" />
                                                        {new Date(sb.date).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // No Active Season -> Start Form
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                    {!isStarting ? (
                        <div className="py-8">
                            <Trophy className="mx-auto text-brand-500 mb-4 opacity-50" size={48} />
                            <h3 className="text-xl font-bold text-white mb-2">Ready to start a new block?</h3>
                            <p className="text-slate-400 mb-6 max-w-md mx-auto">Starting a season helps you track Season Bests (SBs) and specific goals for this training cycle.</p>
                            <button 
                                onClick={handleStartClick}
                                className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-brand-900/20 transition flex items-center mx-auto"
                            >
                                <Play size={20} className="mr-2 fill-current" /> Start Season
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleConfirmStart} className="text-left max-w-lg mx-auto space-y-6">
                            <h3 className="text-xl font-bold text-white mb-4">New Season Setup</h3>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Season Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Winter Base 2024" 
                                        value={newSeasonName} 
                                        onChange={(e) => setNewSeasonName(e.target.value)} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white outline-none focus:border-brand-500" 
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={newSeasonDate} 
                                        onChange={(e) => setNewSeasonDate(e.target.value)} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white outline-none focus:border-brand-500" 
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700 pb-1">Current PBs</h4>
                                    <div className="space-y-2">
                                        {DISTANCES.map(d => (
                                            <div key={d}>
                                                <label className="text-[10px] text-slate-500 uppercase">{d}</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="mm:ss" 
                                                    value={startPbs[d] || ''}
                                                    onChange={e => setStartPbs({...startPbs, [d]: e.target.value})}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-brand-400 mb-3 border-b border-slate-700 pb-1">Season Targets</h4>
                                     <div className="space-y-2">
                                        {DISTANCES.map(d => (
                                            <div key={d}>
                                                <label className="text-[10px] text-slate-500 uppercase">{d}</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="mm:ss" 
                                                    value={targetPbs[d] || ''}
                                                    onChange={e => setTargetPbs({...targetPbs, [d]: e.target.value})}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-brand-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsStarting(false)} className="flex-1 py-2 text-slate-400 hover:bg-slate-900 rounded transition">Cancel</button>
                                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 rounded transition">Confirm Start</button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Past Seasons Archive */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-300 flex items-center border-b border-slate-800 pb-2">
                    <Archive className="mr-2" size={20} /> Past Seasons
                </h3>
                {pastSeasons.length === 0 ? (
                    <p className="text-slate-500 italic">No archived seasons yet.</p>
                ) : (
                    pastSeasons.map(season => {
                        const seasonLogs = getSeasonWorkouts(season);
                        const filteredLogs = seasonLogs.filter(w => filter === 'ALL' || w.type === filter);
                        
                        // Calculate metrics for filtering
                        const stats = calculateStats(filteredLogs);

                        // --- Dynamic Filter Tabs for Season Archive ---
                        const sortedSeasonTabs = (() => {
                            const counts: Record<string, number> = {};
                            seasonLogs.forEach(w => {
                                counts[w.type] = (counts[w.type] || 0) + 1;
                            });

                            return [...FILTER_TABS].sort((a, b) => {
                                if (a.value === 'ALL') return -1;
                                if (b.value === 'ALL') return 1;
                                const countA = counts[a.value] || 0;
                                const countB = counts[b.value] || 0;
                                return countB - countA;
                            });
                        })();

                        // Race Stats for RACES view
                        const raceStats = (() => {
                            let wins = 0;
                            let podiums = 0;
                            let top10 = 0;
                            let pbs = 0;
                            const races = seasonLogs.filter(w => w.type === WorkoutType.RACE);
                            races.forEach(r => {
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
                            return { wins, podiums, top10, pbs, count: races.length, races };
                        })();

                        return (
                        <div key={season.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                            <button 
                                onClick={() => toggleAccordion(season.id)}
                                className="w-full p-4 flex justify-between items-center hover:bg-slate-700/50 transition"
                            >
                                <div className="text-left">
                                    <h4 className="text-lg font-bold text-white">{season.name}</h4>
                                    <div className="text-xs text-slate-400 flex gap-2">
                                        <span>{new Date(season.startDate).toLocaleDateString()}</span>
                                        <span>-</span>
                                        <span>{season.endDate ? new Date(season.endDate).toLocaleDateString() : 'Unknown'}</span>
                                    </div>
                                </div>
                                {expandedSeasonId === season.id ? <ChevronUp className="text-slate-500"/> : <ChevronDown className="text-slate-500"/>}
                            </button>
                            
                            {expandedSeasonId === season.id && (
                                <div className="bg-slate-900/50 border-t border-slate-700 animate-in slide-in-from-top-2">
                                    
                                    {/* Sub-Tabs for Past Season */}
                                    <div className="flex border-b border-slate-700">
                                        <button 
                                            onClick={() => setPastSeasonView('SUMMARY')}
                                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${pastSeasonView === 'SUMMARY' ? 'bg-slate-800 text-white border-b-2 border-brand-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                                        >
                                            Season Summary
                                        </button>
                                        <button 
                                            onClick={() => setPastSeasonView('RACES')}
                                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${pastSeasonView === 'RACES' ? 'bg-slate-800 text-white border-b-2 border-yellow-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                                        >
                                            Race Results
                                        </button>
                                    </div>

                                    <div className="p-4">
                                        {pastSeasonView === 'SUMMARY' ? (
                                            <>
                                            {/* 1. SBs & PBs Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                {/* Starting PBs */}
                                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                                        <History size={12} className="mr-1" /> Starting PBs
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {season.startPbs && season.startPbs.length > 0 ? (
                                                            season.startPbs.map((pb, i) => (
                                                                <div key={i} className="flex justify-between text-sm border-b border-slate-700/50 pb-1">
                                                                    <span className="text-slate-300">{pb.distance}</span>
                                                                    <span className="font-mono text-slate-400">{pb.time}</span>
                                                                </div>
                                                            ))
                                                        ) : <span className="text-xs text-slate-500">No data.</span>}
                                                    </div>
                                                </div>

                                                {/* Season Bests */}
                                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                    <h5 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3 flex items-center">
                                                        <Flame size={12} className="mr-1" /> Season Bests
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {season.seasonBests && season.seasonBests.length > 0 ? (
                                                            season.seasonBests.map((sb, i) => (
                                                                <div key={i} className="flex justify-between text-sm border-b border-slate-700/50 pb-1">
                                                                    <span className="text-slate-300">{sb.distance}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-white">{sb.time}</span>
                                                                        {sb.date && (
                                                                            <span className="text-xs text-slate-500">
                                                                                ({new Date(sb.date).getFullYear()})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : <span className="text-xs text-slate-500">No SBs recorded.</span>}
                                                    </div>
                                                </div>

                                                {/* End of Season PBs */}
                                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center">
                                                        <Trophy size={12} className="mr-1" /> End PBs
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {season.endPbs && season.endPbs.length > 0 ? (
                                                            season.endPbs.map((pb, i) => (
                                                                <div key={i} className="flex justify-between text-sm border-b border-slate-700/50 pb-1">
                                                                    <span className="text-slate-300">{pb.distance}</span>
                                                                    <span className="font-mono text-white">{pb.time}</span>
                                                                </div>
                                                            ))
                                                        ) : <span className="text-xs text-slate-500">No data.</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. Log Header & Filters */}
                                            <div className="border-t border-slate-700 pt-6">
                                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center">
                                                    <List size={14} className="mr-2" /> Season Log
                                                </h5>
                                                
                                                {/* Filter Toggles */}
                                                <div className="flex space-x-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
                                                    {sortedSeasonTabs.map(tab => (
                                                        <button 
                                                        key={tab.value}
                                                        onClick={() => setFilter(tab.value)}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition ${
                                                            filter === tab.value
                                                            ? 'bg-brand-600 text-white shadow-md' 
                                                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                                        }`}
                                                        >
                                                        {tab.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Dynamic Stats Cards */}
                                                <div className="flex flex-wrap gap-3 mb-6 animate-in fade-in">
                                                    {filter === 'ALL' && (
                                                        <>
                                                            <MetricCard label="Total Dist" value={stats.dist.toFixed(1)} unit="km" />
                                                            <MetricCard label="Duration" value={Math.floor(stats.dur / 60) + 'h ' + Math.round(stats.dur % 60) + 'm'} />
                                                            <MetricCard label="Avg Pace" value={stats.avgPace} unit="/km" />
                                                            <MetricCard label="Track Laps" value={Math.floor(stats.trackLaps)} />
                                                            <MetricCard label="Activities" value={stats.count} />
                                                        </>
                                                    )}
                                                    {(filter === WorkoutType.EASY || filter === WorkoutType.LONG) && (
                                                        <>
                                                            <MetricCard label="Total Dist" value={stats.dist.toFixed(1)} unit="km" />
                                                            <MetricCard label="Duration" value={Math.floor(stats.dur / 60) + 'h ' + Math.round(stats.dur % 60) + 'm'} />
                                                            <MetricCard label="Avg Pace" value={stats.avgPace} unit="/km" />
                                                            <MetricCard label="Activities" value={stats.count} />
                                                        </>
                                                    )}
                                                    {(filter === WorkoutType.INTERVAL || filter === WorkoutType.THRESHOLD || filter === WorkoutType.SPEED) && (
                                                        <>
                                                            <MetricCard label="Total Dist" value={stats.dist.toFixed(1)} unit="km" />
                                                            <MetricCard label="Duration" value={Math.floor(stats.dur / 60) + 'h ' + Math.round(stats.dur % 60) + 'm'} />
                                                            <MetricCard label="Avg Pace" value={stats.avgPace} unit="/km" />
                                                            <MetricCard label="Track Laps" value={Math.floor(stats.trackLaps)} />
                                                            <MetricCard label="Avg Lap" value={stats.avgLap} />
                                                            <MetricCard label="Sessions" value={stats.count} />
                                                        </>
                                                    )}
                                                    {filter === WorkoutType.RACE && (
                                                        <>
                                                            <MetricCard label="Races" value={stats.count} />
                                                            <MetricCard label="Wins" value={stats.raceWins} />
                                                            <MetricCard label="Podiums" value={stats.racePodium} />
                                                            <MetricCard label="Top 10" value={stats.raceTop10} />
                                                            <MetricCard label="PBs" value={stats.racePbs} />
                                                        </>
                                                    )}
                                                    {filter === WorkoutType.HILLS && (
                                                        <>
                                                            <MetricCard label="Total Dist" value={stats.dist.toFixed(1)} unit="km" />
                                                            <MetricCard label="Duration" value={Math.floor(stats.dur / 60) + 'h ' + Math.round(stats.dur % 60) + 'm'} />
                                                            <MetricCard label="Avg Pace" value={stats.avgPace} unit="/km" />
                                                            <MetricCard label="Sessions" value={stats.count} />
                                                        </>
                                                    )}
                                                    {(filter === WorkoutType.TREADMILL || filter === WorkoutType.CYCLE) && (
                                                        <>
                                                            <MetricCard label="Activities" value={stats.count} />
                                                            <MetricCard label="Duration" value={Math.floor(stats.dur / 60) + 'h ' + Math.round(stats.dur % 60) + 'm'} />
                                                            <MetricCard label="Distance" value={stats.dist.toFixed(1)} unit="km" />
                                                        </>
                                                    )}
                                                    {/* Fallback for Tempo etc */}
                                                    {![WorkoutType.EASY, WorkoutType.LONG, WorkoutType.INTERVAL, WorkoutType.THRESHOLD, WorkoutType.SPEED, WorkoutType.RACE, WorkoutType.HILLS, WorkoutType.TREADMILL, WorkoutType.CYCLE, 'ALL'].includes(filter as any) && (
                                                        <>
                                                            <MetricCard label="Total Dist" value={stats.dist.toFixed(1)} unit="km" />
                                                            <MetricCard label="Duration" value={Math.floor(stats.dur / 60) + 'h ' + Math.round(stats.dur % 60) + 'm'} />
                                                            <MetricCard label="Avg Pace" value={stats.avgPace} unit="/km" />
                                                            <MetricCard label="Activities" value={stats.count} />
                                                        </>
                                                    )}
                                                </div>

                                                {/* 3. The List */}
                                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                                    {filteredLogs.length === 0 ? (
                                                        <div className="text-center py-8 text-slate-500 italic border border-dashed border-slate-700 rounded-lg">
                                                            No workouts of this type found in this season.
                                                        </div>
                                                    ) : (
                                                        filteredLogs.map(log => {
                                                            const isStructured = [WorkoutType.INTERVAL, WorkoutType.SPEED, WorkoutType.THRESHOLD, WorkoutType.HILLS].includes(log.type);
                                                            const hasIntervalData = log.intervals && log.intervals.length > 0;
                                                            const summary = isStructured && hasIntervalData ? getWorkoutSummary(log) : null;

                                                            return (
                                                            <div 
                                                                key={log.id} 
                                                                onClick={() => setSelectedWorkout(log)}
                                                                className="bg-slate-800 hover:bg-slate-700/80 p-4 rounded-lg border border-slate-700 cursor-pointer flex justify-between items-start group transition"
                                                            >
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                         <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                                                                            log.type === WorkoutType.RACE ? 'bg-yellow-900/30 text-yellow-500 border-yellow-500/30' :
                                                                            log.type === WorkoutType.INTERVAL || log.type === WorkoutType.SPEED ? 'bg-red-900/30 text-red-400 border-red-500/30' :
                                                                            'bg-blue-900/30 text-blue-400 border-blue-500/30'
                                                                        }`}>
                                                                            {log.type}
                                                                        </span>
                                                                         <span className="text-xs text-slate-500">{new Date(log.date).toLocaleDateString()}</span>
                                                                    </div>

                                                                    <div className="font-bold text-white text-sm group-hover:text-brand-400 transition truncate">
                                                                         {log.title || log.type}
                                                                    </div>

                                                                    {summary && (
                                                                        <div className="mt-1.5">
                                                                            <span className="text-xs text-brand-400 font-mono font-bold bg-brand-900/10 px-2 py-0.5 rounded border border-brand-500/20 inline-block truncate max-w-full">
                                                                                {summary}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {!summary && log.notes && (
                                                                         <p className="text-xs text-slate-500 mt-1 line-clamp-1">{log.notes}</p>
                                                                    )}
                                                                </div>

                                                                <div className="text-right shrink-0">
                                                                    <div className="text-sm font-mono text-white">{formatMetric(log.distance, log.duration, log.type)}</div>
                                                                    <div className="text-[10px] text-slate-500 mt-0.5">{log.distance}km • {formatSecondsToTime(log.duration * 60)}</div>
                                                                    {log.avgHr && (
                                                                        <div className="flex items-center justify-end text-[10px] text-rose-400 mt-1">
                                                                             <Heart size={10} className="mr-1"/> {log.avgHr}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )})
                                                    )}
                                                </div>
                                            </div>
                                            </>
                                        ) : (
                                            /* RACES VIEW */
                                            <div className="animate-in fade-in slide-in-from-right-2">
                                                {/* Race Stats Summary */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                                                        <div className="flex items-center text-xs text-yellow-500 font-bold uppercase mb-1">
                                                            <Trophy size={12} className="mr-1" /> Wins
                                                        </div>
                                                        <div className="text-xl font-bold text-white">{raceStats.wins}</div>
                                                    </div>
                                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                                                        <div className="flex items-center text-xs text-slate-300 font-bold uppercase mb-1">
                                                            <Medal size={12} className="mr-1" /> Podiums
                                                        </div>
                                                        <div className="text-xl font-bold text-white">{raceStats.podiums}</div>
                                                    </div>
                                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                                                        <div className="flex items-center text-blue-400 font-bold uppercase mb-1">
                                                            <Flag size={12} className="mr-1" /> Top 10
                                                        </div>
                                                        <div className="text-xl font-bold text-white">{raceStats.top10}</div>
                                                    </div>
                                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                                                        <div className="flex items-center text-xs text-brand-400 font-bold uppercase mb-1">
                                                            <Zap size={12} className="mr-1" /> PBs
                                                        </div>
                                                        <div className="text-xl font-bold text-white">{raceStats.pbs}</div>
                                                    </div>
                                                </div>

                                                {/* Race List */}
                                                {raceStats.count === 0 ? (
                                                     <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center">
                                                         <p className="text-slate-500">No races found in this season.</p>
                                                     </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {raceStats.races.map(race => {
                                                            let rankDisplay = race.place || '';
                                                            let badgeStyle = 'bg-slate-800 text-slate-500 border-slate-700';

                                                            if (race.place) {
                                                                const r = parseInt(race.place.replace(/\D/g, ''));
                                                                if (!isNaN(r)) {
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
                                                                    onClick={() => setSelectedWorkout(race)}
                                                                >
                                                                    {/* Date Side */}
                                                                    <div className="bg-slate-900/50 w-20 flex flex-col justify-center items-center border-r border-slate-700 shrink-0">
                                                                        <span className="text-xs text-slate-500 uppercase font-bold">{new Date(race.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                                        <span className="text-2xl font-bold text-white">{new Date(race.date).getDate()}</span>
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
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )})
                )}
            </div>

            {/* Custom End Season Confirmation Modal */}
            {showEndConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 rounded-full bg-brand-900/30 text-brand-500">
                                <Archive size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">End Season?</h3>
                        </div>
                        
                        <p className="text-slate-400 mb-6 leading-relaxed">
                            Are you sure you want to end <span className="text-white font-bold">{currentSeason?.name}</span>? 
                            This will archive all training data and snapshot your PBs. You can view them in "Past Seasons".
                        </p>
                        
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setShowEndConfirm(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmEndSeason}
                                className="px-6 py-2 rounded-lg font-bold text-white shadow-lg transition bg-brand-600 hover:bg-brand-500 shadow-brand-900/20"
                            >
                                Confirm Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Seasons;