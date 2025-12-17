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

// Weight Matrix per prompt
// Defines how much each training component contributes to a target race distance
const WEIGHT_MATRIX: Record<string, Record<string, number>> = {
    '1500m': { SPEED: 0.35, INTERVAL: 0.30, THRESHOLD: 0.15, TEMPO: 0.10, MILEAGE: 0.10 },
    '3000m': { INTERVAL: 0.30, THRESHOLD: 0.25, TEMPO: 0.20, SPEED: 0.15, MILEAGE: 0.10 },
    '5000m': { THRESHOLD: 0.30, INTERVAL: 0.25, TEMPO: 0.20, SPEED: 0.10, MILEAGE: 0.15 },
    '10K':   { THRESHOLD: 0.40, TEMPO: 0.25, MILEAGE: 0.20, INTERVAL: 0.10, SPEED: 0.05 },
    'Half Marathon': { TEMPO: 0.35, THRESHOLD: 0.35, MILEAGE: 0.20, INTERVAL: 0.07, SPEED: 0.03 }
};

// Mapping Workout Types to Components
// Races are mapped dynamically based on distance in the scanner function
const TRAINING_COMPONENTS = {
    SPEED: [WorkoutType.SPEED], 
    INTERVAL: [WorkoutType.INTERVAL], 
    THRESHOLD: [WorkoutType.THRESHOLD], 
    TEMPO: [WorkoutType.TEMPO], 
    MILEAGE: [WorkoutType.LONG] // Using Long Run as proxy for Mileage signal
};

// Riegel Formula
const predictTime = (baseSeconds: number, baseKm: number, targetKm: number): number => {
  let exponent = 1.06; // Standard Riegel
  return baseSeconds * Math.pow((targetKm / baseKm), exponent);
};

export const calculateVDOT = (fiveKTimeSeconds: number): number => {
    const minutes = fiveKTimeSeconds / 60;
    if (minutes === 0) return 0;
    return Number((285 / minutes) + 12).toFixed(1) as unknown as number; 
};

// Helper: Get data from a workout for prediction
const extractWorkoutData = (w: Workout): { seconds: number, km: number } | null => {
    let durationSec = 0;
    let distanceKm = 0;

    // Smart Extraction
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
    // Long Runs are usually 20-25% slower than race potential. We adjust time DOWN to estimate potential.
    if (w.type === WorkoutType.LONG) {
        durationSec = durationSec * 0.85; 
    }

    return { seconds: durationSec, km: distanceKm };
};

// Helper to determine component category
const getComponentCategory = (w: Workout): string => {
    let category = '';
    if (w.type === WorkoutType.RACE) {
        if (w.distance < 1.0) category = 'SPEED';
        else if (w.distance < 4.0) category = 'INTERVAL'; // 1500m-3k races
        else if (w.distance < 12.0) category = 'THRESHOLD'; // 5k-10k races
        else category = 'TEMPO'; // HM+
    } else {
        // Map standard types
        if (TRAINING_COMPONENTS.SPEED.includes(w.type)) category = 'SPEED';
        else if (TRAINING_COMPONENTS.INTERVAL.includes(w.type)) category = 'INTERVAL';
        else if (TRAINING_COMPONENTS.THRESHOLD.includes(w.type)) category = 'THRESHOLD';
        else if (TRAINING_COMPONENTS.TEMPO.includes(w.type)) category = 'TEMPO';
        else if (TRAINING_COMPONENTS.MILEAGE.includes(w.type)) category = 'MILEAGE';
    }
    return category;
};

// Helper to check validity (min distance)
const isValidComponent = (category: string, km: number, targetDistName?: string): boolean => {
    // Minimum volume requirements for a workout to count towards prediction
    
    // Speed: 1.5-3km valid ONLY for 1500m. Others need >= 3km.
    if (category === 'SPEED') {
        if (targetDistName === '1500m') {
            return km >= 1.5;
        }
        return km >= 3.0;
    }
    
    if (category === 'INTERVAL') return km >= 2.0;
    
    // Threshold, Tempo, Mileage default to 3km
    return km >= 3.0;
};

// Scan history to find the best recent component for each category
// Now accepts targetDistName to perform context-aware filtering
const getRecentComponents = (workouts: Workout[], targetDistName?: string) => {
    // Sort Newest -> Oldest
    const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const components: Record<string, { seconds: number, km: number, date: string, source: string } | null> = {
        SPEED: null,
        INTERVAL: null,
        THRESHOLD: null,
        TEMPO: null,
        MILEAGE: null
    };

    for (const w of sorted) {
        const category = getComponentCategory(w);

        if (category && !components[category]) {
            const data = extractWorkoutData(w);
            if (data && data.km > 0) {
                if (isValidComponent(category, data.km, targetDistName)) {
                    components[category] = {
                        ...data,
                        date: w.date,
                        source: `${w.title || w.type}`
                    };
                }
            }
        }

        // Break if all found
        if (Object.values(components).every(v => v !== null)) break;
    }

    return components;
};

// Calculate Weighted Prediction
const calculateWeightedPrediction = (targetKm: number, weights: Record<string, number>, components: any) => {
    let totalWeightedSeconds = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([compKey, weight]) => {
        const comp = components[compKey];
        if (comp) {
            const predSeconds = predictTime(comp.seconds, comp.km, targetKm);
            totalWeightedSeconds += (predSeconds * weight);
            totalWeight += weight;
        }
    });

    if (totalWeight === 0) return null;

    // Normalize result
    return totalWeightedSeconds / totalWeight;
};

export const generateRacePredictions = (workouts: Workout[], goals: Goal[]): RacePrediction[] => {
    // Calculate components per target distance to allow specific validation rules
    return DISTANCES.map(d => {
        const components = getRecentComponents(workouts, d.name);
        
        // Fallback for non-standard mapping if we added more distances later
        const weightProfile = WEIGHT_MATRIX[d.name] || WEIGHT_MATRIX['5000m']; 
        
        const predictedSeconds = calculateWeightedPrediction(d.km, weightProfile, components);

        if (!predictedSeconds) return {
            distanceName: d.name,
            distanceKm: d.km,
            predictedSeconds: 0,
            predictedTime: '-',
            formattedPace: '-',
            source: 'Insufficent Data'
        };

        const paceSec = predictedSeconds / d.km;
        
        // Identify primary driver for display source
        // We find which component contributed most relative weight or just generic "Weighted"
        // Let's list the freshest component as source hint
        const freshest = Object.values(components)
            .filter(c => c !== null)
            .sort((a,b) => new Date(b!.date).getTime() - new Date(a!.date).getTime())[0];

        return {
            distanceName: d.name,
            distanceKm: d.km,
            predictedSeconds: predictedSeconds,
            predictedTime: formatSecondsToTime(predictedSeconds),
            formattedPace: `${Math.floor(paceSec / 60)}:${Math.round(paceSec % 60).toString().padStart(2, '0')}/km`,
            source: 'Weighted Model' 
        };
    });
};

// Returns a "Best Performance" object for the Analysis Card
// We now use the Weighted 5K prediction as the "Gold Standard" of current fitness
export const getBestPerformance = (workouts: Workout[], goals: Goal[]): { seconds: number, km: number, score: number, source: string } => {
    const components = getRecentComponents(workouts, '5000m');
    const weightProfile = WEIGHT_MATRIX['5000m'];
    
    const pred5k = calculateWeightedPrediction(5, weightProfile, components);

    if (!pred5k) return { seconds: 0, km: 0, score: 0, source: 'No Data' };

    // Score is VDOT-like (higher is better). 
    // Simply using 10000 / 5k_seconds as a crude score for internal comparison if needed
    return {
        seconds: pred5k,
        km: 5,
        score: calculateVDOT(pred5k),
        source: 'Multi-Factor Model'
    };
};

export const getGoalProgressPrediction = (goal: Goal, predictions: RacePrediction[]) => {
    const exactMatch = predictions.find(p => Math.abs(p.distanceKm - goal.targetDistance) < 0.2 && p.predictedSeconds > 0);
    if (exactMatch) return exactMatch;
    
    // Interpolate using 5K base if non-standard
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
        source: 'Weighted Model'
    };
};

export const getFitnessTrend = (workouts: Workout[], targetDistName: string = '5000m') => {
    // Generates a chronological trend of potential for a specific distance
    // using the Weighted Model logic (Most Recent valid workout for each component)
    
    // Sort Oldest -> Newest
    const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const trendPoints: { date: string, predictedSeconds: number | null }[] = [];
    
    // Identify target KM and weights
    const targetDistObj = DISTANCES.find(d => d.name === targetDistName) || DISTANCES.find(d => d.name === '5000m');
    const targetKm = targetDistObj!.km;
    const weightProfile = WEIGHT_MATRIX[targetDistName] || WEIGHT_MATRIX['5000m'];

    // State for chronological scan: holds the "latest known" component for each category
    const latestComponents: Record<string, { seconds: number, km: number } | null> = {
        SPEED: null, INTERVAL: null, THRESHOLD: null, TEMPO: null, MILEAGE: null
    };

    let hasData = false;

    sorted.forEach(w => {
        const category = getComponentCategory(w);
        
        if (category) {
            const data = extractWorkoutData(w);
            if (data && data.km > 0 && isValidComponent(category, data.km, targetDistName)) {
                latestComponents[category] = data;
                hasData = true;
            }
        }

        // Only emit a point if we have at least one valid component to base a prediction on
        if (hasData) {
            const pred = calculateWeightedPrediction(targetKm, weightProfile, latestComponents);
            
            // Optimization: Only push if date differs from last or it's a significant change?
            // For now, push every point to show density of training
            if (pred) {
                trendPoints.push({
                    date: w.date.split('T')[0],
                    predictedSeconds: pred
                });
            }
        }
    });

    return trendPoints;
};
