

export enum WorkoutType {
  EASY = 'Easy Run',
  TEMPO = 'Tempo',
  THRESHOLD = 'Threshold',
  INTERVAL = 'Intervals',
  SPEED = 'Speed Work',
  HILLS = 'Hill Repeats',
  RACE = 'Race',
  TREADMILL = 'Treadmill Run',
  CYCLE = 'Cycling',
  CROSS_TRAINING = 'Cross Training',
  LONG = 'Long Run',
  RECOVERY = 'Recovery'
}

export type SurfaceType = 'Road' | 'Track' | 'Trail' | 'Treadmill' | 'Grass' | 'Indoor' | 'Mixed';

export interface IntervalSet {
  reps: number;
  distance?: number; // in meters, optional if time-based
  duration?: string; // e.g. "3:00" or "1 min", optional if distance-based
  pace?: string; // Target pace e.g. "3:05/km"
  recovery: string; // e.g. "90s jog"
  notes?: string;
}

export interface Workout {
  id: string;
  title?: string; // Auto-generated name e.g. "Road Tempo 1"
  date: string; // ISO string
  type: WorkoutType;
  distance: number; // in km
  duration: number; // in minutes
  feeling: number; // 1-10
  rpe: number; // 1-10 (Rate of Perceived Exertion)
  trainingLoad?: number; // duration * rpe
  notes: string;
  intervals?: IntervalSet[];
  splits?: number[]; // Array of split times in seconds
  shoe?: string;
  weather?: string;
  route?: string; // Used as Venue for races
  courseId?: string; // Linked Course ID
  surface?: SurfaceType;
  avgHr?: number;
  maxHr?: number;
  // Race specific fields
  competition?: string;
  team?: string;
  place?: string; // e.g. "1st", "DNF"
  eventName?: string; // e.g. "800m", "5000m"
  // Records
  isPb?: boolean;
  isSb?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetTime: string; // e.g. "16:59"
  targetDistance: number; // in km, e.g. 5
  currentBest: string; // e.g. "17:30"
  baseline: string; // Starting point for progress calc, e.g. "18:30"
  deadline?: string;
}

export interface PersonalBest {
  distance: string;
  time: string;
  date?: string;
}

export interface SeasonStats {
  totalDistance: number;
  totalDuration: number; // minutes
  workoutCount: number;
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  startPbs: PersonalBest[]; // PBs when season started
  targetPbs: PersonalBest[]; // Goals for end of season
  endPbs?: PersonalBest[]; // PBs when season ended
  seasonBests?: PersonalBest[]; // Fastest times achieved WITHIN this season
  stats?: SeasonStats; // Aggregated stats for the season
  isActive: boolean;
}

export interface Injury {
  id: string;
  description: string;
  date: string;
  status: 'Active' | 'Recovering' | 'Resolved';
}

export interface UserProfile {
  name: string;
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  preferredRace: string;
  pbs: PersonalBest[];
  injuryHistory: Injury[];
  weeklyAvailability: string; // e.g. "5 days, 6 hours max"
  targetPbs?: string; // Free text description of targets
}

export interface CourseRecord {
  seconds: number;
  formattedTime: string;
  date: string;
  workoutId: string;
}

export interface Course {
  id: string;
  name: string;
  distance: number; // km
  location: string;
  surface: SurfaceType;
  description?: string;
  elevationGain?: number; // meters
  bestEffort?: CourseRecord;
}

export interface Shoe {
  id: string;
  name: string; // "Brand Model" - Identifier used in workouts
  brand: string;
  model: string;
  purchaseDate: string;
  status: 'Active' | 'Retired';
  maxMileage?: number; // Default 800km usually
  initialDistance?: number; // Distance already on shoe before tracking
}

export interface RacePrediction {
  distanceName: string;
  distanceKm: number;
  predictedSeconds: number;
  predictedTime: string;
  formattedPace: string;
}

export interface AIAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface IntervalGroupStats {
  distance: number;
  label: string;
  count: number;
  avgTime: number;
  bestTime: number;
  variation: number; // Percentage
  pace: string;
  reps: number[]; // Array of rep times in seconds
  recovery: string;
}

export interface IntervalAnalysis {
  totalReps: number;
  qualityVolume: number; // km
  score: number; // 0-100
  consistencyLabel: string;
  variation: number; // Average variation across groups
  groups: IntervalGroupStats[];
}

export interface TrainingAlert {
  id: string;
  type: 'WARNING' | 'DANGER' | 'INFO';
  title: string;
  message: string;
  metric?: string;
}

export type ViewState = 'DASHBOARD' | 'LOG' | 'HISTORY' | 'RACES' | 'ANALYSIS' | 'COACH' | 'PROFILE' | 'COURSES' | 'SEASONS' | 'SHOES';

// Hardwired DB Schema
export interface DbSchema {
  version: string;
  workouts: Workout[];
  goals: Goal[];
  profile: UserProfile;
  courses: Course[];
  seasons: Season[];
  shoes: Shoe[];
}