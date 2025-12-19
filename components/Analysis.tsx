import React, { useState, useMemo } from 'react';
import { Workout, Goal } from '../types';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, Legend, ComposedChart, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { generateRacePredictions, getBestPerformance, getFitnessTrend, DISTANCES } from '../utils/prediction';
import { INITIAL_GOALS } from '../constants'; 
import { formatSecondsToTime, calculateFitnessHistory, getTSBStatus } from '../utils/analytics';
import { Activity, Zap, Heart, TrendingUp, Info } from 'lucide-react';

interface AnalysisProps {
  workouts: Workout[];
  goals: Goal[];
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Analysis: React.FC<AnalysisProps> = ({ workouts, goals }) => {
  const [trendDistance, setTrendDistance] = useState('5000m');
  
  const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const activeGoals = goals && goals.length > 0 ? goals : INITIAL_GOALS;

  // 1. Weekly Volume Data
  const weeklyData = React.useMemo(() => {
    const weeks: Record<string, { date: string, distance: number, load: number }> = {};
    sortedWorkouts.forEach(w => {
        const d = new Date(w.date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const key = monday.toISOString().split('T')[0];
        
        if (!weeks[key]) weeks[key] = { date: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), distance: 0, load: 0 };
        weeks[key].distance += w.distance;
        weeks[key].load += (w.trainingLoad || (w.duration * w.rpe));
    });
    return Object.values(weeks)
        .map(w => ({ ...w, distance: Number(w.distance.toFixed(1)), load: Math.round(w.load) }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sortedWorkouts]);

  // 2. Zone Distribution Data
  const zoneData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    sortedWorkouts.forEach(w => {
        counts[w.type] = (counts[w.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sortedWorkouts]);

  // 3. Shoe Usage Data
  const shoeData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    sortedWorkouts.forEach(w => {
        if(w.shoe) counts[w.shoe] = (counts[w.shoe] || 0) + w.distance;
    });
    return Object.entries(counts)
        .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) })) 
        .sort((a,b) => b.value - a.value);
  }, [sortedWorkouts]);

  // 4. Fitness History (CTL/ATL/TSB)
  const fitnessHistory = useMemo(() => calculateFitnessHistory(workouts), [workouts]);
  const currentStress = fitnessHistory.length > 0 ? fitnessHistory[fitnessHistory.length - 1] : { fitness: 0, fatigue: 0, form: 0 };
  const stressStatus = getTSBStatus(currentStress.form);

  // 5. Predictions & Fitness Trend
  const predictions = generateRacePredictions(workouts, activeGoals);
  
  const fitnessTrend = useMemo(() => {
      const points = getFitnessTrend(workouts, trendDistance);
      return points.map(p => ({
          date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          minutes: p.predictedSeconds ? Number((p.predictedSeconds / 60).toFixed(2)) : null
      }));
  }, [workouts, trendDistance]);

  const timeFormatter = (minutes: number) => formatSecondsToTime(minutes * 60);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end mb-6">
        <div>
           <h2 className="text-3xl font-bold text-white">Analytics Lab</h2>
           <p className="text-slate-400">Deep dive into your physiological and training trends.</p>
        </div>
      </div>

      {/* Fitness Score & Stress Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Fitness KPI Card */}
          <div className="lg:col-span-1 bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div>
                  <div className="flex items-center space-x-2 text-slate-500 uppercase text-[10px] font-bold tracking-widest mb-1">
                      <TrendingUp size={14} className="text-brand-500" />
                      Fitness Score (CTL)
                  </div>
                  <div className="text-5xl font-black text-white italic tracking-tighter group-hover:text-brand-500 transition-colors">
                      {Math.round(currentStress.fitness)}
                  </div>
                  <div className={`mt-3 text-xs font-bold ${stressStatus.color} flex items-center`}>
                      <Zap size={12} className="mr-1" /> {stressStatus.label}
                  </div>
              </div>
              <div className="mt-8 space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                      <span>Fatigue (ATL)</span>
                      <span className="text-pink-400">{Math.round(currentStress.fatigue)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                      <span>Form (TSB)</span>
                      <span className={currentStress.form >= 0 ? 'text-blue-400' : 'text-orange-400'}>{Math.round(currentStress.form)}</span>
                  </div>
              </div>
          </div>

          {/* Fitness History Chart */}
          <div className="lg:col-span-3 bg-slate-800 p-6 rounded-2xl border border-slate-700 relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest flex items-center">
                        Training Stress Balance (42-Day Trend)
                        <div className="group/info relative ml-2">
                            <Info size={14} className="text-slate-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg text-[10px] leading-relaxed text-slate-400 hidden group-hover/info:block z-50">
                                <strong>Fitness (CTL):</strong> Long term build-up of training.<br/>
                                <strong>Fatigue (ATL):</strong> Short term load (last 7 days).<br/>
                                <strong>Form (TSB):</strong> Readiness. Positive means fresh, negative means training effect.
                            </div>
                        </div>
                    </h3>
                </div>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={fitnessHistory.slice(-60)}>
                            <defs>
                                <linearGradient id="colorFitEMA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#fc4c02" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#fc4c02" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorFatEMA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f472b6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#f472b6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }}
                                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                            />
                            <Area type="monotone" dataKey="fatigue" stroke="#f472b6" fillOpacity={1} fill="url(#colorFatEMA)" strokeWidth={1} strokeDasharray="3 3" name="Fatigue" />
                            <Area type="monotone" dataKey="fitness" stroke="#fc4c02" fillOpacity={1} fill="url(#colorFitEMA)" strokeWidth={3} name="Fitness" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
          </div>
      </div>
      
      {/* Performance Matrix */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
           <div>
             <h3 className="text-lg font-bold text-white flex items-center">
                Performance Predictor
             </h3>
             <p className="text-xs text-slate-500 mt-1">
                Generated using a weighted multi-factor model (Speed, Intervals, Threshold, Tempo, Volume).
             </p>
           </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-slate-700/50">
            {predictions.map((p) => (
                <div key={p.distanceName} className="bg-slate-800 p-6 text-center hover:bg-slate-700/30 transition">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{p.distanceName}</div>
                    <div className="text-2xl font-mono font-bold text-white mb-1">{p.predictedTime}</div>
                    <div className="text-sm font-mono text-blue-400">{p.formattedPace}</div>
                </div>
            ))}
        </div>
      </div>
      
      {/* Race Readiness Trend Graph */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">{trendDistance} Potential Trend</h3>
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                {DISTANCES.map(d => (
                    <button
                        key={d.name}
                        onClick={() => setTrendDistance(d.name)}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition ${trendDistance === d.name ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
                    >
                        {d.name}
                    </button>
                ))}
            </div>
        </div>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fitnessTrend}>
                    <defs>
                        <linearGradient id="colorFit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        stroke="#22c55e" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        label={{ value: `Predicted ${trendDistance}`, angle: -90, position: 'insideLeft', fill: '#22c55e' }}
                        tickFormatter={timeFormatter} 
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        formatter={(value: number) => [timeFormatter(value), 'Predicted Time']}
                    />
                    <Area type="monotone" dataKey="minutes" stroke="#22c55e" fillOpacity={1} fill="url(#colorFit)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-6">Weekly Volume & Load</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                        <YAxis yAxisId="left" stroke="#4ade80" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => Math.round(val).toString()} label={{ value: 'km', angle: -90, position: 'insideLeft', fill: '#4ade80' }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#f472b6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => Math.round(val).toString()} label={{ value: 'Load', angle: 90, position: 'insideRight', fill: '#f472b6' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} itemStyle={{ fontSize: '12px' }} />
                        <Bar yAxisId="left" dataKey="distance" fill="#4ade80" radius={[4, 4, 0, 0]} name="Distance (km)" barSize={30} />
                        <Line yAxisId="right" type="monotone" dataKey="load" stroke="#f472b6" strokeWidth={3} name="Training Load" dot={{r:4, fill:'#f472b6', strokeWidth:0}} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-2">Session Types</h3>
            <div className="flex-1 min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={zoneData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {zoneData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{color: '#fff'}} />
                        <Legend verticalAlign="bottom" height={36} iconType="plainline" wrapperStyle={{fontSize: '11px', color: '#94a3b8'}} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                    <span className="text-3xl font-bold text-white block">{workouts.length}</span>
                    <span className="text-xs text-slate-500 uppercase">Total</span>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-6">Efficiency Trend: HR vs Pace</h3>
        <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedWorkouts.map(w => ({ date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), pace: w.distance > 0 ? (w.duration / w.distance) : null, avgHr: w.avgHr || null })).filter(d => d.pace !== null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="#60a5fa" fontSize={11} domain={['dataMin', 'dataMax']} tickLine={false} axisLine={false} label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft', fill: '#60a5fa' }} tickFormatter={timeFormatter} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f87171" fontSize={11} domain={['dataMin - 10', 'auto']} tickLine={false} axisLine={false} label={{ value: 'HR (bpm)', angle: 90, position: 'insideRight', fill: '#f87171' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} formatter={(value: number, name: string) => name === 'Pace (min/km)' ? [timeFormatter(value), name] : [value, name]} />
                    <Legend iconType="plainline" wrapperStyle={{paddingTop: '10px'}} />
                    <Line yAxisId="left" type="monotone" dataKey="pace" stroke="#60a5fa" name="Pace (min/km)" strokeWidth={2} dot={{r:3}} activeDot={{r:6}} />
                    <Line yAxisId="right" type="monotone" dataKey="avgHr" stroke="#f87171" name="Avg HR" strokeWidth={2} connectNulls dot={{r:3}} activeDot={{r:6}} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-6">Shoe Rotation (km)</h3>
          <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shoeData} layout="vertical" margin={{ left: 40, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={12} width={150} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#334155', opacity: 0.4}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} name="Distance (km)" />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default Analysis;
