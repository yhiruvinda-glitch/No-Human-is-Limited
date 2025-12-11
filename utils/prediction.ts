import { Workout, Goal, WorkoutType, RacePrediction } from '../types';
import { parseTimeStringToSeconds, formatSecondsToTime } from './analytics';

// Standard Distances for Prediction
const DISTANCES = [
  { name: '1500m', km: 1.5 },
  { name: '3000m', km: 3.0 },
  { name: '5000m', km: 5.0 },
  { name: '10K', km: 10.0 },
  { name: 'Half Marathon', km: 21.0975 }
];

// Riegel Formula with Dynamic Fatigue Factor
// t2 = t1 * (d2 / d1)^exponent
const predictTime = (baseSeconds: number, baseKm: number, targetKm: number): number => {
  let exponent = 1.08; // Default conservative decay (Standard Riegel is 1.06)

  // Penalty for extrapolating short anaerobic efforts to long aerobic distances
  // If source is short (< 4km) and target is significantly longer
  if (baseKm < 4 && targetKm > baseKm) {
      exponent = 1.12; 
  }

  return baseSeconds * Math.pow((targetKm / baseKm), exponent);
};

// Calculate VDOT (Approximation)
// Using a simplified lookup or regression is common, but for dynamic UI, 
// we can use 5K equivalent pace as a proxy for VDOT "points"
export const calculateVDOT = (fiveKTimeSeconds: number): number => {
    // Regression for VDOT based on 5k time (minutes)
    const minutes = fiveKTimeSeconds / 60;
    if (minutes === 0) return 0;
    // Linear approx for the 15:00-25:00 range
    return Number((285 / minutes) + 12).toFixed(1) as unknown as number; 
};

export const getBestPerformance = (workouts: Workout[], goals: Goal[]): { seconds: number, km: number, score: number, source: string } => {
    // 1. Start with Goal Current Best (Manual Anchor)
    let bestPerf = { seconds: 0, km: 0, score: 0, source: 'Baseline' };

    goals.forEach(g => {
        const sec = parseTimeStringToSeconds(g.currentBest);
        // Score is speed (km/s) roughly, or just compare 5k normalized time
        if (sec > 0 && g.targetDistance > 0) {
             const pred5k = predictTime(sec, g.targetDistance, 5);
             const speedScore = 5 / pred5k; // Higher is better
             if (speedScore > bestPerf.score) {
                 bestPerf = { seconds: sec, km: g.targetDistance, score: speedScore, source: 'Manual Goal' };
             }
        }
    });

    // 2. Scan Workouts for Races or Quality Sessions (Last 90 Days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // RESTRICTED PREDICTION TYPES
    // We strictly exclude Intervals/Speed/Hills as rest periods artificially inflate predictive capability.
    // Only continuous or long-rep aerobic work (Threshold/Tempo) or Races are allowed.
    const PREDICTION_TYPES = [
        WorkoutType.RACE,
        WorkoutType.TEMPO,
        WorkoutType.THRESHOLD
    ];

    workouts.forEach(w => {
        if (!PREDICTION_TYPES.includes(w.type)) return;
        if (new Date(w.date) < ninetyDaysAgo) return;
        
        // RPE Filter for non-races
        if (w.type !== WorkoutType.RACE && (!w.rpe || w.rpe < 7)) return;

        let durationSec = 0;
        let distanceKm = 0;

        // Smart Extraction: "Active Work" only.
        if (w.intervals && w.intervals.length > 0) {
             w.intervals.forEach(i => {
                 const d = Number(i.distance) || 0;
                 const t = parseTimeStringToSeconds(String(i.duration));
                 const reps = i.reps || 1;
                 if (d > 0 && t > 0) {
                     distanceKm += (d * reps) / 1000;
                     durationSec += (t * reps);
                 }
             });
        }
        
        // Fallback or if intervals empty (Continuous Tempo/Threshold/Race)
        if (distanceKm === 0 || durationSec === 0) {
            distanceKm = w.distance;
            durationSec = w.duration * 60;
        }

        if (distanceKm <= 0 || durationSec <= 0) return;

        // INCREASED GUARD: Minimum 3km volume (was 2km)
        // Ensures only substantial aerobic efforts predict race times
        if (w.type !== WorkoutType.RACE && distanceKm < 3) return;

        // Normalize to 5k
        const pred5k = predictTime(durationSec, distanceKm, 5);
        const speedScore = 5 / pred5k;

        if (speedScore > bestPerf.score) {
            bestPerf = {
                seconds: durationSec,
                km: distanceKm,
                score: speedScore,
                source: `Log: ${w.title || w.type} (${new Date(w.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})})`
            };
        }
    });

    return bestPerf;
};

export const generateRacePredictions = (workouts: Workout[], goals: Goal[]): RacePrediction[] => {
    const base = getBestPerformance(workouts, goals);
    
    if (base.km === 0) return []; // No data

    return DISTANCES.map(d => {
        const seconds = predictTime(base.seconds, base.km, d.km);
        const paceSec = seconds / d.km;
        return {
            distanceName: d.name,
            distanceKm: d.km,
            predictedSeconds: seconds,
            predictedTime: formatSecondsToTime(seconds),
            formattedPace: `${Math.floor(paceSec / 60)}:${Math.round(paceSec % 60).toString().padStart(2, '0')}/km`,
            source: base.source
        };
    });
};

export const getGoalProgressPrediction = (goal: Goal, predictions: RacePrediction[]) => {
    // Find the closest standard prediction to the goal distance
    const exactMatch = predictions.find(p => Math.abs(p.distanceKm - goal.targetDistance) < 0.2);
    
    if (exactMatch) {
        return exactMatch;
    }
    
    // If non-standard distance, calculate specific
    // Need base first
    const base = predictions.find(p => p.distanceName === '5000m'); // Use 5k as base
    if (!base) return null;

    const seconds = predictTime(base.predictedSeconds, 5, goal.targetDistance);
    const paceSec = seconds / goal.targetDistance;
    
    return {
        distanceName: `${goal.targetDistance}km`,
        distanceKm: goal.targetDistance,
        predictedSeconds: seconds,
        predictedTime: formatSecondsToTime(seconds),
        formattedPace: `${Math.floor(paceSec / 60)}:${Math.round(paceSec % 60).toString().padStart(2, '0')}/km`,
        source: base.source
    };
};

export const getFitnessTrend = (workouts: Workout[]) => {
    // Return an array of { date: string, predicted5k: number (seconds) }
    // Sort workouts old to new
    const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // For every workout, look at the window of past 42 days (6 weeks) to find "Peak Fitness" at that moment
    const trendPoints: { date: string, predicted5k: number | null }[] = [];

    // Align quality types with prediction engine to ensure graph consistency
    const QUALITY_TYPES = [
        WorkoutType.RACE, 
        WorkoutType.TEMPO, 
        WorkoutType.THRESHOLD
    ];

    sorted.forEach((w, idx) => {
        const currentDate = new Date(w.date);
        const windowStart = new Date(currentDate);
        windowStart.setDate(windowStart.getDate() - 42);

        // Find best performance in window
        const recentWorkouts = sorted.slice(0, idx + 1).filter(rw => 
            new Date(rw.date) >= windowStart && 
            QUALITY_TYPES.includes(rw.type)
        );

        let best5kSeconds: number | null = null;

        recentWorkouts.forEach(rw => {
            let durationSec = 0;
            let distanceKm = 0;

            // Same extraction logic as getBestPerformance
            if (rw.intervals && rw.intervals.length > 0) {
                 rw.intervals.forEach(i => {
                     const d = Number(i.distance) || 0;
                     const t = parseTimeStringToSeconds(String(i.duration));
                     const r = i.reps || 1;
                     if (d > 0 && t > 0) {
                         distanceKm += (d * r) / 1000;
                         durationSec += (t * r);
                     }
                 });
            }

            // Fallback
            if (distanceKm === 0 || durationSec === 0) {
                 distanceKm = rw.distance;
                 durationSec = rw.duration * 60;
            }

            if (distanceKm > 0 && durationSec > 0) {
                // Apply strict 3km rule for trend as well
                if (rw.type !== WorkoutType.RACE && distanceKm < 3) return;

                // Riegel to 5k
                const pred = predictTime(durationSec, distanceKm, 5);
                // We want the lowest time (fastest)
                if (best5kSeconds === null || pred < best5kSeconds) {
                    best5kSeconds = pred;
                }
            }
        });

        if (best5kSeconds) {
            trendPoints.push({
                date: w.date.split('T')[0],
                predicted5k: best5kSeconds
            });
        }
    });

    return trendPoints;
};