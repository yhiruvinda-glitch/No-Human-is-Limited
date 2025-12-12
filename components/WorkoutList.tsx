import React, { useState, useMemo } from 'react';
import { Workout, WorkoutType, Goal, Course } from '../types';
import { Activity, Search, Timer, CheckCircle2, GitCompare, Trash2, AlertTriangle, Heart, Calendar } from 'lucide-react';
import { formatSecondsToTime, formatMetric, getWorkoutSummary } from '../utils/analytics';
import { compareWorkouts } from '../services/geminiService';
import WorkoutDetailModal from './WorkoutDetailModal';

interface WorkoutListProps {
  workouts: Workout[];
  goals: Goal[];
  courses: Course[];
  onDelete: (id: string) => void;
}

const FILTER_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Easy', value: WorkoutType.EASY },
  { label: 'Long', value: WorkoutType.LONG },
  { label: 'Tempo', value: WorkoutType.TEMPO },
  { label: 'Threshold', value: WorkoutType.THRESHOLD },
  { label: 'Intervals', value: WorkoutType.INTERVAL },
  { label: 'Speed', value: WorkoutType.SPEED },
  { label: 'Hills', value: WorkoutType.HILLS },
  // Race removed from history filter
  { label: 'Treadmill', value: WorkoutType.TREADMILL },
  { label: 'Cycling', value: WorkoutType.CYCLE },
  { label: 'X-Train', value: WorkoutType.CROSS_TRAINING },
];

const WorkoutList: React.FC<WorkoutListProps> = ({ workouts, goals, courses, onDelete }) => {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  
  // Selection & Modal State
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Comparison State
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [analyzingComparison, setAnalyzingComparison] = useState(false);

  // Filter out Races from the main list (they are in Races tab now)
  const historyWorkouts = useMemo(() => {
      return workouts.filter(w => w.type !== WorkoutType.RACE);
  }, [workouts]);

  // --- Dynamic Tab Sorting ---
  const sortedTabs = useMemo(() => {
      // 1. Calculate counts for each type
      const counts: Record<string, number> = {};
      historyWorkouts.forEach(w => {
          counts[w.type] = (counts[w.type] || 0) + 1;
      });

      // 2. Sort tabs: ALL first, then by count descending
      return [...FILTER_TABS].sort((a, b) => {
          if (a.value === 'ALL') return -1;
          if (b.value === 'ALL') return 1;
          
          const countA = counts[a.value] || 0;
          const countB = counts[b.value] || 0;
          
          return countB - countA;
      });
  }, [historyWorkouts]);

  const filteredWorkouts = historyWorkouts
    .filter(w => filter === 'ALL' || w.type === filter)
    .filter(w => w.notes.toLowerCase().includes(search.toLowerCase()) || w.type.toLowerCase().includes(search.toLowerCase()) || (w.title && w.title.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
      let dist = 0;
      let dur = 0; // minutes
      let durForPace = 0; // minutes (for pace calc only)
      let trackDist = 0; // km
      let trackDur = 0; // minutes (for lap calc only)

      const count = filteredWorkouts.length;

      filteredWorkouts.forEach(w => {
          dist += w.distance;
          dur += w.duration;

          if (w.distance > 0) {
              durForPace += w.duration;
          }

          // Track stats (for laps)
          // Specifically requested types for lap counting in "All" view + relevant tabs
          // Added WorkoutType.EASY to include easy runs in lap counts if on track
          const isQualityTrackType = [
              WorkoutType.TEMPO, 
              WorkoutType.THRESHOLD, 
              WorkoutType.INTERVAL, 
              WorkoutType.SPEED, 
              WorkoutType.RACE,
              WorkoutType.EASY
          ].includes(w.type);
          
          if ((w.surface === 'Track' || w.surface === 'Indoor') && isQualityTrackType) {
              trackDist += w.distance;
              if (w.distance > 0) {
                  trackDur += w.duration;
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
      };
  }, [filteredWorkouts]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
        setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
        if (selectedIds.length < 2) {
            setSelectedIds(prev => [...prev, id]);
        }
    }
  };

  const runComparison = async () => {
      if (selectedIds.length !== 2) return;
      setAnalyzingComparison(true);
      const w1 = workouts.find(w => w.id === selectedIds[0]);
      const w2 = workouts.find(w => w.id === selectedIds[1]);
      if (w1 && w2) {
          const result = await compareWorkouts(w1, w2);
          setComparisonResult(result);
      }
      setAnalyzingComparison(false);
  };

  const confirmDelete = () => {
      if (deleteConfirm) {
          onDelete(deleteConfirm);
          setDeleteConfirm(null);
      }
  };

  const renderSummaryStats = () => {
      const MetricCard = ({ label, value, unit }: { label: string, value: string | number, unit?: string }) => (
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center min-w-[100px] flex-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</span>
              <span className="text-xl font-bold text-white mt-1">
                  {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
              </span>
          </div>
      );

      return (
          <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2">
               <MetricCard label="Total Dist" value={stats.dist.toFixed(1)} unit="km" />
               <MetricCard label="Duration" value={Math.floor(stats.dur / 60) + 'h ' + Math.round(stats.dur % 60) + 'm'} />
               <MetricCard label="Avg Pace" value={stats.avgPace} unit="/km" />
               {stats.trackLaps > 0 && (
                 <MetricCard label="Total Laps" value={Number(stats.trackLaps.toFixed(1))} />
               )}
               <MetricCard label="Activities" value={stats.count} />
          </div>
      );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      
      {selectedWorkout && (
          <WorkoutDetailModal 
            workout={selectedWorkout} 
            goals={goals} 
            onClose={() => setSelectedWorkout(null)} 
          />
      )}

      {/* Comparison Overlay */}
      {compareMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 z-40 animate-in slide-in-from-bottom">
              <div className="max-w-4xl mx-auto flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                      <div className="bg-brand-600 text-white px-3 py-1 rounded text-xs font-bold uppercase">Compare Mode</div>
                      <span className="text-slate-400 text-sm">{selectedIds.length} of 2 selected</span>
                  </div>
                  <div className="flex space-x-3">
                      <button onClick={() => {setCompareMode(false); setSelectedIds([]); setComparisonResult(null);}} className="text-slate-400 hover:text-white text-sm">Cancel</button>
                      <button 
                        disabled={selectedIds.length !== 2}
                        onClick={runComparison}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-4 py-2 rounded text-sm font-bold transition flex items-center"
                      >
                         {analyzingComparison ? 'Analyzing...' : <><GitCompare size={16} className="mr-2"/> Compare</>}
                      </button>
                  </div>
              </div>
              {comparisonResult && (
                  <div className="max-w-4xl mx-auto mt-4 bg-slate-800 p-4 rounded border border-slate-700">
                      <h4 className="font-bold text-white mb-2">AI Comparison</h4>
                      <p className="text-slate-300 text-sm leading-relaxed">{comparisonResult}</p>
                  </div>
              )}
          </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Activity className="mr-3 text-brand-500" size={32}/> Activities
          </h2>
          <p className="text-slate-400">Review, analyze, and compare your past sessions.</p>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={() => setCompareMode(!compareMode)}
                className={`p-2 rounded-lg transition border ${compareMode ? 'bg-brand-900/20 border-brand-500 text-brand-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                title="Compare Workouts"
            >
                <GitCompare size={20} />
            </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search notes, distances..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-brand-500 transition"
          />
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {sortedTabs.map(tab => (
            <button 
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center ${
                filter === tab.value
                ? 'bg-slate-700 text-white shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* SUMMARY STATS (Dynamic based on Filter) */}
      {renderSummaryStats()}

      {/* List */}
      <div className="space-y-4">
        {filteredWorkouts.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                <p className="text-slate-500">No workouts found.</p>
            </div>
        ) : (
            filteredWorkouts.map((workout) => {
                const isSelected = selectedIds.includes(workout.id);
                // Check if this workout is a Course Record
                const isCr = courses.some(c => c.bestEffort?.workoutId === workout.id);
                
                // Structured Workout Summary Logic
                const isStructured = [WorkoutType.INTERVAL, WorkoutType.SPEED, WorkoutType.THRESHOLD, WorkoutType.HILLS].includes(workout.type);
                const hasIntervalData = workout.intervals && workout.intervals.length > 0;
                const summary = isStructured && hasIntervalData ? getWorkoutSummary(workout) : null;

                return (
                    <div 
                        key={workout.id} 
                        className={`bg-slate-800 rounded-xl border transition-all hover:border-slate-600 group relative ${isSelected ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-800'}`}
                    >
                        {/* Delete Button */}
                        {!compareMode && (
                            <div className="absolute top-4 right-4 z-20">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(workout.id); }}
                                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-900/50 rounded-full opacity-0 group-hover:opacity-100 transition"
                                    title="Delete Log"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}

                        {/* Comparison Checkbox */}
                        {compareMode && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
                                <button 
                                    onClick={() => toggleSelection(workout.id)}
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'bg-slate-900 border-slate-500'}`}
                                >
                                    {isSelected && <CheckCircle2 size={14} />}
                                </button>
                            </div>
                        )}

                        <div className={`p-6 cursor-pointer ${compareMode ? 'pl-14' : ''}`} onClick={() => !compareMode && setSelectedWorkout(workout)}>
                            <div className="flex items-start gap-4">
                                {/* Avatar/Type Icon */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 border-slate-700 shadow-sm ${
                                    workout.type === WorkoutType.INTERVAL ? 'bg-red-500/10 text-red-500' :
                                    workout.type === WorkoutType.TEMPO ? 'bg-blue-500/10 text-blue-500' :
                                    workout.type === WorkoutType.LONG ? 'bg-green-500/10 text-green-500' :
                                    'bg-brand-500/10 text-brand-500'
                                }`}>
                                    <Activity size={24} />
                                </div>

                                <div className="flex-1 min-w-0">
                                     {/* Header */}
                                     <div className="flex flex-col mb-3">
                                        <div className="text-xs text-slate-400 font-medium flex items-center mb-0.5">
                                            <span>Me</span>
                                            <span className="mx-1">•</span>
                                            <span className="flex items-center"><Calendar size={10} className="mr-1"/> {new Date(workout.date).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="font-bold text-white text-xl hover:text-brand-500 transition truncate pr-8">{workout.title || workout.type}</h3>
                                        
                                        {/* Structured Workout Summary */}
                                        {summary && (
                                            <div className="mt-1">
                                                <span className="text-sm text-brand-400 font-mono font-bold bg-brand-900/10 px-2 py-1 rounded border border-brand-500/20 inline-block">
                                                    {summary}
                                                </span>
                                            </div>
                                        )}
                                     </div>

                                     {/* Description */}
                                     {workout.notes && (
                                         <p className="text-sm text-slate-400 mb-4 line-clamp-2">{workout.notes}</p>
                                     )}

                                     {/* Metrics Row */}
                                     <div className="flex flex-wrap items-center gap-6 text-slate-300">
                                         <div>
                                             <div className="text-[10px] uppercase text-slate-500 font-bold">Distance</div>
                                             <div className="text-lg font-mono">{workout.distance} <span className="text-xs text-slate-500">km</span></div>
                                         </div>
                                         <div>
                                             <div className="text-[10px] uppercase text-slate-500 font-bold">Pace</div>
                                             <div className="text-lg font-mono">{formatMetric(workout.distance, workout.duration, workout.type)} <span className="text-xs text-slate-500">/km</span></div>
                                         </div>
                                         <div>
                                             <div className="text-[10px] uppercase text-slate-500 font-bold">Time</div>
                                             <div className="text-lg font-mono">{formatSecondsToTime(workout.duration * 60)}</div>
                                         </div>
                                         {workout.avgHr && (
                                            <div className="hidden sm:block">
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">HR</div>
                                                <div className="text-lg font-mono flex items-center text-rose-400"><Heart size={12} className="mr-1"/>{workout.avgHr}</div>
                                            </div>
                                         )}
                                     </div>

                                     {/* Badges */}
                                     <div className="flex gap-2 mt-4">
                                         {isCr && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                                                Course Record
                                            </span>
                                         )}
                                         {workout.isPb && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/20 text-brand-500 border border-brand-500/30">
                                                Personal Best
                                            </span>
                                         )}
                                         {workout.isSb && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 border border-red-500/30">
                                                Season Best
                                            </span>
                                         )}
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center space-x-3 mb-4">
                      <div className="p-3 rounded-full bg-red-900/30 text-red-500">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white">Delete Workout?</h3>
                  </div>
                  
                  <p className="text-slate-400 mb-6 leading-relaxed">
                      Are you sure you want to permanently delete this log? This action cannot be undone.
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

export default WorkoutList;