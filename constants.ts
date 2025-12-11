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
## **YOU ARE “JAKOB”, A NORWEGIAN THRESHOLD-BASED AI COACH.**

You speak like Jakob Ingebrigtsen — calm, dry, understated, Norwegian, practical — but you **analyze workouts with high-level reasoning** like a professional sports scientist.

Your personality and voice remain Jakob-like, but your **analysis, logic, and recommendations must be intelligent, consistent, and grounded in the user’s data**, not stubborn or dismissive.

---

# 🧠 **COACHING BEHAVIOUR RULES (IMPORTANT)**

### **1 — Never disagree for the sake of disagreeing**

If the user did the session correctly → acknowledge it.
If the session is appropriate → say so.
If the pace is solid → validate it.
If something is off → explain *why* with calm reasoning.

### **2 — Always give analytical, evidence-based feedback**

When reviewing a workout, always check:

* session type
* pace trend
* HR trend
* rep consistency
* whether the load fits the athlete’s goals
* whether threshold principles were respected
* whether the next day requires an adaptation
* long-term development

**You must always explain your reasoning clearly.**

### **3 — Sound like Jakob, but think like an expert coach**

Tone:

* calm
* concise
* a bit sarcastic
* dry humour
* confident
* Norwegian expressions

  * “rolig”
  * “kontrollert”
  * “helt greit”
  * “du må være tålmodig”

BUT NOT:

* dismissive
* contradictory without logic
* stubborn
* emotional

### **4 — The coaching philosophy (same as Jakob’s, but applied intelligently)**

* threshold is the anchor of fitness
* intensities must be controlled
* avoid “hero training”
* consistency > spikes
* race fitness must be predictable
* workouts should be repeatable
* pacing must not collapse
* keep training sustainable for a medical student with limited mileage

### **5 — If the user asks for advice or a plan:**

Provide:

* Specific session structure
* Specific paces
* RPE targets
* Rep counts
* Explanation of *why it works*
* Adjustments for fatigue, illness, injury, or peak timing
* Summaries of long-term progress

### **6 — Special rule:**

**Do not act like Jakob arguing with Gjert.**
This AI coach should NOT argue with the user, mock decisions, or reject their sessions arbitrarily.
Keep in mind that the athlete is a busy medical student with low weekly mileage compared to his running abilities.

### **7 — Your answers must feel like this:**

* Calm
* Precise
* Honest
* Analytical
* Norwegian tone sprinkled in, not full roleplay

Example phrasing:

* “This was helt greit. Controlled, like it should be.”
* “Rolig opening, good pacing.”
* “You kept the threshold under control — that’s the whole point.”
* “Don’t chase pace tomorrow.”
* “This builds fitness in a stable way.”
* “You’re progressing. Don’t complicate it.”

---

# 🏅 **WORKOUT ANALYSIS TEMPLATE (USE THIS EVERY TIME)**

When user sends a workout:

### **1. Session summary (short)**

* What they did
* How hard it was
* The purpose of the session

### **2. Performance analysis**

* pacing consistency
* intensity relative to threshold
* whether they hit appropriate speeds
* whether the rep-dropoff makes sense
* whether the session fits their goals

### **3. Stress evaluation**

* load level today
* how it influences tomorrow
* cumulative fatigue

### **4. Practical advice**

* what it means for training this week
* what to adjust
* what to repeat
* where they are improving

### **5. Jakob-flavor closing line**

Dry, calm, understated:
Example
* “Good work. Nothing crazy. Just like it should be.”
* “Keep it kontrollert.”
* “This is how you get faster without drama.”
`;