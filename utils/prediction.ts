
import { Workout, Goal, WorkoutType, RacePrediction } from '../types';
import { parseTimeStringToSeconds, formatSecondsToTime } from './analytics';

// Standard Distances for Prediction
export const DISTANCES = [
  { name: '1500m', km: 1.5 },
  { name: '3000m', km: 3.0 },
  { name: '5000m', km: 5.0 },
  { name: '10K', km: 10.0 },
  { name: 'Half Marathon', km: 21.0975 }
];

// Lookback period for finding quality signals
const SIGNAL_LOOKBACK_DAYS = 45;

// Baseline volumes for "Standard" signal quality
// Sessions exceeding these volumes get a "Volume Bonus" in the quality score
const BASELINE_VOLUMES: Record<string, number> = {
    SPEED: 1.5,
    INTERVAL: 4.0,
    THRESHOLD: 6.0,
    TEMPO: 8.0,
    MILEAGE: 12.0
};

// Weight Matrix
const WEIGHT_MATRIX: Record<string, Record<string, number>> = {
    '1500m': { SPEED: 0.35, INTERVAL: 0.30, THRESHOLD: 0.15, TEMPO: 0.10, MILEAGE: 0.10 },
    '3000m': { INTERVAL: 0.30, THRESHOLD: 0.25, TEMPO: 0.20, SPEED: 0.15, MILEAGE: 0.10 },
    '5000m': { THRESHOLD: 0.30, INTERVAL: 0.25, TEMPO: 0.20, SPEED: 0.10, MILEAGE: 0.15 },
    '10K':   { THRESHOLD: 0.40, TEMPO: 0.25, MILEAGE: 0.20, INTERVAL: 0.10, SPEED: 0.05 },
    'Half Marathon': { TEMPO: 0.35, THRESHOLD: 0.35, MILEAGE: 0.20, INTERVAL: 0.07, SPEED: 0.03 }
};

const TRAINING_COMPONENTS = {
    SPEED: [WorkoutType.SPEED], 
    INTERVAL: [WorkoutType.INTERVAL], 
    THRESHOLD: [WorkoutType.THRESHOLD], 
    TEMPO: [WorkoutType.TEMPO], 
    MILEAGE: [WorkoutType.LONG] 
};

// Riegel Formula
const predictTime = (baseSeconds: number, baseKm: number, targetKm: number): number => {
  let exponent = 1.06; 
  return baseSeconds * Math.pow((targetKm / baseKm), exponent);
};

export const calculateVDOT = (fiveKTimeSeconds: number): number => {
    const minutes = fiveKTimeSeconds / 60;
    if (minutes === 0) return 0;
    return Number((285 / minutes) + 12).toFixed(1) as unknown as number; 
};

// Helper: Get data from a workout for prediction
const extractWorkoutData = (w: Workout): { seconds: number, km: number, rpe: number } | null => {
    let durationSec = 0;
    let distanceKm = 0;

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
    
    if (distanceKm === 0 || durationSec === 0) {
        distanceKm = w.distance;
        durationSec = w.duration * 60;
    }

    if (distanceKm <= 0 || durationSec <= 0) return null;

    // Adjustments for non-max efforts
    if (w.type === WorkoutType.LONG) {
        durationSec = durationSec * 0.85; 
    }

    return { seconds: durationSec, km: distanceKm, rpe: w.rpe || 7 };
};

const getComponentCategory = (w: Workout): string => {
    let category = '';
    if (w.type === WorkoutType.RACE) {
        if (w.distance < 1.0) category = 'SPEED';
        else if (w.distance < 4.0) category = 'INTERVAL'; 
        else if (w.distance < 12.0) category = 'THRESHOLD'; 
        else category = 'TEMPO'; 
    } else {
        if (TRAINING_COMPONENTS.SPEED.includes(w.type)) category = 'SPEED';
        else if (TRAINING_COMPONENTS.INTERVAL.includes(w.type)) category = 'INTERVAL';
        else if (TRAINING_COMPONENTS.THRESHOLD.includes(w.type)) category = 'THRESHOLD';
        else if (TRAINING_COMPONENTS.TEMPO.includes(w.type)) category = 'TEMPO';
        else if (TRAINING_COMPONENTS.MILEAGE.includes(w.type)) category = 'MILEAGE';
    }
    return category;
};

const isValidComponent = (category: string, km: number, targetDistName?: string): boolean => {
    if (category === 'SPEED') {
        if (targetDistName === '1500m') {
            return km >= 1.5;
        }
        return km >= 3.0;
    }
    if (category === 'INTERVAL') return km >= 2.0;
    return km >= 3.0;
};

/**
 * Scan history to find the BEST performance signal for each category.
 * To prevent predictions from decaying due to time alone, we anchor the lookback 
 * window to the date of the most recent workout in the history.
 */
const getBestComponentSignals = (workouts: Workout[], targetDistName?: string, asOfDate?: number) => {
    // Determine the reference point for the lookback window.
    // If we're looking at a specific point in history (fitness trend), use that.
    // Otherwise, use the date of the most recent activity.
    const latestWorkoutTime = workouts.length > 0 
        ? Math.max(...workouts.map(w => new Date(w.date).getTime())) 
        : new Date().getTime();
        
    const referenceTime = asOfDate || latestWorkoutTime;
    const cutoff = referenceTime - (SIGNAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    
    const candidates = workouts.filter(w => {
        const time = new Date(w.date).getTime();
        if (asOfDate) {
            return time >= cutoff && time <= asOfDate;
        }
        // Fixed: The prediction window is now stable relative to your last workout.
        return time >= cutoff && time <= referenceTime;
    });
    
    const bestSignals: Record<string, { seconds: number, km: number, rpe: number, date: string, source: string, qualityScore: number } | null> = {
        SPEED: null,
        INTERVAL: null,
        THRESHOLD: null,
        TEMPO: null,
        MILEAGE: null
    };

    candidates.forEach(w => {
        const category = getComponentCategory(w);
        if (!category) return;

        const data = extractWorkoutData(w);
        if (!data || !isValidComponent(category, data.km, targetDistName)) return;

        /**
         * Potential Score Calculation
         * We normalize the workout to see which one represents the fastest "Race Potential".
         */
        const rpeAdjustment = 1 + (data.rpe - 8) * 0.015;
        const baselineVol = BASELINE_VOLUMES[category] || 5;
        const volumeBonus = Math.min(0.05, Math.max(0, (data.km - baselineVol) * 0.005));
        const volumeFactor = 1 - volumeBonus;

        const normalizedPaceSec = (data.seconds / data.km) * rpeAdjustment * volumeFactor;
        const potential5kSeconds = predictTime(normalizedPaceSec * 5, 5, 5); 

        const currentBest = bestSignals[category];
        if (!currentBest || potential5kSeconds < currentBest.qualityScore) {
            bestSignals[category] = {
                seconds: data.seconds,
                km: data.km,
                rpe: data.rpe,
                date: w.date,
                source: w.title || w.type,
                qualityScore: potential5kSeconds
            };
        }
    });

    return bestSignals;
};

const calculateWeightedPrediction = (targetKm: number, weights: Record<string, number>, signals: any) => {
    let totalWeightedSeconds = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([compKey, weight]) => {
        const signal = signals[compKey];
        if (signal) {
            // Apply RPE and Volume adjustments to the base metrics
            const rpeAdj = 1 + (signal.rpe - 8) * 0.015;
            const baselineVol = BASELINE_VOLUMES[compKey] || 5;
            const volAdj = 1 - Math.min(0.05, Math.max(0, (signal.km - baselineVol) * 0.005));
            
            const adjustedBaseSeconds = signal.seconds * rpeAdj * volAdj;
            const predSeconds = predictTime(adjustedBaseSeconds, signal.km, targetKm);
            
            totalWeightedSeconds += (predSeconds * weight);
            totalWeight += weight;
        }
    });

    if (totalWeight === 0) return null;
    return totalWeightedSeconds / totalWeight;
};

export const generateRacePredictions = (workouts: Workout[], goals: Goal[]): RacePrediction[] => {
    return DISTANCES.map(d => {
        const signals = getBestComponentSignals(workouts, d.name);
        const weightProfile = WEIGHT_MATRIX[d.name] || WEIGHT_MATRIX['5000m']; 
        const predictedSeconds = calculateWeightedPrediction(d.km, weightProfile, signals);

        if (!predictedSeconds) return {
            distanceName: d.name,
            distanceKm: d.km,
            predictedSeconds: 0,
            predictedTime: '-',
            formattedPace: '-',
            source: 'Insufficient Data'
        };

        const paceSec = predictedSeconds / d.km;
        
        return {
            distanceName: d.name,
            distanceKm: d.km,
            predictedSeconds: predictedSeconds,
            predictedTime: formatSecondsToTime(predictedSeconds),
            formattedPace: `${Math.floor(paceSec / 60)}:${Math.round(paceSec % 60).toString().padStart(2, '0')}/km`,
            source: 'Weighted Quality Model' 
        };
    });
};

export const getBestPerformance = (workouts: Workout[], goals: Goal[]): { seconds: number, km: number, score: number, source: string } => {
    const signals = getBestComponentSignals(workouts, '5000m');
    const weightProfile = WEIGHT_MATRIX['5000m'];
    const pred5k = calculateWeightedPrediction(5, weightProfile, signals);

    if (!pred5k) return { seconds: 0, km: 0, score: 0, source: 'No Data' };

    return {
        seconds: pred5k,
        km: 5,
        score: calculateVDOT(pred5k),
        source: 'Multi-Factor Quality Model'
    };
};

export const getGoalProgressPrediction = (goal: Goal, predictions: RacePrediction[]) => {
    const exactMatch = predictions.find(p => Math.abs(p.distanceKm - goal.targetDistance) < 0.2 && p.predictedSeconds > 0);
    if (exactMatch) return exactMatch;
    
    const base = predictions.find(p => p.distanceName === '5000m' && p.predictedSeconds > 0);
    if (!base) return null;

    const seconds = predictTime(base.predictedSeconds, 5, goal.targetDistance);
    const paceSec = seconds / goal.targetDistance;
    
    return {
        distanceName: `${goal.targetDistance}km`,
        distanceKm: goal.targetDistance,
        predictedSeconds: seconds,
        predictedTime: formatSecondsToTime(seconds),
        formattedPace: `${Math.floor(paceSec / 60)}:${Math.round(paceSec % 60).toString().padStart(2, '0')}/km`,
        source: 'Weighted Quality Model'
    };
};

export const getFitnessTrend = (workouts: Workout[], targetDistName: string = '5000m') => {
    // Sort Oldest -> Newest
    const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const trendPoints: { date: string, predictedSeconds: number | null }[] = [];
    
    const targetDistObj = DISTANCES.find(d => d.name === targetDistName) || DISTANCES.find(d => d.name === '5000m');
    const targetKm = targetDistObj!.km;
    const weightProfile = WEIGHT_MATRIX[targetDistName] || WEIGHT_MATRIX['5000m'];

    sorted.forEach(w => {
        const asOfDate = new Date(w.date).getTime();
        
        // Find the best quality signals *at this point in history*
        const signalsAtPoint = getBestComponentSignals(workouts, targetDistName, asOfDate);
        
        // Calculate the prediction using the weighted adjusted logic
        const pred = calculateWeightedPrediction(targetKm, weightProfile, signalsAtPoint);
        
        if (pred) {
            trendPoints.push({
                date: w.date.split('T')[0],
                predictedSeconds: pred
            });
        }
    });

    return trendPoints;
};
