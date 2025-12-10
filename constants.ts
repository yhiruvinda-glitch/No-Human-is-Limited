
import { Workout, WorkoutType, Goal, UserProfile } from './types';

export const SHOE_OPTIONS = [
  'Nike Vaporfly 3',
  'Nike Alphafly 3',
  'Nike Dragonfly',
  'Saucony Endorphin Elite',
  'Saucony Triumph 21',
  'Adidas Adios Pro 3',
  'Adidas Takumi Sen 9',
  'Hoka Rocket X 2',
  'New Balance SC Elite v4',
  'Asics Metaspeed Sky Paris',
  'Brooks Hyperion Max'
];

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'g1',
    name: 'Sub-17 5K',
    targetTime: '16:59',
    targetDistance: 5,
    currentBest: '17:45',
    baseline: '18:45',
    deadline: '2024-11-01'
  },
  {
    id: 'g2',
    name: 'Sub-4:15 1500m',
    targetTime: '4:15',
    targetDistance: 1.5,
    currentBest: '4:28',
    baseline: '4:45',
    deadline: '2024-12-15'
  }
];

export const INITIAL_PROFILE: UserProfile = {
  name: 'Runner',
  age: 24,
  weight: 65,
  height: 178,
  preferredRace: '5000m',
  pbs: [
    { distance: '5000m', time: '17:45', date: '2023-09-15' },
    { distance: '1500m', time: '4:28', date: '2023-08-10' }
  ],
  injuryHistory: [
    { id: 'i1', description: 'Left IT Band Syndrome', date: '2023-01-10', status: 'Resolved' }
  ],
  weeklyAvailability: '6 days/week, approx 8 hours total volume.',
  targetPbs: 'Sub-17 5K, Sub-4:15 1500m'
};

export const INITIAL_WORKOUTS: Workout[] = [
  {
    id: 'w1',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    type: WorkoutType.INTERVAL,
    distance: 8,
    duration: 45,
    feeling: 8,
    rpe: 9,
    trainingLoad: 405,
    notes: '8x400m @ 72s w/ 90s rest. Felt strong on the last two.',
    intervals: [{ reps: 8, distance: 400, duration: '1:12', recovery: '90s jog', pace: '3:00/km' }],
    weather: '18°C, Cloudy',
    shoe: 'Nike Dragonfly',
    surface: 'Track',
    avgHr: 165,
    maxHr: 182,
    route: 'University Track'
  },
  {
    id: 'w2',
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    type: WorkoutType.EASY,
    distance: 10,
    duration: 52,
    feeling: 7,
    rpe: 4,
    trainingLoad: 208,
    notes: 'Recovery run. Legs a bit heavy from intervals.',
    weather: '20°C, Sunny',
    shoe: 'Saucony Triumph',
    surface: 'Road',
    avgHr: 135,
    maxHr: 145,
    route: 'River Loop'
  },
  {
    id: 'w3',
    date: new Date().toISOString(),
    type: WorkoutType.TEMPO,
    distance: 12,
    duration: 55,
    feeling: 9,
    rpe: 7,
    trainingLoad: 385,
    notes: '20 min warmup, 20 min @ 3:45/km, 15 min cooldown. Smooth rhythm.',
    weather: '15°C, Rain',
    shoe: 'Nike Vaporfly 3',
    surface: 'Road',
    avgHr: 158,
    maxHr: 172,
    route: 'Park Perimeter'
  },
  {
    id: 'w4',
    date: new Date(Date.now() - 86400000 * 4).toISOString(),
    type: WorkoutType.LONG,
    distance: 22,
    duration: 105,
    feeling: 6,
    rpe: 6,
    trainingLoad: 630,
    notes: 'Long run with some rolling hills. Hydration was key.',
    weather: '12°C, Windy',
    shoe: 'Saucony Triumph',
    surface: 'Road',
    avgHr: 142,
    maxHr: 155,
    route: 'City Outskirts'
  },
  {
    id: 'w5',
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    type: WorkoutType.SPEED,
    distance: 6,
    duration: 40,
    feeling: 9,
    rpe: 8,
    trainingLoad: 320,
    notes: '10x200m sharp. Focusing on turnover.',
    intervals: [{ reps: 10, distance: 200, duration: '0:32', recovery: '200m jog', pace: '2:40/km' }],
    weather: '22°C, Clear',
    shoe: 'Nike Dragonfly',
    surface: 'Track',
    avgHr: 150,
    maxHr: 175,
    route: 'University Track'
  }
];

export const SYSTEM_INSTRUCTION_COACH = `
You are "Jakob", an AI version of Jakob Ingebrigtsen — the Olympic 1500m Champion and world-leading threshold-based athlete.

**1. Personality & Tone**
- Calm, confident, analytical, and brutally honest.
- Use dry humour and understated sarcasm.
- Speak in concise, practical training language. Avoid motivational fluff.
- Occasional Norwegian expressions: "Stay kontrollert", "Helt greit", "Rolig langtur".
- Core belief: Consistency > Motivation. "Don’t run dumb."

**2. Training Philosophy (The Ingebrigtsen System)**
- **Threshold is King:** Main drivers are double threshold days (e.g., 5x1km, 6x1.6km, 4x2km, 20x400m).
- **Control:** Threshold must be controlled (RPE 7-8), never maximal. Pace adapts daily based on feel.
- **Principles:**
  - "If the session ruins the next one, it wasn’t a good session."
  - "You don’t prove your fitness in training — you prove it in races."
  - "Never chase pace. Let pace come to you."
  - "Calm is fast."

**3. The User Context**
- The user is a **busy medical student** with limited time/mileage.
- History of **knee injury** (be cautious with volume spikes).
- Targets: **1500m & 5k**.

**4. How to Evaluate & Coach**
- **Interpret Threshold:** Did the pace drift? Was it steady? If they pushed too hard, scold them gently ("That was a race, not training").
- **Adaptability:** If the user is tired (medical school stress), suggest recovery or "easy threshold", not rest if it can be avoided.
- **Race Prep:** Focus heavily on 1500m/5k specificity.
- **Style:** Short, confident, practical. No heroics.

**5. Safety**
- Provide athletic advice only. No medical advice.
- If the user suggests something unrealistic, be blunt and rational.
`;
