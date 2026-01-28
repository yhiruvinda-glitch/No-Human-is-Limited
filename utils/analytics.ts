
import { Workout, Goal, IntervalAnalysis, UserProfile, PersonalBest, WorkoutType, IntervalGroupStats, Season } from '../types';

// Helper: Parse "MM:SS" or "SS" or "M:SS.ms" into seconds
export const parseTimeStringToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const cleanStr = timeStr.trim().replace(/[^\d:.]/g, '');
    if (cleanStr.includes(':')) {
        const parts = cleanStr.split(':');
        if (parts.length === 2) return (Number(parts[0]) * 60) + Number(parts[1]);
        if (parts.length === 3) return (Number(parts[0]) * 3600) + (Number(parts[1]) * 60) + Number(parts[2]);
    }
    return Number(cleanStr);
};

export const formatSecondsToTime = (seconds: number, precision = false): string => {
    if (isNaN(seconds) || seconds === 0) return '-';
    let totalSeconds = Math.abs(seconds);
    if (precision) {
        totalSeconds = Math.round(totalSeconds * 100) / 100;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const sStr = s.toFixed(2).padStart(5, '0');
        return `${mStr}:${sStr}`;
    }
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    const sStr = Math.floor(s).toString().padStart(2, '0');
    return `${mStr}:${sStr}`;
};

export const calculatePaceFromSpeed = (seconds: number, meters: number): string => {
    if (!meters || !seconds) return '-';
    const km = meters / 1000;
    const minutes = seconds / 60;
    const paceDec = minutes / km;
    const pMin = Math.floor(paceDec);
    const pSec = (paceDec - pMin) * 60;
    return `${pMin < 10 ? '0' + pMin : pMin}:${pSec.toFixed(1).padStart(4, '0')}`;
};

export const formatMetric = (dist: number, dur: number, type: WorkoutType) => {
    if (dist === 0 || dur === 0) return '-';
    if (type === WorkoutType.CYCLE) {
        const hours = dur / 60;
        return `${(dist / hours).toFixed(1)} km/h`;
    }
    const totalMinutes = dur;
    const paceDec = totalMinutes / dist;
    const paceMin = Math.floor(paceDec);
    const paceSec = Math.round((paceDec - paceMin) * 60);
    return `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec}/km`;
};

export const getWorkoutSummary = (workout: Workout): string => {
    const isStructured = [WorkoutType.INTERVAL, WorkoutType.SPEED, WorkoutType.THRESHOLD, WorkoutType.HILLS].includes(workout.type);
    if (workout.type === WorkoutType.TEMPO) return `${workout.distance}km • ${formatSecondsToTime(workout.duration * 60)} (${formatMetric(workout.distance, workout.duration, workout.type)})`;
    if (isStructured && workout.intervals && workout.intervals.length > 0) {
        const groups: { label: string, count: number, recovery: string }[] = [];
        workout.intervals.forEach(interval => {
            const dist = interval.distance ? `${interval.distance}m` : null;
            const dur = interval.duration ? interval.duration : null;
            const label = dist || dur || 'Rep';
            const reps = interval.reps || 1;
            const rec = interval.recovery || '';
            if (groups.length > 0 && groups[groups.length - 1].label === label && groups[groups.length - 1].recovery === rec) {
                groups[groups.length - 1].count += reps;
            } else {
                groups.push({ label, count: reps, recovery: rec });
            }
        });
        return groups.map(g => g.recovery ? `${g.label} x ${g.count} w/ ${g.recovery}` : `${g.label} x ${g.count}`).join(' + ');
    }
    const h = Math.floor(workout.duration / 60);
    const m = Math.round(workout.duration % 60);
    const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return `${workout.distance}km • ${durStr}`;
}

export const extractSplitsFromText = (text: string): number[] => {
    const tokens = text.split(/[\n,\|\s]+/);
    const splits: number[] = [];
    tokens.forEach(token => {
        const t = token.trim();
        if (!t) return;
        if (/^(\d{1,2}:)?\d{2,3}(\.\d+)?$/.test(t) || /^\d{2,3}$/.test(t)) {
            const sec = parseTimeStringToSeconds(t);
            if (!isNaN(sec) && sec > 0 && sec < 3600) splits.push(sec);
        }
    });
    return splits;
};

export const analyzeIntervalSession = (workout: Workout, goals: Goal[]): IntervalAnalysis | null => {
    const reps: { distance: number, time: number, recovery: string }[] = [];
    if (workout.intervals && workout.intervals.length > 0) {
        workout.intervals.forEach(i => {
           const d = Number(i.distance) || 0;
           const t = parseTimeStringToSeconds(String(i.duration));
           const count = i.reps || 1;
           const rec = i.recovery || '';
           if (t > 0) for(let k=0; k<count; k++) reps.push({ distance: d, time: t, recovery: rec });
        });
    } else if (workout.splits && workout.splits.length > 0) {
        workout.splits.forEach(s => reps.push({ distance: 0, time: s, recovery: '' }));
    }
    if (reps.length === 0) return null;
    const groups: Record<number, { times: number[], recoveries: Set<string> }> = {};
    reps.forEach(r => {
        const key = r.distance;
        if (!groups[key]) groups[key] = { times: [], recoveries: new Set() };
        groups[key].times.push(r.time);
        if (r.recovery) groups[key].recoveries.add(r.recovery);
    });
    const groupStats: IntervalGroupStats[] = [];
    Object.entries(groups).forEach(([distStr, data]) => {
        const dist = Number(distStr);
        const times = data.times;
        const sum = times.reduce((a,b)=>a+b, 0);
        const avg = sum / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        const v = avg > 0 ? ((max - min) / avg) * 100 : 0;
        const recStr = Array.from(data.recoveries).join(' / ');
        groupStats.push({
            distance: dist,
            label: dist > 0 ? `${dist}m` : 'Split',
            count: times.length,
            avgTime: avg,
            bestTime: min,
            variation: v,
            pace: dist > 0 ? calculatePaceFromSpeed(avg, dist) : '-',
            reps: times,
            recovery: recStr
        });
    });
    groupStats.sort((a,b) => b.distance - a.distance);
    let weightedVarSum = 0;
    let totalDistWeight = 0;
    let simpleVarSum = 0;
    groupStats.forEach(g => {
        simpleVarSum += g.variation;
        const weight = g.distance * g.count; 
        if (weight > 0) {
            weightedVarSum += (g.variation * weight);
            totalDistWeight += weight;
        }
    });
    const avgVar = totalDistWeight > 0 ? weightedVarSum / totalDistWeight : (groupStats.length > 0 ? simpleVarSum / groupStats.length : 0);
    let consistencyLabel = 'Erratic';
    if (avgVar < 2) consistencyLabel = 'Metronomic';
    else if (avgVar < 5) consistencyLabel = 'Solid';
    else if (avgVar < 8) consistencyLabel = 'Variable';
    const totalDist = reps.reduce((sum, r) => sum + r.distance, 0);
    const qualityKm = totalDist / 1000;
    let consistencyScore = 100 - (avgVar * 5); 
    consistencyScore = Math.max(0, Math.min(100, consistencyScore));
    const rpeFactor = workout.rpe ? (10 - workout.rpe) * 2 : 0;
    const volumeBonus = qualityKm > 5 ? 10 : (qualityKm > 3 ? 5 : 0);
    const score = Math.round((consistencyScore * 0.7) + (rpeFactor * 0.3) + volumeBonus);
    return { totalReps: reps.length, qualityVolume: qualityKm, score: Math.min(100, score), consistencyLabel, variation: avgVar, groups: groupStats };
};

export const STANDARD_DISTANCES = [
    { name: '100m', km: 0.1 }, { name: '200m', km: 0.2 }, { name: '300m', km: 0.3 }, { name: '400m', km: 0.4 }, { name: '600m', km: 0.6 },
    { name: '800m', km: 0.8 }, { name: '1000m', km: 1.0 }, { name: '1200m', km: 1.2 }, { name: '1500m', km: 1.5 }, { name: '1600m', km: 1.6 },
    { name: '2000m', km: 2.0 }, { name: '3000m', km: 3.0 }, { name: '4000m', km: 4.0 }, { name: '5000m', km: 5.0 }, { name: '6000m', km: 6.0 },
    { name: '7000m', km: 7.0 }, { name: '8000m', km: 8.0 }, { name: '9000m', km: 9.0 }, { name: '10km', km: 10.0 }, { name: '15km', km: 15.0 },
    { name: 'Half Marathon', km: 21.0975 },
];

export const parseDistanceToKm = (distStr: string): number => {
    if (!distStr) return 0;
    const clean = distStr.toLowerCase().trim();
    if (clean === 'hm' || clean.includes('half')) return 21.0975;
    if (clean === 'fm' || clean === 'marathon') return 42.195;
    if (clean === '5k') return 5;
    if (clean === '10k') return 10;
    const std = STANDARD_DISTANCES.find(d => d.name.toLowerCase() === clean);
    if (std) return std.km;
    const num = parseFloat(clean.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return 0;
    if (clean.includes('km')) return num;
    if (clean.endsWith('k') && !clean.includes('c')) return num;
    if (clean.includes('m') && !clean.includes('km') && !clean.includes('mi')) return num / 1000;
    if (num >= 100) return num / 1000;
    return num;
};

const PB_ELIGIBLE_NAMES = ['1500m', '3000m', '5000m', '5K', '10K', '10000m', '10km', 'Half Marathon', 'Marathon'];

interface PerformanceSegment {
    distanceKm: number;
    durationMin: number;
    date: Date;
    workoutId: string;
}

const getSegmentsFromWorkout = (workout: Workout): PerformanceSegment[] => {
    const segments: PerformanceSegment[] = [];
    const date = new Date(workout.date);
    const hasIntervals = workout.intervals && workout.intervals.length > 0;
    if (hasIntervals && workout.type !== WorkoutType.TEMPO && workout.type !== WorkoutType.RACE) {
        workout.intervals!.forEach(set => {
            const distKm = (set.distance || 0) / 1000;
            const durMin = parseTimeStringToSeconds(set.duration || '0') / 60;
            const reps = set.reps || 1;
            if (distKm > 0 && durMin > 0) for(let i=0; i<reps; i++) segments.push({ distanceKm: distKm, durationMin: durMin, date, workoutId: workout.id });
        });
    }
    const typesExcludingTotal = [WorkoutType.INTERVAL, WorkoutType.SPEED, WorkoutType.HILLS, WorkoutType.THRESHOLD];
    if (!typesExcludingTotal.includes(workout.type)) {
        if (workout.distance > 0 && workout.duration > 0) segments.push({ distanceKm: workout.distance, durationMin: workout.duration, date, workoutId: workout.id });
    }
    return segments;
};

/**
 * Recalculates Records (PB/SB) and numbering of workout titles.
 * Numbering is strictly based on training season boundaries, not calendar years.
 */
export const recalculateRecords = (
    allWorkouts: Workout[], 
    activeSeasonStart?: string, 
    profilePbs?: PersonalBest[],
    allSeasons: Season[] = []
): Workout[] => {
    // 1. Reset and Initial Sorting (Oldest to Newest is critical for consistent numbering)
    const sortedWorkouts = [...allWorkouts]
        .map(w => ({ ...w, isPb: false, isSb: false }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Title Re-numbering Logic (Season-Based)
    const typeCounters: Record<string, Record<string, number>> = {}; // { seasonKey: { type: count } }

    const getSeasonIdAtDate = (date: Date): string => {
        // Robust date check: treat workout as UTC to align with season ISO strings
        const time = date.getTime();
        const season = allSeasons.find(s => {
            const start = new Date(s.startDate).getTime();
            const end = s.endDate ? new Date(s.endDate).getTime() : Infinity;
            return time >= start && time <= end;
        });
        // If no season found, fallback to calendar year string
        return season ? `S_${season.id}` : `Y_${date.getFullYear()}`;
    };

    sortedWorkouts.forEach(w => {
        if (w.type === WorkoutType.RACE) return; // Races don't get auto-numbered

        const seasonKey = getSeasonIdAtDate(new Date(w.date));
        if (!typeCounters[seasonKey]) typeCounters[seasonKey] = {};
        
        const countKey = w.type;
        typeCounters[seasonKey][countKey] = (typeCounters[seasonKey][countKey] || 0) + 1;
        const currentCount = typeCounters[seasonKey][countKey];

        // Standard auto-generated patterns: "Easy Run 1", "Tempo 5", "Road Tempo 2"
        const standardPattern = new RegExp(`^(${w.type}|Road Tempo|Tempo) \\d+$`);
        
        // If title is missing or matches an auto-generated pattern, RE-TITLE it with correct count
        if (!w.title || standardPattern.test(w.title)) {
            if (w.type === WorkoutType.TEMPO && w.surface === 'Road') {
                w.title = `Road Tempo ${currentCount}`;
            } else {
                w.title = `${w.type} ${currentCount}`;
            }
        }
    });

    // 3. PB Calculation (Global Log Bests)
    const getManualPbSeconds = (distName: string): number | null => {
        if (!profilePbs) return null;
        let pb = profilePbs.find(p => p.distance === distName);
        if (!pb && distName === '5000m') pb = profilePbs.find(p => p.distance === '5K');
        if (!pb && distName === '5K') pb = profilePbs.find(p => p.distance === '5000m');
        if (!pb && distName === '10km') pb = profilePbs.find(p => p.distance === '10K');
        if (!pb && distName === '10K') pb = profilePbs.find(p => p.distance === '10km');
        return pb ? parseTimeStringToSeconds(pb.time) : null;
    };

    const logBests: Record<string, { time: number, workoutId: string }> = {};
    sortedWorkouts.forEach(w => {
        const segments = getSegmentsFromWorkout(w);
        segments.forEach(seg => {
            const match = STANDARD_DISTANCES.find(sd => {
                 const tol = sd.km < 3 ? 0.03 : 0.1; 
                 return Math.abs(seg.distanceKm - sd.km) <= tol;
            });
            if (match && PB_ELIGIBLE_NAMES.includes(match.name)) {
                const sec = seg.durationMin * 60;
                if (!logBests[match.name] || sec < logBests[match.name].time) {
                    logBests[match.name] = { time: sec, workoutId: w.id };
                }
            }
        });
    });

    const validPbWorkoutIds = new Set<string>();
    Object.entries(logBests).forEach(([distName, bestLog]) => {
        const manualTime = getManualPbSeconds(distName);
        if (manualTime && bestLog.time > (manualTime + 0.05)) return;
        validPbWorkoutIds.add(bestLog.workoutId);
    });

    // 4. SB Calculation (Current Season)
    const sbBests: Record<string, { time: number, workoutId: string }> = {};
    const seasonStart = activeSeasonStart ? new Date(activeSeasonStart) : new Date(new Date().getFullYear(), 0, 1);
    sortedWorkouts.forEach(w => {
        if (new Date(w.date) < seasonStart) return;
        const segments = getSegmentsFromWorkout(w);
        segments.forEach(seg => {
            const match = STANDARD_DISTANCES.find(sd => {
                 const tol = sd.km < 3 ? 0.03 : 0.1; 
                 return Math.abs(seg.distanceKm - sd.km) <= tol;
            });
            if (match) {
                const sec = seg.durationMin * 60;
                if (!sbBests[match.name] || sec < sbBests[match.name].time) {
                    sbBests[match.name] = { time: sec, workoutId: w.id };
                }
            }
        });
    });

    const sbWorkoutIds = new Set(Object.values(sbBests).map(v => v.workoutId));
    
    // Apply final flags and return newest-first as expected by UI
    return sortedWorkouts.map(w => ({
        ...w,
        isPb: validPbWorkoutIds.has(w.id),
        isSb: sbWorkoutIds.has(w.id) && !validPbWorkoutIds.has(w.id)
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const calculateSeasonBests = (workouts: Workout[]): PersonalBest[] => {
    const bests: Record<string, { seconds: number, date: string }> = {};
    workouts.forEach(workout => {
        const segments = getSegmentsFromWorkout(workout);
        segments.forEach(segment => {
            const match = STANDARD_DISTANCES.find(sd => {
                 const tol = sd.km < 3 ? 0.03 : 0.1; 
                 return Math.abs(segment.distanceKm - sd.km) <= tol;
            });
            if (match) {
                const segSec = segment.durationMin * 60;
                if (!bests[match.name] || segSec < bests[match.name].seconds) bests[match.name] = { seconds: segSec, date: new Date(workout.date).toISOString() };
            }
        });
    });
    return Object.entries(bests).map(([name, data]) => ({ distance: name, time: formatSecondsToTime(data.seconds, true), date: data.date }))
        .sort((a, b) => (STANDARD_DISTANCES.find(d => d.name === a.distance)?.km || 0) - (STANDARD_DISTANCES.find(d => d.name === b.distance)?.km || 0));
};

export const detectBestEfforts = (newWorkout: Workout, history: Workout[], profile: UserProfile, seasonStartDate?: string): { isPb: boolean; isSb: boolean; distanceName?: string } => {
    const newSegments = getSegmentsFromWorkout(newWorkout);
    if (newSegments.length === 0) return { isPb: false, isSb: false };
    let isPb = false, isSb = false, distanceName: string | undefined = undefined;
    let seasonStartObj = seasonStartDate ? new Date(seasonStartDate) : new Date(new Date().getFullYear(), 0, 1);
    const seasonWorkouts = history.filter(w => new Date(w.date) >= seasonStartObj && w.id !== newWorkout.id);
    for (const segment of newSegments) {
        const segSec = segment.durationMin * 60;
        const stdMatch = STANDARD_DISTANCES.find(sd => {
             const tol = sd.km < 3 ? 0.03 : 0.1;
             return Math.abs(segment.distanceKm - sd.km) <= tol;
        });
        if (stdMatch && PB_ELIGIBLE_NAMES.includes(stdMatch.name)) {
            const existingPb = profile.pbs.find(pb => pb.distance === stdMatch.name || (stdMatch.name === '5000m' && pb.distance === '5K') || (stdMatch.name === '10km' && pb.distance === '10K')); 
            if (!existingPb) { if (!isPb) { isPb = true; distanceName = stdMatch.name; } }
            else { if (segSec < parseTimeStringToSeconds(existingPb.time)) { isPb = true; distanceName = stdMatch.name; } }
        }
        let bestInSeason = Infinity, foundComparison = false;
        const sbTol = stdMatch ? (stdMatch.km < 3 ? 0.03 : 0.1) : (segment.distanceKm < 1 ? 0.02 : 0.1);
        seasonWorkouts.forEach(oldW => {
            const oldSegments = getSegmentsFromWorkout(oldW);
            oldSegments.forEach(os => {
                if (Math.abs(os.distanceKm - segment.distanceKm) <= sbTol) {
                    foundComparison = true;
                    const osSec = os.durationMin * 60;
                    if (osSec < bestInSeason) bestInSeason = osSec;
                }
            });
        });
        if (foundComparison) {
            if (segSec < bestInSeason) {
                isSb = true;
                if (!distanceName || (stdMatch && distanceName.includes('km'))) distanceName = stdMatch ? stdMatch.name : `${segment.distanceKm >= 1 ? segment.distanceKm.toFixed(2) + 'km' : Math.round(segment.distanceKm * 1000) + 'm'}`;
            }
        } else if (stdMatch) { isSb = true; if (!distanceName) distanceName = stdMatch.name; }
    }
    if (isPb) return { isPb: true, isSb: false, distanceName };
    if (isSb) return { isPb: false, isSb: true, distanceName };
    return { isPb: false, isSb: false };
};

/**
 * FITNESS SCORING (Strava-style CTL/ATL/TSB)
 */
export interface TrainingStressPoint {
    date: string;
    fitness: number;  // CTL
    fatigue: number;  // ATL
    form: number;     // TSB
}

export const calculateFitnessHistory = (workouts: Workout[]): TrainingStressPoint[] => {
    if (workouts.length === 0) return [];
    
    // Sort oldest to newest
    const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Group load by day
    const loadByDay: Record<string, number> = {};
    sorted.forEach(w => {
        const dStr = w.date.split('T')[0];
        const load = w.trainingLoad || (w.duration * w.rpe);
        loadByDay[dStr] = (loadByDay[dStr] || 0) + load;
    });

    // Create full timeline from first workout to today
    const firstDate = new Date(sorted[0].date);
    const lastDate = new Date();
    const history: TrainingStressPoint[] = [];

    let currentFitness = 0; // CTL (42 day constant)
    let currentFatigue = 0; // ATL (7 day constant)
    
    const ctlConst = 1/42;
    const atlConst = 1/7;

    for (let d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
        const dStr = d.toISOString().split('T')[0];
        const dayLoad = loadByDay[dStr] || 0;

        // Exponential Moving Average Model
        // Today's CTL = Yesterday's CTL + (Today's Load - Yesterday's CTL) * (1/42)
        currentFitness = currentFitness + (dayLoad - currentFitness) * ctlConst;
        
        // Today's ATL = Yesterday's ATL + (Today's Load - Yesterday's ATL) * (1/7)
        currentFatigue = currentFatigue + (dayLoad - currentFatigue) * atlConst;

        history.push({
            date: dStr,
            fitness: Number(currentFitness.toFixed(1)),
            fatigue: Number(currentFatigue.toFixed(1)),
            form: Number((currentFitness - currentFatigue).toFixed(1))
        });
    }

    return history;
};

export const getTSBStatus = (tsb: number): { label: string, color: string } => {
    if (tsb > 5) return { label: 'Fresh / Peak', color: 'text-blue-400' };
    if (tsb >= -10) return { label: 'Maintenance', color: 'text-green-400' };
    if (tsb >= -30) return { label: 'Optimal Training', color: 'text-brand-400' };
    return { label: 'High Fatigue / Overreaching', color: 'text-red-400' };
};
