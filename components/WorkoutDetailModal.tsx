
import React from 'react';
import { Workout, Goal, WorkoutType } from '../types';
import { Calendar, X, Heart, Zap, Timer, BarChart2, MapPin, ShoppingBag, Navigation, Clock as ClockIcon } from 'lucide-react';
import { analyzeIntervalSession, formatSecondsToTime, formatMetric, parseTimeStringToSeconds, calculatePaceFromSpeed } from '../utils/analytics';

interface WorkoutDetailModalProps {
  workout: Workout;
  goals: Goal[];
  onClose: () => void;
}

const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({ workout, goals, onClose }) => {
    const showSplits = workout.type === WorkoutType.TEMPO || workout.type === WorkoutType.RACE;
    const analysis = analyzeIntervalSession(workout, goals);
    const showVar = [WorkoutType.INTERVAL, WorkoutType.SPEED, WorkoutType.THRESHOLD, WorkoutType.HILLS].includes(workout.type);

    const formatTime = (time?: string) => {
        if (!time) return null;
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    };

    const timeStr = formatTime(workout.timeOfDay);

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-950">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">{workout.title || workout.type}</h3>
                        <div className="flex items-center space-x-3 text-sm text-slate-400">
                            <div className="flex items-center">
                                <Calendar size={14} className="mr-1.5" />
                                <span>{new Date(workout.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            {timeStr && (
                                <div className="flex items-center bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300 font-mono text-xs">
                                    <ClockIcon size={12} className="mr-1.5" />
                                    {timeStr}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Distance</div>
                            <div className="text-lg font-bold text-white">{workout.distance} km</div>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Duration</div>
                            <div className="text-lg font-bold text-white">{formatSecondsToTime(workout.duration * 60)}</div>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Avg Pace</div>
                            <div className="text-lg font-bold text-brand-400">{formatMetric(workout.distance, workout.duration, workout.type)}</div>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Load</div>
                            <div className="text-lg font-bold text-blue-400">{workout.trainingLoad || Math.round(workout.duration * workout.rpe)}</div>
                        </div>
                        
                        {(workout.avgHr || workout.maxHr) && (
                            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 col-span-2 md:col-span-2 flex items-center justify-between px-4">
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center"><Heart size={10} className="mr-1"/> Avg HR</div>
                                    <div className="text-lg font-bold text-white">{workout.avgHr || '-'}</div>
                                </div>
                                <div className="w-px h-8 bg-slate-700"></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center justify-end">Max HR <Heart size={10} className="ml-1"/></div>
                                    <div className="text-lg font-bold text-rose-400">{workout.maxHr || '-'}</div>
                                </div>
                            </div>
                        )}
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 col-span-1 md:col-span-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center"><Zap size={10} className="mr-1"/> RPE (1-10)</div>
                                <div className="flex items-center space-x-2 mt-1">
                                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${workout.rpe >= 8 ? 'bg-red-500' : workout.rpe >= 5 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{width: `${workout.rpe * 10}%`}}></div>
                                    </div>
                                    <span className="text-lg font-bold text-white">{workout.rpe}</span>
                                </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center">
                             <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center">
                                <MapPin size={12} className="mr-1" /> Location
                             </div>
                             <div className="text-sm font-bold text-white truncate" title={workout.route}>{workout.route || '-'}</div>
                         </div>
                         <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center">
                             <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center">
                                <ShoppingBag size={12} className="mr-1" /> Gear
                             </div>
                             <div className="text-sm font-bold text-white truncate" title={workout.shoe}>{workout.shoe || '-'}</div>
                         </div>
                         <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center col-span-2 md:col-span-1">
                             <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex items-center">
                                <Navigation size={12} className="mr-1" /> Surface
                             </div>
                             <div className="text-sm font-bold text-white truncate">{workout.surface || '-'}</div>
                         </div>
                    </div>

                    {showSplits && workout.intervals && workout.intervals.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                <Timer size={16} className="mr-2" /> Splits Analysis
                            </h4>
                            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Segment</th>
                                            <th className="px-4 py-3 text-right">Time</th>
                                            <th className="px-4 py-3 text-right">Pace</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {(() => {
                                            let bestPaceSec = Infinity;
                                            let bestSplitIndex = -1;
                                            
                                            workout.intervals.forEach((interval, idx) => {
                                                const dist = Number(interval.distance || 0);
                                                const time = parseTimeStringToSeconds(String(interval.duration));
                                                if (dist >= 1000 && time > 0) {
                                                    const pace = time / dist;
                                                    if (pace < bestPaceSec) {
                                                        bestPaceSec = pace;
                                                        bestSplitIndex = idx;
                                                    }
                                                }
                                            });

                                            if (bestSplitIndex === -1) {
                                                workout.intervals.forEach((interval, idx) => {
                                                    const dist = Number(interval.distance || 0);
                                                    const time = parseTimeStringToSeconds(String(interval.duration));
                                                    if (dist > 100 && time > 0) {
                                                        const pace = time / dist;
                                                        if (pace < bestPaceSec) {
                                                            bestPaceSec = pace;
                                                            bestSplitIndex = idx;
                                                        }
                                                    }
                                                });
                                            }

                                            return workout.intervals.map((interval, idx) => {
                                                const dist = Number(interval.distance || 0);
                                                const time = parseTimeStringToSeconds(String(interval.duration));
                                                const isBest = idx === bestSplitIndex;
                                                
                                                let label = `Split ${idx + 1}`;
                                                if (dist === 1000) {
                                                    const suffix = (idx + 1) === 1 ? 'st' : (idx + 1) === 2 ? 'nd' : (idx + 1) === 3 ? 'rd' : 'th';
                                                    label = `${idx + 1}${suffix} km`;
                                                } else {
                                                    if (idx === workout.intervals!.length - 1) {
                                                        label = `Final ${dist}m`;
                                                    } else {
                                                        label = `${dist}m Split`;
                                                    }
                                                }

                                                return (
                                                    <tr key={idx} className="bg-slate-900">
                                                        <td className="px-4 py-3 font-medium text-white">{label}</td>
                                                        <td className={`px-4 py-3 text-right font-mono ${isBest ? 'text-brand-400 font-bold' : 'text-slate-300'}`}>
                                                            {formatSecondsToTime(time, true)}
                                                            {isBest && <span className="ml-2 text-[10px] bg-brand-900 text-brand-400 px-1 py-0.5 rounded">BEST</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-blue-400">
                                                            {calculatePaceFromSpeed(time, dist)}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!showSplits && analysis && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                <BarChart2 size={16} className="mr-2" /> Session Analysis
                            </h4>
                            
                            {showVar && (
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
                                        <div className="text-xs text-slate-500 uppercase">Quality Vol</div>
                                        <div className="text-xl font-bold text-white">{analysis.qualityVolume.toFixed(1)} <span className="text-xs font-normal text-slate-600">km</span></div>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
                                        <div className="text-xs text-slate-500 uppercase">Consistency</div>
                                        <div className={`text-xl font-bold ${analysis.consistencyLabel === 'Metronomic' ? 'text-brand-400' : analysis.consistencyLabel === 'Variable' ? 'text-orange-400' : 'text-blue-400'}`}>
                                            {analysis.consistencyLabel}
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
                                        <div className="text-xs text-slate-500 uppercase">Score</div>
                                        <div className="text-xl font-bold text-purple-400">{analysis.score}<span className="text-xs text-slate-600">/100</span></div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Group</th>
                                            <th className="px-4 py-3 text-right">Avg</th>
                                            <th className="px-4 py-3 text-right">Best</th>
                                            {showVar && <th className="px-4 py-3 text-right">Var</th>}
                                            <th className="px-4 py-3 text-right">Pace</th>
                                            <th className="px-4 py-3 text-right">Rest</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {analysis.groups.map((group, idx) => (
                                            <React.Fragment key={idx}>
                                            <tr className="bg-slate-900">
                                                <td className="px-4 py-3 font-medium text-white">{group.label} x {group.count}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-300">{formatSecondsToTime(group.avgTime, true)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-brand-400 font-bold relative">
                                                    {formatSecondsToTime(group.bestTime, true)}
                                                    {workout.isSb && (
                                                        <span className="absolute -top-1 -right-2 bg-red-500 text-[8px] text-white px-1 rounded-full">SB</span>
                                                    )}
                                                </td>
                                                {showVar && <td className="px-4 py-3 text-right font-mono text-slate-400">{group.variation.toFixed(1)}%</td>}
                                                <td className="px-4 py-3 text-right font-mono text-blue-400">{group.pace}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-400 text-xs">{group.recovery || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan={showVar ? 6 : 5} className="px-4 py-2 bg-slate-900/50">
                                                    <div className="flex flex-wrap gap-2 justify-end">
                                                        {group.reps.map((repTime, rIdx) => (
                                                            <span 
                                                                key={rIdx} 
                                                                className={`text-xs font-mono px-2 py-0.5 rounded border ${
                                                                    Math.abs(repTime - group.bestTime) < 0.01 
                                                                    ? 'bg-brand-900/30 text-brand-400 border-brand-500/30' 
                                                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                                                }`}
                                                            >
                                                                {formatSecondsToTime(repTime, true)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {workout.notes && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes</h4>
                            <p className="text-slate-300 whitespace-pre-line text-sm leading-relaxed">{workout.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default WorkoutDetailModal;
