import React, { useEffect, useState } from 'react';
import { Workout, Goal, WorkoutType, TrainingAlert, UserProfile, Season } from '../types';
import { TrendingUp, Clock, Zap, Calendar, Activity, Heart, BarChart3, Target, AlertTriangle, Info, Bell, CalendarRange } from 'lucide-react';
import { getWeeklyCoachInsights, getDailyGuidance } from '../services/geminiService';
import { generateRacePredictions, getGoalProgressPrediction } from '../utils/prediction';
import { parseTimeStringToSeconds, formatSecondsToTime } from '../utils/analytics';
import { generateSmartAlerts } from '../utils/warnings';

interface DashboardProps {
  workouts: Workout[];
  goals: Goal[];
  profile: UserProfile;
  currentSeason?: Season;
}

const Dashboard: React.FC<DashboardProps> = ({ workouts, goals, profile, currentSeason }) => {
  const [insight, setInsight] = useState<string>('Analyzing your recent training data...');
  const [dailyAdvice, setDailyAdvice] = useState<{title: string, content: string} | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [alerts, setAlerts] = useState<TrainingAlert[]>([]);
  const [viewScope, setViewScope] = useState<'WEEKLY' | 'MONTHLY' | 'SEASON'>('WEEKLY');

  // Filter Workouts based on Scope
  const filteredWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    
    // Normalize 'now' to handle date comparisons correctly
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (viewScope === 'SEASON') {
        if (currentSeason) {
            return d >= new Date(currentSeason.startDate);
        } else {
            // Fallback if no active season: Current Year
            return d.getFullYear() === currentYear;
        }
    }

    if (viewScope === 'MONTHLY') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }

    // WEEKLY: Current calendar week (Monday to Sunday)
    // Find Monday of the current week
    const day = now.getDay(); // 0 is Sunday, 1 is Monday...
    // The difference to subtract to get to Monday. 
    // If today is Sunday (0), we want to go back 6 days. 
    // If today is Monday (1), go back 0 days.
    const diffToMon = (day === 0 ? 6 : day - 1);
    
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMon);
    monday.setHours(0, 0, 0, 0);
    
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);

    return d >= monday && d < nextMonday;
  });

  const periodLabel = viewScope === 'WEEKLY' ? 'This Week' 
    : viewScope === 'MONTHLY' ? 'This Month' 
    : currentSeason ? `Season: ${currentSeason.name}` : `Season ${new Date().getFullYear()}`;

  const totalDistance = filteredWorkouts.reduce((sum, w) => sum + w.distance, 0).toFixed(1);
  const totalDuration = filteredWorkouts.reduce((sum, w) => sum + w.duration, 0);
  const totalLoad = filteredWorkouts.reduce((sum, w) => sum + (w.trainingLoad || (w.duration * w.rpe)), 0);
  
  // Calculate Avg Intensity (RPE), ignoring 0 or missing
  const validRpeWorkouts = filteredWorkouts.filter(w => w.rpe && w.rpe > 0);
  const avgIntensity = validRpeWorkouts.length > 0 
    ? (validRpeWorkouts.reduce((sum, w) => sum + w.rpe, 0) / validRpeWorkouts.length).toFixed(1) 
    : 'N/A';

  // Calculate Avg HR, ignoring missing
  const validHrWorkouts = filteredWorkouts.filter(w => w.avgHr && w.avgHr > 0);
  const avgHr = validHrWorkouts.length > 0
    ? Math.round(validHrWorkouts.reduce((sum, w) => sum + (w.avgHr || 0), 0) / validHrWorkouts.length)
    : 'N/A';

  // Zone Distribution
  const zoneDist = filteredWorkouts.reduce((acc, w) => {
      acc[w.type] = (acc[w.type] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  // Predictions
  const predictions = generateRacePredictions(workouts, goals);

  useEffect(() => {
    const fetchData = async () => {
        if (workouts.length === 0) {
            setInsight("Log your first workout to get AI coaching!");
            return;
        }
        
        // 1. Generate Deterministic Alerts
        const smartAlerts = generateSmartAlerts(workouts);
        setAlerts(smartAlerts);

        setLoadingInsight(true);
        
        // 2. Fetch Weekly Insights (Always fetch based on recent history regardless of toggle)
        const text = await getWeeklyCoachInsights(workouts, profile);
        setInsight(text);

        // 3. Fetch Daily Guidance
        const daily = await getDailyGuidance(workouts, goals, profile);
        setDailyAdvice(daily);

        setLoadingInsight(false);
    };
    fetchData();
  }, [workouts.length, profile]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      
      {/* 1. Smart Alerts */}
      {alerts.length > 0 && (
          <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <AlertTriangle size={14} className="mr-2 text-brand-500" /> Smart Alerts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.map(alert => (
                      <div key={alert.id} className={`p-4 rounded-lg border flex items-start space-x-3 ${
                          alert.type === 'DANGER' ? 'bg-red-900/10 border-red-500/50 text-red-100' :
                          alert.type === 'WARNING' ? 'bg-brand-900/10 border-brand-500/50 text-brand-100' :
                          'bg-blue-900/10 border-blue-500/50 text-blue-100'
                      }`}>
                          <div className={`p-2 rounded-full shrink-0 ${
                             alert.type === 'DANGER' ? 'bg-red-500/20 text-red-500' :
                             alert.type === 'WARNING' ? 'bg-brand-500/20 text-brand-500' :
                             'bg-blue-500/20 text-blue-500'
                          }`}>
                              {alert.type === 'DANGER' ? <Activity size={18} /> : <Info size={18} />}
                          </div>
                          <div>
                              <h4 className="font-bold text-sm">{alert.title}</h4>
                              <p className="text-xs opacity-90 mt-1 text-slate-300">{alert.message}</p>
                              {alert.metric && <div className="text-xs font-mono font-bold mt-2 bg-black/20 inline-block px-2 py-1 rounded">{alert.metric}</div>}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* 2. Daily Briefing */}
      {dailyAdvice && (
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 border border-brand-500 p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-lg shadow-brand-900/20">
             <div className="mb-4 md:mb-0 max-w-2xl relative z-10">
                 <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-white/20 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Today's Focus</span>
                    <span className="text-xs text-brand-100 uppercase tracking-wide font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric'})}</span>
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2">{dailyAdvice.title}</h3>
                 <p className="text-brand-50 text-sm leading-relaxed font-medium">{dailyAdvice.content}</p>
             </div>
             <div className="hidden md:block">
                 <Bell className="text-white/20 w-24 h-24 -rotate-12" />
             </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">Hello, {profile.name}</h2>
                {profile.preferredRace && <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">{profile.preferredRace} Focus</span>}
            </div>
            <p className="text-slate-400">Your performance snapshot for <span className="text-brand-500 font-bold">{periodLabel}</span>.</p>
        </div>
        <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex">
            <button 
                onClick={() => setViewScope('WEEKLY')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${viewScope === 'WEEKLY' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
                Weekly
            </button>
            <button 
                onClick={() => setViewScope('MONTHLY')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${viewScope === 'MONTHLY' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
                Monthly
            </button>
            <button 
                onClick={() => setViewScope('SEASON')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${viewScope === 'SEASON' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
                Season
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition group">
            <div className="flex items-center space-x-2 mb-2">
                <TrendingUp size={16} className="text-brand-500" />
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-slate-300 transition">Distance</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{totalDistance}<span className="text-sm text-slate-500 font-normal ml-1">km</span></div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition group">
            <div className="flex items-center space-x-2 mb-2">
                <Clock size={16} className="text-blue-500" />
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-slate-300 transition">Duration</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
                {Math.floor(Math.round(totalDuration) / 60)}h {Math.round(totalDuration) % 60}m
            </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition group">
            <div className="flex items-center space-x-2 mb-2">
                <Activity size={16} className="text-red-500" />
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-slate-300 transition">Load</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{Math.round(totalLoad)}<span className="text-sm text-slate-500 font-normal ml-1">TL</span></div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition group">
            <div className="flex items-center space-x-2 mb-2">
                <Zap size={16} className="text-yellow-500" />
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-slate-300 transition">Avg RPE</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{avgIntensity}<span className="text-sm text-slate-500 font-normal ml-1">/10</span></div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition group">
            <div className="flex items-center space-x-2 mb-2">
                <Heart size={16} className="text-rose-500" />
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-slate-300 transition">Avg HR</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{avgHr}<span className="text-sm text-slate-500 font-normal ml-1">bpm</span></div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition group">
             <div className="flex items-center space-x-2 mb-2">
                <CalendarRange size={16} className="text-purple-500" />
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-slate-300 transition">Sessions</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{filteredWorkouts.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Coach Insight */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="bg-brand-500 text-white text-xs font-black px-2 py-1 rounded mr-3">AI COACH</span>
                Weekly Analysis
            </h3>
            <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                {loadingInsight ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-700 rounded"></div>
                            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                        </div>
                    </div>
                ) : (
                    <div className="whitespace-pre-line leading-relaxed font-medium">{insight}</div>
                )}
            </div>
        </div>

        {/* Zone Breakdown */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                <BarChart3 size={16} className="mr-2" />
                {viewScope === 'WEEKLY' ? 'Weekly' : viewScope === 'MONTHLY' ? 'Monthly' : 'Season'} Zones
            </h3>
            <div className="space-y-3">
                {Object.keys(zoneDist).length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No workouts recorded.</p>
                ) : (
                    Object.entries(zoneDist).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center group">
                            <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${type === WorkoutType.EASY ? 'bg-green-500' : type === WorkoutType.INTERVAL ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                <span className="text-sm text-slate-300 font-medium">{type}</span>
                            </div>
                            <span className="text-sm text-slate-500 font-mono group-hover:text-white transition font-bold">{count}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Goals Progress (Only if using defaults or season targets) */}
      <h3 className="text-xl font-bold text-white mt-4 flex items-center">
        <Target size={20} className="mr-2 text-brand-500" />
        {currentSeason ? `${currentSeason.name} Targets` : 'Race Readiness'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* If season exists, show season targets. Else show default goals */}
        {(currentSeason ? currentSeason.targetPbs.map(pb => ({
            id: pb.distance,
            name: pb.distance,
            targetTime: pb.time,
            targetDistance: parseFloat(pb.distance) || 0, // Approx
            currentBest: currentSeason.startPbs.find(s => s.distance === pb.distance)?.time || '-',
            baseline: currentSeason.startPbs.find(s => s.distance === pb.distance)?.time || '-'
        })) : goals).map(goal => {
            const pred = getGoalProgressPrediction(goal as Goal, predictions);
            
            const targetSec = parseTimeStringToSeconds(goal.targetTime);
            const currentSec = pred ? pred.predictedSeconds : parseTimeStringToSeconds(goal.currentBest);
            const baselineSec = parseTimeStringToSeconds(goal.baseline);

            // Progress Logic
            const totalDiff = baselineSec - targetSec;
            const currentDiff = baselineSec - currentSec;
            const progress = totalDiff > 0 ? (currentDiff / totalDiff) * 100 : 0;
            const safeProgress = Math.max(0, Math.min(100, progress));

            return (
                <div key={goal.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                     {/* Background Success/Warn indicator */}
                     {currentSec <= targetSec && (
                        <div className="absolute right-0 top-0 p-2 bg-brand-500 text-white rounded-bl-xl shadow-lg">
                            <span className="text-[10px] font-bold uppercase">Ready</span>
                        </div>
                     )}

                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h4 className="text-lg font-bold text-white">{goal.name}</h4>
                            <div className="flex items-center space-x-3 text-sm mt-1">
                                <span className="text-slate-400">Target: <span className="text-white font-mono font-bold">{goal.targetTime}</span></span>
                                <span className="text-slate-700">|</span>
                                <span className="text-slate-400">Baseline: <span className="font-mono text-slate-500">{goal.baseline}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 mb-2">
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden relative">
                            {/* Current Position Marker */}
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${safeProgress >= 100 ? 'bg-brand-500' : 'bg-blue-500'}`}
                                style={{ width: `${safeProgress}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center text-xs">
                        <div className="text-slate-400">
                           Predicted: <span className={`font-mono font-bold ${currentSec <= targetSec ? 'text-brand-500' : 'text-slate-200'}`}>
                                    {pred ? pred.predictedTime : goal.currentBest}
                                </span>
                        </div>
                        <div className="font-mono text-brand-500 font-bold">
                             {Math.round(progress)}%
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Dashboard;