import React, { useState, useEffect } from 'react';
import { WorkoutType, Workout, IntervalSet, SurfaceType, Course, Shoe } from '../types';
import { Plus, Trash2, Save, Wand2, Clock, MapPin, Activity, ListOrdered, Calculator, Copy, Bike, Trophy, Flag, Users, Map } from 'lucide-react';
import { analyzeWorkoutLog } from '../services/geminiService';
import { extractSplitsFromText, formatSecondsToTime, parseTimeStringToSeconds, calculatePaceFromSpeed } from '../utils/analytics';
import { SHOE_OPTIONS } from '../constants';

interface WorkoutFormProps {
  onSave: (workout: Workout) => void;
  onCancel: () => void;
  courses?: Course[];
  shoes?: Shoe[];
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({ onSave, onCancel, courses = [], shoes = [] }) => {
  const [formData, setFormData] = useState<Partial<Workout>>({
    date: new Date().toISOString().split('T')[0],
    type: WorkoutType.EASY,
    distance: 0,
    duration: 0,
    feeling: 5,
    rpe: 5,
    notes: '',
    intervals: [],
    splits: [],
    shoe: '',
    route: '',
    surface: 'Road',
    courseId: '',
    avgHr: undefined,
    maxHr: undefined,
    competition: '',
    team: '',
    place: '',
    eventName: ''
  });

  const [durationStr, setDurationStr] = useState('');
  const [splitsText, setSplitsText] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [liveMetric, setLiveMetric] = useState('-');

  const activeShoes = shoes.filter(s => s.status === 'Active');
  // Fallback to constants if no shoes provided (shouldn't happen with correct storage seeding)
  const shoeList = activeShoes.length > 0 ? activeShoes.map(s => s.name) : SHOE_OPTIONS;

  const isCycling = formData.type === WorkoutType.CYCLE;
  const isTreadmill = formData.type === WorkoutType.TREADMILL;
  const isTrack = formData.surface === 'Track' || formData.surface === 'Indoor';
  const isTempo = formData.type === WorkoutType.TEMPO;
  const isRace = formData.type === WorkoutType.RACE;
  
  // Enable Precision Grid for Hills, Speed, Intervals, Threshold, Tempo, and Race
  const isPrecisionMode = [
      WorkoutType.HILLS, 
      WorkoutType.SPEED, 
      WorkoutType.INTERVAL, 
      WorkoutType.THRESHOLD,
      WorkoutType.TEMPO,
      WorkoutType.RACE
  ].includes(formData.type as WorkoutType);

  // Identify simple runs where complex interval structure is unnecessary
  const isSimpleRun = [
      WorkoutType.EASY,
      WorkoutType.RECOVERY,
      WorkoutType.LONG,
      WorkoutType.CROSS_TRAINING,
      // Race moved to precision mode
  ].includes(formData.type as WorkoutType);

  // Effects to handle pace/speed calculation and duration sync
  useEffect(() => {
    if (formData.distance && formData.duration) {
      if (isCycling) {
          // Calculate Speed (km/h)
          const hours = formData.duration / 60;
          const speed = formData.distance / hours;
          setLiveMetric(`${speed.toFixed(1)} km/h`);
      } else {
          // Calculate Pace (min/km)
          const paceDec = formData.duration / formData.distance;
          const paceMin = Math.floor(paceDec);
          const paceSec = Math.round((paceDec - paceMin) * 60);
          setLiveMetric(`${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec}/km`);
      }
    } else {
      setLiveMetric('-');
    }
  }, [formData.distance, formData.duration, isCycling]);

  // Auto-set surface based on type
  useEffect(() => {
      if (formData.type === WorkoutType.TREADMILL) {
          setFormData(prev => ({ ...prev, surface: 'Treadmill' }));
      } else if (formData.type === WorkoutType.CYCLE) {
           setFormData(prev => ({ ...prev, surface: 'Road' })); 
      } else if (formData.type === WorkoutType.SPEED || formData.type === WorkoutType.INTERVAL) {
           // Speed work and Intervals default to Track
           setFormData(prev => ({ ...prev, surface: 'Track' }));
      } else if (formData.type === WorkoutType.TEMPO) {
           // Tempo defaults to Road (user can manually switch to Track for Track Tempo)
           setFormData(prev => ({ ...prev, surface: 'Road' }));
      } else if (formData.type === WorkoutType.RACE) {
           // Race default
           if (!formData.surface) setFormData(prev => ({ ...prev, surface: 'Road' }));
      }
  }, [formData.type]);

  const parseDuration = (str: string): number => {
    if (!str) return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] + parts[1] / 60;
    } else if (parts.length === 1) {
      return isNaN(parts[0]) ? 0 : parts[0];
    }
    return 0;
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDurationStr(e.target.value);
    setFormData(prev => ({ ...prev, duration: parseDuration(e.target.value) }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (['distance', 'feeling', 'rpe', 'avgHr', 'maxHr'].includes(name))
        ? (value === '' ? undefined : Number(value))
        : value
    }));
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cId = e.target.value;
      if (!cId) {
          setFormData(prev => ({ ...prev, courseId: '', route: '' }));
          return;
      }
      const course = courses?.find(c => c.id === cId);
      if (course) {
          setFormData(prev => ({
              ...prev,
              courseId: course.id,
              route: course.name,
              distance: course.distance,
              surface: course.surface
          }));
      }
  };

  // --- Interval Handlers ---
  const addInterval = () => {
    const newIntervals = [...(formData.intervals || []), { reps: 1, recovery: '90s jog' }];
    setFormData(prev => updateTotalsFromIntervals(prev, newIntervals));
  };

  const updateInterval = (index: number, field: keyof IntervalSet, value: string | number) => {
    const updatedIntervals = [...(formData.intervals || [])];
    const val = (field === 'distance' || field === 'reps') ? Number(value) : value;
    updatedIntervals[index] = { ...updatedIntervals[index], [field]: val };
    setFormData(prev => updateTotalsFromIntervals(prev, updatedIntervals));
  };

  const removeInterval = (index: number) => {
    const updatedIntervals = (formData.intervals || []).filter((_, i) => i !== index);
    setFormData(prev => updateTotalsFromIntervals(prev, updatedIntervals));
  };

  // --- Precision Grid Handlers (Hills / Speed / Intervals / Threshold / Tempo / Race) ---
  const addPrecisionRep = () => {
      // Duplicate last rep details if exists (distance/recovery usually same)
      const last = formData.intervals && formData.intervals.length > 0 
        ? formData.intervals[formData.intervals.length - 1] 
        : { reps: 1, distance: 400, duration: '', recovery: '90s' };

      // For Tempo and Race, default to 1000m (1km) splits
      const defaultDist = (formData.type === WorkoutType.TEMPO || formData.type === WorkoutType.RACE) ? 1000 : (last.distance || 400);

      const newRep: IntervalSet = {
          reps: 1,
          distance: Number(defaultDist),
          duration: '',
          recovery: (isTempo || isRace) ? '' : (last.recovery || ''),
          pace: ''
      };

      setFormData(prev => {
          const newIntervals = [...(prev.intervals || []), newRep];
          return updateTotalsFromIntervals(prev, newIntervals);
      });
  };

  const updatePrecisionRep = (index: number, field: keyof IntervalSet, value: any) => {
      const updatedIntervals = [...(formData.intervals || [])];
      const val = (field === 'distance' || field === 'reps') ? Number(value) : value;
      updatedIntervals[index] = { ...updatedIntervals[index], [field]: val };
      
      // Auto-calc pace if time/dist changed
      if (field === 'duration' || field === 'distance') {
          const dist = Number(updatedIntervals[index].distance);
          const timeSec = parseTimeStringToSeconds(String(updatedIntervals[index].duration));
          if (dist > 0 && timeSec > 0) {
             updatedIntervals[index].pace = calculatePaceFromSpeed(timeSec, dist);
          }
      }

      setFormData(prev => updateTotalsFromIntervals(prev, updatedIntervals));
  };

  const updateTotalsFromIntervals = (prevData: Partial<Workout>, intervals: IntervalSet[]): Partial<Workout> => {
      // Auto-sum distance and duration from reps
      let totalMeters = 0;
      let totalSeconds = 0;
      const splits: number[] = [];

      intervals.forEach(i => {
          const reps = i.reps || 1;
          const m = Number(i.distance) || 0;
          const s = parseTimeStringToSeconds(String(i.duration || '0'));
          
          totalMeters += m * reps;
          totalSeconds += s * reps;
          
          // Populate splits array for analytics
          if (s > 0) {
              for(let k=0; k<reps; k++) splits.push(s);
          }
      });

      // Update main metrics
      const newDistKm = totalMeters / 1000;
      const newDurMin = totalSeconds / 60;
      
      const updates: Partial<Workout> = {
          intervals,
          splits
      };

      // Only auto-update totals if NOT Tempo OR Race
      // For Tempo/Race, user manually enters Total Time/Dist, then breaks down splits.
      if (prevData.type !== WorkoutType.TEMPO && prevData.type !== WorkoutType.RACE) {
          updates.distance = Number(newDistKm.toFixed(2));
          updates.duration = Number(newDurMin.toFixed(2));
          // Keep formatted duration string in sync if we are auto-updating
          if (totalSeconds > 0) setDurationStr(formatSecondsToTime(totalSeconds));
      }

      return {
          ...prevData,
          ...updates
      };
  };

  // --- Rapid Split ---
  const handleSplitsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSplitsText(e.target.value);
  };

  const parseSplits = () => {
      const extracted = extractSplitsFromText(splitsText);
      setFormData(prev => ({ ...prev, splits: extracted }));
  };

  // --- Submission ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.type) return;

    const trainingLoad = (formData.duration && formData.rpe) ? Math.round(formData.duration * formData.rpe) : 0;

    const newWorkout: Workout = {
      id: Date.now().toString(),
      date: new Date(formData.date).toISOString(),
      type: formData.type as WorkoutType,
      distance: Number(formData.distance) || 0,
      duration: Number(formData.duration) || 0,
      feeling: Number(formData.feeling) || 5,
      rpe: Number(formData.rpe) || 5,
      trainingLoad,
      notes: formData.notes || '',
      intervals: formData.intervals || [],
      splits: formData.splits || [],
      shoe: formData.shoe,
      route: formData.route,
      courseId: formData.courseId,
      surface: formData.surface as SurfaceType,
      avgHr: formData.avgHr,
      maxHr: formData.maxHr,
      competition: formData.competition,
      team: formData.team,
      place: formData.place,
      eventName: formData.eventName
    };
    onSave(newWorkout);
  };

  const handleInstantAnalysis = async () => {
    if (!formData.notes) return;
    setAnalyzing(true);
    const mockW = { ...formData, date: new Date(formData.date!).toISOString() } as Workout;
    const result = await analyzeWorkoutLog(mockW);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  // Stats for Precision Table Footer
  const precisionStats = React.useMemo(() => {
     if (!formData.intervals) return { totalTime: '-', totalDist: 0, avgPace: '-', avgTime: '-', avgLap: '-' };
     let tSec = 0;
     let tDist = 0;
     let count = 0;
     formData.intervals.forEach(i => {
         const reps = i.reps || 1;
         const s = parseTimeStringToSeconds(String(i.duration || '0'));
         const d = Number(i.distance) || 0;
         if ((s > 0 || d > 0)) {
             tSec += s * reps;
             tDist += d * reps;
             count += reps;
         }
     });
     
     // Calculate Avg Lap for Track (Total Time / Total Laps)
     // Laps = TotalDist / 400
     const totalLaps = tDist > 0 ? tDist / 400 : 0;
     const avgLapSec = totalLaps > 0 ? tSec / totalLaps : 0;

     return {
         totalTime: formatSecondsToTime(tSec, true),
         totalDist: tDist,
         avgPace: calculatePaceFromSpeed(tSec, tDist), // Total time / Total dist
         avgTime: count > 0 ? formatSecondsToTime(tSec / count, true) : '-',
         avgLap: avgLapSec > 0 ? formatSecondsToTime(avgLapSec, true) : '-'
     };
  }, [formData.intervals]);

  return (
    <div className="max-w-4xl mx-auto bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Log Session</h2>
          <p className="text-slate-400 text-sm">Record your training details with precision.</p>
        </div>
        <div className="text-right">
           <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Load Score</div>
           <div className="text-xl font-mono font-bold text-brand-400">
             {Math.round((formData.duration || 0) * (formData.rpe || 0))}
           </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        
        {/* Section 1: Core Logistics */}
        <div className="space-y-4">
           <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Logistics</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Session Type</label>
                <select name="type" value={formData.type} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-1 focus:ring-brand-500 outline-none">
                  {Object.values(WorkoutType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
           </div>
           
           {/* RACE SPECIFIC FIELDS */}
           {isRace && (
               <div className="bg-brand-900/10 border border-brand-900/30 p-4 rounded-lg space-y-4">
                   <div className="flex items-center space-x-2 text-brand-400 mb-2">
                       <Trophy size={16} />
                       <span className="text-xs font-bold uppercase tracking-wider">Race Details</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-400 mb-1">Competition Name</label>
                           <input type="text" name="competition" placeholder="e.g. Faculty Meet - FOM - 2025" value={formData.competition} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                       </div>
                       <div>
                           <label className="block text-xs font-medium text-slate-400 mb-1">Event</label>
                           <div className="relative">
                               <Flag size={14} className="absolute left-3 top-3 text-slate-500"/>
                               <input type="text" name="eventName" placeholder="e.g. 800m, 5000m" value={formData.eventName} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                           </div>
                       </div>
                       <div>
                           <label className="block text-xs font-medium text-slate-400 mb-1">Place / Rank</label>
                           <input type="text" name="place" placeholder="e.g. 1st, 7th" value={formData.place} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none font-bold text-brand-400" />
                       </div>
                       <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-400 mb-1">Represented Team</label>
                           <div className="relative">
                               <Users size={14} className="absolute left-3 top-3 text-slate-500"/>
                               <input type="text" name="team" placeholder="e.g. Faculty of Medicine" value={formData.team} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                           </div>
                       </div>
                   </div>
               </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* COURSE SELECTOR */}
               {courses && courses.length > 0 && !isRace && (
                   <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1">Select Course</label>
                       <div className="relative">
                            <Map size={14} className="absolute left-3 top-3 text-slate-500" />
                            <select 
                                name="courseId" 
                                value={formData.courseId} 
                                onChange={handleCourseChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none appearance-none"
                            >
                                <option value="">-- Manual Route --</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.distance}km)</option>)}
                            </select>
                       </div>
                   </div>
               )}

              <div className={courses && courses.length > 0 && !isRace ? 'md:col-span-1' : 'md:col-span-2'}>
                 <label className="block text-xs font-medium text-slate-400 mb-1">{isRace ? 'Venue' : 'Location / Route'}</label>
                 <div className="relative">
                   <MapPin size={14} className="absolute left-3 top-3 text-slate-500"/>
                   <input type="text" name="route" placeholder={isRace ? "e.g. University Ground" : "e.g. Park Loop"} value={formData.route} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                 </div>
              </div>
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">Surface</label>
                 <select name="surface" value={formData.surface} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                    {['Road', 'Track', 'Trail', 'Treadmill', 'Grass', 'Indoor', 'Mixed'].map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">{isCycling ? 'Bike / Equipment' : 'Shoes'}</label>
                 <input list="shoes-list" name="shoe" value={formData.shoe} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none" placeholder={isCycling ? "e.g. Road Bike" : "Select or type..."} />
                 <datalist id="shoes-list">
                    {shoeList.map(s => <option key={s} value={s} />)}
                 </datalist>
              </div>
           </div>
        </div>

        {/* Section 2: Metrics */}
        <div className={`space-y-4`}>
           <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                    Metrics 
                    {(isPrecisionMode && !isTempo && !isRace) && <span className="ml-2 text-[10px] normal-case bg-brand-900/30 text-brand-400 px-2 py-0.5 rounded border border-brand-900/50">Auto-calculated from sets</span>}
                    {(isTempo || isRace) && <span className="ml-2 text-[10px] normal-case bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-900/50">Manual Entry</span>}
                </h3>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">Total Distance (km)</label>
                 <input type="number" step="0.01" name="distance" value={formData.distance} onChange={handleInputChange} className={`w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-lg outline-none focus:ring-1 focus:ring-brand-500`} />
              </div>
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">Total Duration (MM:SS)</label>
                 <div className="relative">
                    <Clock size={14} className="absolute left-3 top-3.5 text-slate-500"/>
                    <input type="text" placeholder="45:00" value={durationStr} onChange={handleDurationChange} className={`w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-white font-mono text-lg outline-none focus:ring-1 focus:ring-brand-500`} />
                 </div>
              </div>
              <div className="col-span-2 md:col-span-2 flex items-center space-x-4 bg-slate-800/50 p-2 rounded-md border border-slate-800">
                 <div className="flex-1">
                    <div className="text-xs text-slate-500 uppercase">{isCycling ? 'Avg Speed' : 'Calc Pace'}</div>
                    <div className="text-xl font-mono text-brand-400">{liveMetric}</div>
                 </div>
                 <div className="h-8 w-px bg-slate-700"></div>
                 <div className="flex-1">
                    <div className="text-xs text-slate-500 uppercase">Training Load</div>
                    <div className="text-xl font-mono text-blue-400">{Math.round((formData.duration || 0) * (formData.rpe || 0))}</div>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">Avg HR</label>
                 <div className="relative">
                   <Activity size={14} className="absolute left-3 top-3 text-slate-500"/>
                   <input type="number" name="avgHr" value={formData.avgHr || ''} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-white font-mono focus:ring-1 focus:ring-brand-500 outline-none" placeholder="bpm" />
                 </div>
              </div>
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">Max HR</label>
                 <input type="number" name="maxHr" value={formData.maxHr || ''} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono focus:ring-1 focus:ring-brand-500 outline-none" placeholder="bpm" />
              </div>
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">RPE (1-10)</label>
                 <input type="number" min="1" max="10" name="rpe" value={formData.rpe} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono focus:ring-1 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">Feel (1-10)</label>
                 <input type="number" min="1" max="10" name="feeling" value={formData.feeling} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono focus:ring-1 focus:ring-brand-500 outline-none" />
              </div>
           </div>
        </div>

        {/* --- DYNAMIC SECTION --- */}
        {isPrecisionMode ? (
            /* PRECISION GRID VIEW (Hills / Speed / Intervals / Threshold / Tempo / Race) */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                     <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-widest flex items-center">
                        <ListOrdered size={16} className="mr-2" /> 
                        {formData.type} Log
                     </h3>
                     <button type="button" onClick={addPrecisionRep} className="flex items-center text-xs bg-brand-600 text-white px-3 py-1.5 rounded hover:bg-brand-500 transition shadow-lg shadow-brand-900/20">
                         <Plus size={14} className="mr-1" /> Add {(isTempo || isRace) ? 'Split' : 'Rep'}
                     </button>
                 </div>

                 <div className="overflow-x-auto rounded-lg border border-slate-700">
                     <table className="w-full text-left text-sm">
                         <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                             <tr>
                                 <th className="px-4 py-3">{(isTempo || isRace) ? 'Split' : 'Rep'}</th>
                                 {isTrack && <th className="px-4 py-3">Laps</th>}
                                 <th className="px-4 py-3">Distance (m)</th>
                                 <th className="px-4 py-3">Time</th>
                                 <th className="px-4 py-3">Pace (min/km)</th>
                                 {(!isTempo && !isRace) && <th className="px-4 py-3">Rest</th>}
                                 <th className="px-4 py-3 text-right">Action</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800 bg-slate-900">
                             {formData.intervals && formData.intervals.length > 0 ? (
                                 formData.intervals.map((rep, idx) => (
                                     <tr key={idx} className="group hover:bg-slate-800/50 transition">
                                         <td className="px-4 py-2 font-mono text-slate-400">{idx + 1}</td>
                                         {isTrack && <td className="px-4 py-2 font-mono text-slate-400">{parseFloat((Number(rep.distance || 0) / 400).toFixed(2))}</td>}
                                         <td className="px-4 py-2">
                                             <input 
                                                 type="number" 
                                                 value={rep.distance} 
                                                 onChange={(e) => updatePrecisionRep(idx, 'distance', Number(e.target.value))}
                                                 className="bg-transparent border-b border-slate-800 focus:border-brand-500 outline-none w-20 font-mono text-white text-center"
                                                 placeholder="0"
                                             />
                                         </td>
                                         <td className="px-4 py-2">
                                             <input 
                                                 type="text" 
                                                 value={rep.duration} 
                                                 onChange={(e) => updatePrecisionRep(idx, 'duration', e.target.value)}
                                                 className="bg-transparent border-b border-slate-800 focus:border-brand-500 outline-none w-24 font-mono text-white text-center"
                                                 placeholder={isTempo ? "mm:ss.00" : (formData.type === WorkoutType.SPEED || formData.type === WorkoutType.INTERVAL ? "ss.00" : "00:00.0")}
                                             />
                                         </td>
                                         <td className="px-4 py-2 font-mono text-brand-400">
                                             {rep.pace || '-'}
                                         </td>
                                         {(!isTempo && !isRace) && (
                                            <td className="px-4 py-2">
                                                <input 
                                                    type="text" 
                                                    value={rep.recovery || ''} 
                                                    onChange={(e) => updatePrecisionRep(idx, 'recovery', e.target.value)}
                                                    className="bg-transparent border-b border-slate-800 focus:border-brand-500 outline-none w-20 text-slate-400 text-center text-xs"
                                                    placeholder="Rest"
                                                />
                                            </td>
                                         )}
                                         <td className="px-4 py-2 text-right">
                                             <button type="button" onClick={() => removeInterval(idx)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                                                 <Trash2 size={16} />
                                             </button>
                                         </td>
                                     </tr>
                                 ))
                             ) : (
                                 <tr>
                                     <td colSpan={isTrack ? ((isTempo || isRace) ? 6 : 7) : ((isTempo || isRace) ? 5 : 6)} className="px-4 py-8 text-center text-slate-500 italic">
                                         No reps logged. Click "Add {(isTempo || isRace) ? 'Split' : 'Rep'}" to start.
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                         {/* Footer Totals */}
                         <tfoot className="bg-slate-950 border-t border-slate-700 font-mono text-xs">
                             <tr>
                                 <td className="px-4 py-3 text-slate-500 uppercase font-bold">Sum</td>
                                 {isTrack && <td className="px-4 py-3"></td>}
                                 <td className="px-4 py-3 text-white font-bold">{precisionStats.totalDist} m</td>
                                 <td className="px-4 py-3 text-white font-bold">{precisionStats.totalTime}</td>
                                 <td className="px-4 py-3"></td>
                                 {(!isTempo && !isRace) && <td className="px-4 py-3"></td>}
                                 <td className="px-4 py-3"></td>
                             </tr>
                             <tr>
                                 <td className="px-4 py-3 text-slate-500 uppercase font-bold">Avg</td>
                                 {isTrack && <td className="px-4 py-3 text-brand-400 font-bold">{precisionStats.avgLap} <span className="text-[10px] text-slate-600 font-normal">/400</span></td>}
                                 <td className="px-4 py-3 text-slate-400">-</td>
                                 <td className="px-4 py-3 text-brand-400 font-bold">{precisionStats.avgTime}</td>
                                 <td className="px-4 py-3 text-brand-400 font-bold">{precisionStats.avgPace}</td>
                                 {(!isTempo && !isRace) && <td className="px-4 py-3"></td>}
                                 <td className="px-4 py-3"></td>
                             </tr>
                         </tfoot>
                     </table>
                 </div>
            </div>
        ) : (
            /* STANDARD INTERVAL VIEW */
            <>
                {!isSimpleRun && (
                    <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Interval Structure</h3>
                        <button type="button" onClick={addInterval} className="flex items-center text-xs bg-brand-900/30 text-brand-400 px-3 py-1.5 rounded hover:bg-brand-900/50 transition border border-brand-900/50">
                        <Plus size={14} className="mr-1" /> Add Set
                        </button>
                    </div>
                    
                    {formData.intervals && formData.intervals.length > 0 ? (
                        <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-500 uppercase tracking-wider px-2">
                            <div className="col-span-1">Reps</div>
                            <div className="col-span-2">Dist (m)</div>
                            <div className="col-span-2">Time</div>
                            <div className="col-span-3">{(isCycling || isTreadmill) ? 'Target (Speed)' : 'Target Pace'}</div>
                            <div className="col-span-3">Recovery</div>
                            <div className="col-span-1"></div>
                        </div>
                        {formData.intervals.map((interval, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-800/30 p-2 rounded border border-slate-800">
                                <div className="col-span-1 relative">
                                    <input type="number" value={interval.reps} onChange={(e) => updateInterval(idx, 'reps', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1.5 text-white text-sm text-center font-bold" />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" 
                                        placeholder="m" 
                                        value={interval.distance || ''} 
                                        onChange={(e) => updateInterval(idx, 'distance', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" 
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="text" 
                                        placeholder="mm:ss" 
                                        value={interval.duration || ''} 
                                        onChange={(e) => updateInterval(idx, 'duration', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" 
                                    />
                                </div>
                                <div className="col-span-3">
                                    <input 
                                        type="text" 
                                        placeholder={(isCycling || isTreadmill) ? "e.g. 12 km/h" : "3:05/km"} 
                                        value={interval.pace || ''} 
                                        onChange={(e) => updateInterval(idx, 'pace', e.target.value)} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" 
                                    />
                                </div>
                                <div className="col-span-3">
                                    <input type="text" placeholder="90s jog" value={interval.recovery} onChange={(e) => updateInterval(idx, 'recovery', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
                                </div>
                                <div className="col-span-1 text-right">
                                    <button type="button" onClick={() => removeInterval(idx)} className="text-slate-600 hover:text-red-400 transition"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-slate-800/20 rounded border border-dashed border-slate-800 text-slate-500 text-sm">
                            No structured sets defined.
                        </div>
                    )}
                    </div>
                )}

                {/* Section 4: Rapid Split Entry */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center">
                            <ListOrdered size={16} className="mr-2" /> Rapid Split Entry
                        </h3>
                        <button type="button" onClick={parseSplits} className="flex items-center text-xs text-brand-400 hover:text-brand-300 transition">
                            <Calculator size={14} className="mr-1" /> Extract Splits
                        </button>
                    </div>
                    <p className="text-xs text-slate-400">Paste or type your splits (e.g. "72, 71, 70, 75"). The app will analyze variation and best reps.</p>
                    <textarea
                        value={splitsText}
                        onChange={handleSplitsChange}
                        rows={3}
                        placeholder="72, 71, 70, 72, 75..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-3 text-white font-mono text-sm focus:ring-1 focus:ring-brand-500 outline-none"
                    />
                    {formData.splits && formData.splits.length > 0 && (
                        <div className="bg-slate-900 p-3 rounded border border-slate-800 flex flex-wrap gap-2">
                            <div className="text-xs text-slate-500 w-full mb-1">Recognized {formData.splits.length} splits:</div>
                            {formData.splits.map((s, i) => (
                                <span key={i} className="bg-slate-800 text-brand-400 text-xs px-2 py-1 rounded font-mono border border-slate-700">{formatSecondsToTime(s)}</span>
                            ))}
                        </div>
                    )}
                </div>
            </>
        )}

        {/* Section 5: Qualitative */}
        <div className="space-y-2">
           <div className="flex justify-between items-center">
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Notes</h3>
             <button type="button" onClick={handleInstantAnalysis} disabled={analyzing} className="flex items-center text-xs text-blue-400 hover:text-blue-300 transition">
                <Wand2 size={12} className="mr-1" /> {analyzing ? 'Analyzing...' : 'Analyze with AI'}
             </button>
           </div>
           <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Sensations, weather impact, pain points, specific split times..."
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-4 py-3 text-white focus:ring-1 focus:ring-brand-500 outline-none"
           ></textarea>
           {aiAnalysis && (
              <div className="p-4 bg-brand-900/20 border border-brand-500/30 rounded-lg">
                 <div className="flex items-start gap-3">
                    <Wand2 size={16} className="text-brand-400 mt-1 shrink-0" />
                    <p className="text-sm text-brand-100 whitespace-pre-line leading-relaxed">{aiAnalysis}</p>
                 </div>
              </div>
           )}
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-800">
           <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition font-medium">Cancel</button>
           <button type="submit" className="px-8 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-lg shadow-brand-900/20 transition flex items-center">
              <Save size={18} className="mr-2" /> Save Entry
           </button>
        </div>

      </form>
    </div>
  );
};

export default WorkoutForm;