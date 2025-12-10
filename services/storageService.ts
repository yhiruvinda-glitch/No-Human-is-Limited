

import { Workout, Goal, UserProfile, Course, Season, Shoe } from '../types';
import { INITIAL_WORKOUTS, INITIAL_GOALS, INITIAL_PROFILE, SHOE_OPTIONS } from '../constants';

const WORKOUTS_KEY = 'nhil_workouts';
const GOALS_KEY = 'nhil_goals';
const PROFILE_KEY = 'nhil_profile';
const COURSES_KEY = 'nhil_courses';
const SEASONS_KEY = 'nhil_seasons';
const SHOES_KEY = 'nhil_shoes';

export interface AppDataBackup {
  workouts: Workout[];
  goals: Goal[];
  profile: UserProfile;
  courses: Course[];
  seasons: Season[];
  shoes: Shoe[];
  version: string;
  timestamp: string;
}

export const getStoredWorkouts = (): Workout[] => {
  const stored = localStorage.getItem(WORKOUTS_KEY);
  if (!stored) {
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(INITIAL_WORKOUTS));
    return INITIAL_WORKOUTS;
  }
  return JSON.parse(stored);
};

export const saveWorkouts = (workouts: Workout[]) => {
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
};

export const getStoredGoals = (): Goal[] => {
  const stored = localStorage.getItem(GOALS_KEY);
  if (!stored) {
    localStorage.setItem(GOALS_KEY, JSON.stringify(INITIAL_GOALS));
    return INITIAL_GOALS;
  }
  return JSON.parse(stored);
};

export const saveGoals = (goals: Goal[]) => {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
};

export const getUserProfile = (): UserProfile => {
  const stored = localStorage.getItem(PROFILE_KEY);
  if (!stored) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(INITIAL_PROFILE));
    return INITIAL_PROFILE;
  }
  return JSON.parse(stored);
};

export const saveUserProfile = (profile: UserProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getStoredCourses = (): Course[] => {
  const stored = localStorage.getItem(COURSES_KEY);
  if (!stored) return [];
  return JSON.parse(stored);
};

export const saveCourses = (courses: Course[]) => {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
};

export const getStoredSeasons = (): Season[] => {
    const stored = localStorage.getItem(SEASONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
};

export const saveSeasons = (seasons: Season[]) => {
    localStorage.setItem(SEASONS_KEY, JSON.stringify(seasons));
};

export const getStoredShoes = (): Shoe[] => {
  const stored = localStorage.getItem(SHOES_KEY);
  if (!stored) {
    // Seed from constants for better initial UX
    const initialShoes: Shoe[] = SHOE_OPTIONS.map((name, idx) => ({
      id: `s_init_${idx}`,
      name: name,
      brand: name.split(' ')[0], 
      model: name.split(' ').slice(1).join(' '),
      purchaseDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      maxMileage: 800
    }));
    localStorage.setItem(SHOES_KEY, JSON.stringify(initialShoes));
    return initialShoes;
  }
  return JSON.parse(stored);
};

export const saveShoes = (shoes: Shoe[]) => {
  localStorage.setItem(SHOES_KEY, JSON.stringify(shoes));
};

// --- Backup & Restore Utilities ---

export const createBackupData = (): AppDataBackup => {
  return {
    workouts: getStoredWorkouts(),
    goals: getStoredGoals(),
    profile: getUserProfile(),
    courses: getStoredCourses(),
    seasons: getStoredSeasons(),
    shoes: getStoredShoes(),
    version: '1.0',
    timestamp: new Date().toISOString()
  };
};

export const restoreBackupData = (data: any): boolean => {
  try {
    // Basic validation to ensure it looks like our backup
    if (!data || (!data.workouts && !data.profile)) {
      console.error("Invalid backup format");
      return false;
    }
    
    // Save all keys
    if (data.workouts) saveWorkouts(data.workouts);
    if (data.goals) saveGoals(data.goals);
    if (data.profile) saveUserProfile(data.profile);
    if (data.courses) saveCourses(data.courses);
    if (data.seasons) saveSeasons(data.seasons);
    if (data.shoes) saveShoes(data.shoes);
    
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};