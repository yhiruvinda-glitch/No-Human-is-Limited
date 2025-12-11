

import { Workout, Goal, IntervalAnalysis, UserProfile, PersonalBest, WorkoutType, IntervalGroupStats } from '../types';

// Helper: Parse "MM:SS" or "SS" or "M:SS.ms" into seconds
export const parseTimeStringToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    // Remove clean up
    const cleanStr = timeStr.trim().replace(/[^\d:.]/g, '');
    
    if (cleanStr.includes(':')) {
        const parts = cleanStr.split(':');
        if (parts.length === 2) {
            return (Number(parts[0]) * 60) + Number(parts[1]);
        }
        if (parts.length === 3) {
            return (Number(parts[0]) * 3600) + (Number(parts[1]) * 60) + Number(parts[2]);
        }
    }
    return Number(cleanStr);
};

// Helper: Format seconds back to MM:SS or SS.ms or MM:SS.d
export const formatSecondsToTime = (seconds: number, precision = false): string => {
    if (isNaN(seconds) || seconds === 0) return '-';
    
    let totalSeconds = Math.abs(seconds);
    
    if (precision) {
        // Round to 2 decimals to avoid floating point weirdness (e.g. 59.999 -> 60.00)
        totalSeconds = Math.round(totalSeconds * 100) / 100;
        
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const sStr = s.toFixed(2).padStart(5, '0'); // Ensures 05.00 format
        
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
    
    if (workout.type === WorkoutType.TEMPO) {
        return `${workout.distance}km • ${formatSecondsToTime(workout.duration * 60)} (${formatMetric(workout.distance, workout.duration, workout.type)})`;
    }

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

// Extract splits from a text block
export const extractSplitsFromText = (text: string): number[] => {
    // Splits by comma, newline, pipe, or multiple spaces
    const tokens = text.split(/[\n,\|\s]+/);
    const splits: number[] = [];

    tokens.forEach(token => {
        // Matches: 72, 72.5, 1:12, 01:12.5
        const t = token.trim();
        if (!t) return;

        // Check for time format MM:SS or SSS or SS.ms
        // We want to avoid matching random words, but typical split inputs are digits
        if (/^(\d{1,2}:)?\d{2,3}(\.\d+)?$/.test(t) || /^\d{2,3}$/.test(t)) {
            const sec = parseTimeStringToSeconds(t);
            // Reasonable filter: splits usually aren't 0 or > 1 hour for intervals
            if (!isNaN(sec) && sec > 0 && sec < 3600) {
                splits.push(sec);
            }
        }
    });

    return splits;
};

export const analyzeIntervalSession = (workout: Workout, goals: Goal[]): IntervalAnalysis | null => {
    // 1. Flatten Data to individual reps
    const reps: { distance: number, time: number, recovery: string }[] = [];

    // Prioritize intervals array if detailed
    if (workout.intervals && workout.intervals.length > 0) {
        workout.intervals.forEach(i => {
           const d = Number(i.distance) || 0;
           const t = parseTimeStringToSeconds(String(i.duration));
           const count = i.reps || 1;
           const rec = i.recovery || '';
           if (t > 0) {
             for(let k=0; k<count; k++) reps.push({ distance: d, time: t, recovery: rec });
           }
        });
    }
    // Fallback to splits if intervals empty but splits exist (e.g. Rapid Entry)
    else if (workout.splits && workout.splits.length > 0) {
        workout.splits.forEach(s => {
            reps.push({ distance: 0, time: s, recovery: '' });
        });
    }

    if (reps.length === 0) return null;

    // 2. Group by Distance
    const groups: Record<number, { times: number[], recoveries: Set<string> }> = {};
    reps.forEach(r => {
        const key = r.distance;
        if (!groups[key]) groups[key] = { times: [], recoveries: new Set() };
        groups[key].times.push(r.time);
        if (r.recovery) groups[key].recoveries.add(r.recovery);
    });

    // 3. Calculate Group Stats
    const groupStats: IntervalGroupStats[] = [];

    Object.entries(groups).forEach(([distStr, data]) => {
        const dist = Number(distStr);
        const times = data.times;
        const sum = times.reduce((a,b)=>a+b, 0);
        const avg = sum / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        // Calculate variation for this group
        const v = avg > 0 ? ((max - min) / avg) * 100 : 0;
        
        // Format recovery string (join unique recoveries)
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

    // Sort groups by distance descending
    groupStats.sort((a,b) => b.distance - a.distance);

    // 4. Overall Stats (Weighted Average Variation by Distance)
    let weightedVarSum = 0;
    let totalDistWeight = 0;
    let simpleVarSum = 0;

    groupStats.forEach(g => {
        simpleVarSum += g.variation;
        // Weight by total distance (distance * reps count)
        const weight = g.distance * g.count; 
        
        if (weight > 0) {
            weightedVarSum += (g.variation * weight);
            totalDistWeight += weight;
        }
    });

    // If total distance weight is > 0 (distance based), use weighted average
    // Otherwise (if time based or distance missing), fall back to simple average
    const avgVar = totalDistWeight > 0 
        ? weightedVarSum / totalDistWeight 
        : (groupStats.length > 0 ? simpleVarSum / groupStats.length : 0);
    
    let consistencyLabel = 'Erratic';
    if (avgVar < 2) consistencyLabel = 'Metronomic';
    else if (avgVar < 5) consistencyLabel = 'Solid';
    else if (avgVar < 8) consistencyLabel = 'Variable';

    const totalDist = reps.reduce((sum, r) => sum + r.distance, 0);
    const qualityKm = totalDist / 1000;

    // Score Calculation
    let consistencyScore = 100 - (avgVar * 5); 
    consistencyScore = Math.max(0, Math.min(100, consistencyScore));
    const rpeFactor = workout.rpe ? (10 - workout.rpe) * 2 : 0;
    // Boost score if substantial volume
    const volumeBonus = qualityKm > 5 ? 10 : (qualityKm > 3 ? 5 : 0);
    
    const score = Math.round((consistencyScore * 0.7) + (rpeFactor * 0.3) + volumeBonus);

    return {
        totalReps: reps.length,
        qualityVolume: qualityKm,
        score: Math.min(100, score),
        consistencyLabel,
        variation: avgVar,
        groups: groupStats
    };
};

// STANDARD DISTANCES for PB/SB Detection (Updated list to match request)
export const STANDARD_DISTANCES = [
    { name: '100m', km: 0.1 },
    { name: '200m', km: 0.2 },
    { name: '300m', km: 0.3 },
    { name: '400m', km: 0.4 },
    { name: '600m', km: 0.6 },
    { name: '800m', km: 0.8 },
    { name: '1000m', km: 1.0 },
    { name: '1200m', km: 1.2 },
    { name: '1500m', km: 1.5 },
    { name: '1600m', km: 1.6 },
    { name: '2000m', km: 2.0 },
    { name: '3000m', km: 3.0 },
    { name: '4000m', km: 4.0 },
    { name: '5000m', km: 5.0 },
    { name: '6000m', km: 6.0 },
    { name: '7000m', km: 7.0 },
    { name: '8000m', km: 8.0 },
    { name: '9000m', km: 9.0 },
    { name: '10km', km: 10.0 },
    { name: '15km', km: 15.0 },
    { name: 'Half Marathon', km: 21.0975 },
];

// Robust distance string to KM parser
export const parseDistanceToKm = (distStr: string): number => {
    if (!distStr) return 0;
    
    const clean = distStr.toLowerCase().trim();
    
    // Check known aliases
    if (clean === 'hm' || clean.includes('half')) return 21.0975;
    if (clean === 'fm' || clean === 'marathon') return 42.195;
    if (clean === '5k') return 5;
    if (clean === '10k') return 10;

    // Check standard distances list
    const std = STANDARD_DISTANCES.find(d => d.name.toLowerCase() === clean);
    if (std) return std.km;

    // Extract number
    const num = parseFloat(clean.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return 0;

    // Heuristics
    // If unit contains 'km' or 'k', return number
    if (clean.includes('km')) return num;
    if (clean.endsWith('k') && !clean.includes('c')) return num; // 10k but not "track"

    // If unit contains 'm' but not 'km', assume meters
    if (clean.includes('m') && !clean.includes('km') && !clean.includes('mi')) {
        return num / 1000;
    }

    // Fallback: If number is > 100, assume meters (e.g. 5000 -> 5km)
    if (num >= 100) return num / 1000;
    
    // Default assume KM
    return num;
};

// STRICT LIST of distances eligible for PROFILE PBs
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

    // Strategy:
    // 1. Intervals: Extract all individual rep segments.
    // 2. Total: Extract total distance/duration if appropriate.
    
    const hasIntervals = workout.intervals && workout.intervals.length > 0;

    // 1. Extract Intervals (if present)
    // NOTE: We do NOT count Tempo splits as separate SB segments, only the total run.
    if (hasIntervals && workout.type !== WorkoutType.TEMPO) {
        workout.intervals!.forEach(set => {
            const distKm = (set.distance || 0) / 1000;
            const durMin = parseTimeStringToSeconds(set.duration || '0') / 60;
            const reps = set.reps || 1;
            
            if (distKm > 0 && durMin > 0) {
                for(let i=0; i<reps; i++) {
                    segments.push({ distanceKm: distKm, durationMin: durMin, date, workoutId: workout.id });
                }
            }
        });
    }

    // 2. Extract Total
    // User Requirement: Do not count total distance for Speed, Threshold, Hills, Intervals.
    const typesExcludingTotal = [
        WorkoutType.INTERVAL, 
        WorkoutType.SPEED, 
        WorkoutType.HILLS, 
        WorkoutType.THRESHOLD
    ];

    const shouldIncludeTotal = !typesExcludingTotal.includes(workout.type);

    if (shouldIncludeTotal) {
        if (workout.distance > 0 && workout.duration > 0) {
             segments.push({ 
                distanceKm: workout.distance, 
                durationMin: workout.duration, 
                date, 
                workoutId: workout.id 
            });
        }
    }

    return segments;
};

// Recalculate PB and SB flags for entire history
export const recalculateRecords = (allWorkouts: Workout[], seasonStartDate?: string): Workout[] => {
    // 1. Reset all flags
    const resetWorkouts = allWorkouts.map(w => ({ ...w, isPb: false, isSb: false }));

    // 2. Identify Global PBs
    const pbBests: Record<string, { time: number, workoutId: string }> = {};

    resetWorkouts.forEach(w => {
        const segments = getSegmentsFromWorkout(w);
        segments.forEach(seg => {
            // Check against PB eligible distances
            const match = STANDARD_DISTANCES.find(sd => {
                 const tol = sd.km < 3 ? 0.03 : 0.1; 
                 return Math.abs(seg.distanceKm - sd.km) <= tol;
            });

            if (match && PB_ELIGIBLE_NAMES.includes(match.name)) {
                const sec = seg.durationMin * 60;
                if (!pbBests[match.name] || sec < pbBests[match.name].time) {
                    pbBests[match.name] = { time: sec, workoutId: w.id };
                }
            }
        });
    });

    // 3. Identify Season Bests
    const sbBests: Record<string, { time: number, workoutId: string }> = {};
    const seasonStart = seasonStartDate ? new Date(seasonStartDate) : new Date(new Date().getFullYear(), 0, 1);

    resetWorkouts.forEach(w => {
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

    // 4. Apply flags
    const pbWorkoutIds = new Set(Object.values(pbBests).map(v => v.workoutId));
    const sbWorkoutIds = new Set(Object.values(sbBests).map(v => v.workoutId));

    return resetWorkouts.map(w => ({
        ...w,
        isPb: pbWorkoutIds.has(w.id),
        isSb: sbWorkoutIds.has(w.id)
    }));
};

// HELPER: Scan a list of workouts and return ALL bests for standard distances
export const calculateSeasonBests = (workouts: Workout[]): PersonalBest[] => {
    const bests: Record<string, { seconds: number, date: string }> = {}; // distanceName -> {seconds, date}

    workouts.forEach(workout => {
        const segments = getSegmentsFromWorkout(workout);
        segments.forEach(segment => {
            // Check against standard distances
            const match = STANDARD_DISTANCES.find(sd => {
                 // Stricter tolerance for short distances (< 3km) to distinguish between 1500m and 1600m
                 const tol = sd.km < 3 ? 0.03 : 0.1; 
                 return Math.abs(segment.distanceKm - sd.km) <= tol;
            });
            
            if (match) {
                const segSec = segment.durationMin * 60;
                if (!bests[match.name] || segSec < bests[match.name].seconds) {
                    bests[match.name] = { seconds: segSec, date: new Date(workout.date).toISOString() };
                }
            }
        });
    });

    // Convert to PersonalBest array
    return Object.entries(bests)
        .map(([name, data]) => ({
            distance: name,
            time: formatSecondsToTime(data.seconds, true),
            date: data.date
        }))
        // Sort by distance roughly
        .sort((a, b) => {
             const distA = STANDARD_DISTANCES.find(d => d.name === a.distance)?.km || 0;
             const distB = STANDARD_DISTANCES.find(d => d.name === b.distance)?.km || 0;
             return distA - distB;
        });
};

export const detectBestEfforts = (
    newWorkout: Workout, 
    history: Workout[], 
    profile: UserProfile,
    seasonStartDate?: string
): { isPb: boolean; isSb: boolean; distanceName?: string } => {
    
    const newSegments = getSegmentsFromWorkout(newWorkout);
    if (newSegments.length === 0) return { isPb: false, isSb: false };

    let isPb = false;
    let isSb = false;
    let distanceName: string | undefined = undefined;

    // Filter history for Season Window
    let seasonStartObj = new Date();
    if (seasonStartDate) {
        seasonStartObj = new Date(seasonStartDate);
    } else {
        // Fallback to Jan 1 of current year
        seasonStartObj = new Date(new Date().getFullYear(), 0, 1);
    }

    // Workouts in current season, EXCLUDING the new one (if it's already in history, though normally this func is called before save)
    const seasonWorkouts = history.filter(w => new Date(w.date) >= seasonStartObj && w.id !== newWorkout.id);
    
    // Analyze each segment from the new workout
    for (const segment of newSegments) {
        const segSec = segment.durationMin * 60;

        // 1. Identify Standard Distance
        const stdMatch = STANDARD_DISTANCES.find(sd => {
             const tol = sd.km < 3 ? 0.03 : 0.1;
             return Math.abs(segment.distanceKm - sd.km) <= tol;
        });

        // PB CHECK (Only for strict eligible distances)
        if (stdMatch && PB_ELIGIBLE_NAMES.includes(stdMatch.name)) {
            const existingPb = profile.pbs.find(pb => 
                pb.distance === stdMatch.name || 
                (stdMatch.name === '5000m' && pb.distance === '5K') ||
                (stdMatch.name === '10km' && pb.distance === '10K')
            ); 
            
            if (!existingPb) {
                 if (!isPb) { isPb = true; distanceName = stdMatch.name; }
            } else {
                 const pbSec = parseTimeStringToSeconds(existingPb.time);
                 if (segSec < pbSec) {
                     isPb = true; 
                     distanceName = stdMatch.name;
                 }
            }
        }

        // 2. Check for SB (Season Best)
        let bestInSeason = Infinity;
        let foundComparison = false;

        // Use strict tolerance for SB comparison
        const sbTol = stdMatch 
            ? (stdMatch.km < 3 ? 0.03 : 0.1) 
            : (segment.distanceKm < 1 ? 0.02 : 0.1);

        // Find best previous effort in this season for this distance
        seasonWorkouts.forEach(oldW => {
            const oldSegments = getSegmentsFromWorkout(oldW);
            oldSegments.forEach(os => {
                if (Math.abs(os.distanceKm - segment.distanceKm) <= sbTol) {
                    foundComparison = true;
                    const osSec = os.durationMin * 60;
                    if (osSec < bestInSeason) {
                        bestInSeason = osSec;
                    }
                }
            });
        });

        if (foundComparison) {
            // Check if we beat the previous best
            if (segSec < bestInSeason) {
                isSb = true;
                // Prefer Standard Name if available, else format distance
                if (!distanceName || (stdMatch && distanceName.includes('km'))) {
                    distanceName = stdMatch ? stdMatch.name : `${segment.distanceKm >= 1 ? segment.distanceKm.toFixed(2) + 'km' : Math.round(segment.distanceKm * 1000) + 'm'}`;
                }
            }
        } else {
            // First time this season for a STANDARD distance = Initial SB
            if (stdMatch) {
                isSb = true;
                if (!distanceName) {
                    distanceName = stdMatch.name;
                }
            }
        }
    }

    // Prioritize PB display over SB
    if (isPb) return { isPb: true, isSb: false, distanceName };
    if (isSb) return { isPb: false, isSb: true, distanceName };

    return { isPb: false, isSb: false };
};
