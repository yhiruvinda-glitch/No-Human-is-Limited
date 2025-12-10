
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

// Riegel Formula: t2 = t1 * (d2 / d1)^1.06
const predictTime = (baseSeconds: number, baseKm: number, targetKm: number): number => {
  return baseSeconds * Math.pow((targetKm / baseKm), 1.06);
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
        const speed = g.targetDistance / sec; 
        if (speed > bestPerf.score) {
            bestPerf = { seconds: sec, km: g.targetDistance, score: speed, source: 'Manual Goal' };
        }
    });

    // 2. Scan Workouts for Races or Time Trials (Last 90 Days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    workouts.forEach(w => {
        if (new Date(w.date) >= ninetyDaysAgo && (w.type === WorkoutType.RACE || (w.type === WorkoutType.TEMPO && w.rpe >= 9))) {
             const durationSec = w.duration * 60;
             if (durationSec === 0 || w.distance === 0) return;
             
             const speed = w.distance / durationSec;
             
             // Normalize existing best to 5k speed for fair comparison
             const pred5kCurrent = bestPerf.km ? predictTime(bestPerf.seconds, bestPerf.km, 5) : 99999;
             const speed5kCurrent = 5 / pred5kCurrent;

             const pred5kNew = predictTime(durationSec, w.distance, 5);
             const speed5kNew = 5 / pred5kNew;

             if (speed5kNew > speed5kCurrent) {
                 bestPerf = { seconds: durationSec, km: w.distance, score: speed, source: `Log: ${w.date.split('T')[0]}` };
             }
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
            formattedPace: `${Math.floor(paceSec / 60)}:${Math.round(paceSec % 60).toString().padStart(2, '0')}/km`
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
        formattedPace: `${Math.floor(paceSec / 60)}:${Math.round(paceSec % 60).toString().padStart(2, '0')}/km`
    };
};

export const getFitnessTrend = (workouts: Workout[]) => {
    // Return an array of { date: string, predicted5k: number (seconds) }
    // Sort workouts old to new
    const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // For every workout, look at the window of past 42 days (6 weeks) to find "Peak Fitness" at that moment
    const trendPoints: { date: string, predicted5k: number | null }[] = [];

    sorted.forEach((w, idx) => {
        const currentDate = new Date(w.date);
        const windowStart = new Date(currentDate);
        windowStart.setDate(windowStart.getDate() - 42);

        // Find best performance in window
        const recentWorkouts = sorted.slice(0, idx + 1).filter(rw => 
            new Date(rw.date) >= windowStart && 
            (rw.type === WorkoutType.RACE || rw.type === WorkoutType.INTERVAL || rw.type === WorkoutType.TEMPO)
        );

        let best5kSeconds = null;

        recentWorkouts.forEach(rw => {
            const durationSec = rw.duration * 60;
            if (rw.distance > 0 && durationSec > 0) {
                // Riegel to 5k
                const pred = predictTime(durationSec, rw.distance, 5);
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
