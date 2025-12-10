
import { Workout, WorkoutType, TrainingAlert } from '../types';

export const generateSmartAlerts = (workouts: Workout[]): TrainingAlert[] => {
    const alerts: TrainingAlert[] = [];
    const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sorted.length < 2) return alerts;

    const lastWorkout = sorted[0];

    // 1. Overtraining Risk (Acute:Chronic Load Ratio)
    // Simplified: Last 7 days load vs Avg of last 28 days load
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const acuteLoad = workouts
        .filter(w => new Date(w.date) >= oneWeekAgo)
        .reduce((sum, w) => sum + (w.trainingLoad || w.duration * w.rpe), 0);

    const chronicLoadTotal = workouts
        .filter(w => new Date(w.date) >= fourWeeksAgo)
        .reduce((sum, w) => sum + (w.trainingLoad || w.duration * w.rpe), 0);
    
    // Avg weekly load over 4 weeks
    const chronicLoadAvg = chronicLoadTotal / 4; 

    const ratio = chronicLoadAvg > 0 ? acuteLoad / chronicLoadAvg : 0;

    if (ratio > 1.5) {
        alerts.push({
            id: 'ac-ratio-high',
            type: 'DANGER',
            title: 'Overtraining Risk',
            message: 'Acute load is >1.5x your chronic load. High injury risk.',
            metric: `Ratio: ${ratio.toFixed(2)}`
        });
    } else if (ratio > 1.3) {
        alerts.push({
            id: 'ac-ratio-warn',
            type: 'WARNING',
            title: 'Load Spiking',
            message: 'Training load is increasing rapidly. Monitor recovery.',
            metric: `Ratio: ${ratio.toFixed(2)}`
        });
    }

    // 2. High RPE on Easy Days (Sign of Fatigue)
    if (lastWorkout.type === WorkoutType.EASY || lastWorkout.type === WorkoutType.RECOVERY) {
        if (lastWorkout.rpe >= 7) {
            alerts.push({
                id: 'high-rpe-easy',
                type: 'WARNING',
                title: 'High Physiological Cost',
                message: `Rated a recovery run as RPE ${lastWorkout.rpe}. Potential residual fatigue.`,
            });
        }
    }

    // 3. Heart Rate Drift / Anomaly
    // Compare last Easy run HR to user's average Easy run HR
    if (lastWorkout.type === WorkoutType.EASY && lastWorkout.avgHr) {
        const easyRuns = workouts.filter(w => w.type === WorkoutType.EASY && w.avgHr && w.id !== lastWorkout.id);
        if (easyRuns.length > 0) {
            const avgEasyHr = easyRuns.reduce((sum, w) => sum + (w.avgHr || 0), 0) / easyRuns.length;
            const diff = lastWorkout.avgHr - avgEasyHr;
            
            if (diff > 10) {
                alerts.push({
                    id: 'hr-drift',
                    type: 'WARNING',
                    title: 'Heart Rate Anomaly',
                    message: 'Avg HR was significantly higher (+10bpm) than your usual easy runs.',
                    metric: `+${Math.round(diff)} bpm`
                });
            }
        }
    }

    // 4. Intensity Check (Polarization)
    // If last 3 workouts were all hard (Interval, Tempo, Speed)
    const recentTypes = sorted.slice(0, 3).map(w => w.type);
    const hardTypes = [WorkoutType.INTERVAL, WorkoutType.SPEED, WorkoutType.TEMPO, WorkoutType.RACE, WorkoutType.HILLS, WorkoutType.THRESHOLD];
    const consecutiveHard = recentTypes.every(t => hardTypes.includes(t));

    if (consecutiveHard) {
        alerts.push({
            id: 'polarization',
            type: 'INFO',
            title: 'Lack of Recovery',
            message: 'Last 3 sessions were high intensity. Consider an easy day to maintain polarization.',
        });
    }

    return alerts;
};
