
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WorkoutForm from './components/WorkoutForm';
import WorkoutList from './components/WorkoutList';
import Analysis from './components/Analysis';
import CoachChat from './components/CoachChat';
import Profile from './components/Profile';
import Courses from './components/Courses';
import Seasons from './components/Seasons';
import ShoeDepository from './components/ShoeDepository';
import Races from './components/Races';
import { ViewState, Workout, Goal, UserProfile, Course, WorkoutType, Season, PersonalBest, Shoe } from './types';
import { useData } from './hooks/useData';
import { formatSecondsToTime, detectBestEfforts, calculateSeasonBests, parseTimeStringToSeconds, recalculateRecords } from './utils/analytics';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { data, save, exportSourceCode } = useData();
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [toast, setToast] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize Data Correction on Mount
  useEffect(() => {
      if (data && !hasInitialized) {
          // Perform a calculation to ensure all PB tags AND Workout Numbers are consistent.
          const currentSeason = data.seasons.find(s => s.isActive);
          const cleanedWorkouts = recalculateRecords(data.workouts, currentSeason?.startDate, data.profile.pbs, data.seasons);
          
          setHasInitialized(true); 
          
          // Compare titles and PB flags to see if we need a data fix save
          const needsTitleUpdate = JSON.stringify(data.workouts.map(w => w.title)) !== JSON.stringify(cleanedWorkouts.map(w => w.title));
          const needsPbUpdate = JSON.stringify(data.workouts.map(w => w.isPb)) !== JSON.stringify(cleanedWorkouts.map(w => w.isPb));
          
          if (needsTitleUpdate || needsPbUpdate) {
             save({ ...data, workouts: cleanedWorkouts });
             console.log("System: Fixed workout numbering based on active seasons.");
          }
      }
  }, [data, hasInitialized, save]);

  // While data is loading from hook
  if (!data) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="animate-spin text-brand-500 mx-auto mb-4" size={48} />
                <p className="text-slate-400 font-mono">Initializing Neural Network...</p>
            </div>
        </div>
    );
  }

  const { workouts, goals, profile, courses, seasons, shoes } = data;
  const currentSeason = seasons.find(s => s.isActive) || null;
  const pastSeasons = seasons.filter(s => !s.isActive).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Show Toast Helper
  const showToast = (msg: string) => {
      setToast(msg);
      setTimeout(() => setToast(null), 4000);
  };

  // --- Season Management ---
  const handleStartSeason = (name: string, startDateStr: string, startPbs: PersonalBest[], targetPbs: PersonalBest[]) => {
      const updatedSeasons = seasons.map(s => s.isActive ? { ...s, isActive: false, endDate: new Date().toISOString() } : s);
      const startDate = new Date(startDateStr).toISOString();

      const newSeason: Season = {
          id: Date.now().toString(),
          name,
          startDate: startDate,
          startPbs,
          targetPbs,
          isActive: true
      };
      
      const finalSeasons = [...updatedSeasons, newSeason];
      // Force recalculate all titles immediately when a new season starts
      const finalWorkouts = recalculateRecords(workouts, newSeason.startDate, profile.pbs, finalSeasons);
      
      save({ ...data, seasons: finalSeasons, workouts: finalWorkouts });
      showToast(`Started Season: ${name}`);
      setView('DASHBOARD');
  };

  const handleUpdateSeason = (updatedSeason: Season) => {
      const updatedSeasons = seasons.map(s => s.id === updatedSeason.id ? updatedSeason : s);
      save({ ...data, seasons: updatedSeasons });
      showToast('Season Updated');
  };

  const handleEndSeason = () => {
      if (!currentSeason) return;

      const endDate = new Date().toISOString();
      const seasonWorkouts = workouts.filter(w => {
          const wDate = new Date(w.date);
          return wDate >= new Date(currentSeason.startDate) && wDate <= new Date(endDate);
      });

      const seasonBests = calculateSeasonBests(seasonWorkouts);
      const totalDistance = seasonWorkouts.reduce((sum, w) => sum + w.distance, 0);
      const totalDuration = seasonWorkouts.reduce((sum, w) => sum + w.duration, 0);
      const workoutCount = seasonWorkouts.length;

      const updatedSeasons = seasons.map(s => s.id === currentSeason.id ? { 
          ...s, 
          isActive: false, 
          endDate,
          endPbs: profile.pbs.map(pb => ({...pb})),
          seasonBests,
          stats: { totalDistance, totalDuration, workoutCount }
        } : s);

      save({ ...data, seasons: updatedSeasons });
      showToast('Season Ended & Archived');
  };

  const handleSaveWorkout = (workout: Workout) => {
    let finalWorkout = { ...workout };
    let currentProfile = { ...profile };
    let updatedCourses = [...courses];
    let toastMsg = '';

    // 1. Check for Course Record
    if (finalWorkout.courseId) {
        const course = courses.find(c => c.id === finalWorkout.courseId);
        
        if (course) {
            let attemptSeconds = Infinity;
            let isValidAttempt = false;

            if (finalWorkout.intervals && finalWorkout.intervals.length > 0) {
                finalWorkout.intervals.forEach(interval => {
                    const distKm = (interval.distance || 0) / 1000;
                    if (distKm > 0 && Math.abs(distKm - course.distance) < 0.05) {
                        const segSeconds = parseTimeStringToSeconds(interval.duration || '0');
                        if (segSeconds > 0 && segSeconds < attemptSeconds) {
                            attemptSeconds = segSeconds;
                            isValidAttempt = true;
                        }
                    }
                });
            }

            if (!isValidAttempt || workout.type === WorkoutType.TEMPO || workout.type === WorkoutType.RACE || workout.type === WorkoutType.EASY) {
                 if (Math.abs(course.distance - finalWorkout.distance) < 0.2) {
                     const totalSeconds = finalWorkout.duration * 60;
                     if (totalSeconds < attemptSeconds) {
                         attemptSeconds = totalSeconds;
                         isValidAttempt = true;
                     }
                 }
            }
            
            if (isValidAttempt) {
                const currentRecord = course.bestEffort?.seconds || Infinity;
                if (attemptSeconds < currentRecord) {
                    const updatedCourse: Course = {
                        ...course,
                        bestEffort: {
                            seconds: attemptSeconds,
                            formattedTime: formatSecondsToTime(attemptSeconds, true),
                            date: finalWorkout.date,
                            workoutId: finalWorkout.id
                        }
                    };
                    updatedCourses = updatedCourses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
                    toastMsg = `🏆 NEW COURSE RECORD: ${course.name}! `;
                }
            }
        }
    }

    // 2. Check for Personal Best (PB) & Season Best (SB)
    const { isPb, isSb, distanceName } = detectBestEfforts(
        finalWorkout, 
        workouts, 
        currentProfile, 
        currentSeason?.startDate 
    );
    
    if (isPb && distanceName) {
        toastMsg = `🎉 NEW ${distanceName} PB! `;
        const newPbStr = formatSecondsToTime(finalWorkout.duration * 60, true);
        const existingPbIndex = currentProfile.pbs.findIndex(p => p.distance === distanceName || (distanceName === '5K' && p.distance === '5000m') || (distanceName === '10K' && p.distance === '10000m'));
        
        if (existingPbIndex >= 0) {
            currentProfile.pbs[existingPbIndex] = { distance: distanceName, time: newPbStr, date: finalWorkout.date };
        } else {
            currentProfile.pbs.push({ distance: distanceName, time: newPbStr, date: finalWorkout.date });
        }
    } else if (isSb && distanceName) {
        toastMsg = `🔥 NEW ${distanceName} SEASON BEST! `;
    }

    if (toastMsg) showToast(toastMsg);

    // 3. Centralized Recalculation (This fixes titles for the new entry AND re-shuffles old ones if needed)
    const rawWorkouts = [finalWorkout, ...workouts];
    const updatedWorkouts = recalculateRecords(rawWorkouts, currentSeason?.startDate, currentProfile.pbs, seasons);

    save({
        ...data,
        workouts: updatedWorkouts,
        profile: currentProfile,
        courses: updatedCourses
    });

    if(finalWorkout.type === WorkoutType.RACE) {
      setView('RACES');
    } else {
      setView('HISTORY');
    }
  };

  const handleDeleteWorkout = (id: string) => {
    const remainingWorkouts = workouts.filter(w => w.id !== id);
    const updatedCourses = courses.map(c => {
        if (c.bestEffort?.workoutId === id) {
             return { ...c, bestEffort: undefined };
        }
        return c;
    });

    const finalWorkouts = recalculateRecords(remainingWorkouts, currentSeason?.startDate, profile.pbs, seasons);

    save({
        ...data,
        workouts: finalWorkouts,
        courses: updatedCourses
    });
    
    showToast('Log Deleted');
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    save({ ...data, profile: updatedProfile });
  };

  const handleSaveCourses = (updatedCourses: Course[]) => {
      save({ ...data, courses: updatedCourses });
  };

  const handleSaveShoes = (updatedShoes: Shoe[]) => {
      save({ ...data, shoes: updatedShoes });
  };

  const handleAddGoal = (goal: Goal) => {
      const updatedGoals = [...goals, goal];
      save({ ...data, goals: updatedGoals });
      showToast('Upcoming Race Added');
  };

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD':
        return <Dashboard workouts={workouts} goals={goals} profile={profile} currentSeason={currentSeason || undefined} />;
      case 'LOG':
        return <WorkoutForm onSave={handleSaveWorkout} onCancel={() => setView('DASHBOARD')} courses={courses} shoes={shoes} />;
      case 'HISTORY':
        return <WorkoutList workouts={workouts} goals={goals} courses={courses} onDelete={handleDeleteWorkout} />;
      case 'RACES':
        return <Races workouts={workouts} goals={goals} onAddGoal={handleAddGoal} onDeleteRace={handleDeleteWorkout} />;
      case 'COURSES':
        return <Courses courses={courses} onSave={handleSaveCourses} />;
      case 'SHOES':
        return <ShoeDepository shoes={shoes} workouts={workouts} onSave={handleSaveShoes} />;
      case 'ANALYSIS':
        return <Analysis workouts={workouts} goals={goals} />;
      case 'COACH':
        return <CoachChat workouts={workouts} profile={profile} />;
      case 'PROFILE':
        return <Profile profile={profile} onSave={handleSaveProfile} onGenerateSourceCode={exportSourceCode} />;
      case 'SEASONS':
        return <Seasons 
                  currentSeason={currentSeason} 
                  pastSeasons={pastSeasons} 
                  onStartSeason={handleStartSeason} 
                  onEndSeason={handleEndSeason} 
                  onUpdateSeason={handleUpdateSeason}
                  workouts={workouts} 
                  goals={goals} 
               />;
      default:
        return <Dashboard workouts={workouts} goals={goals} profile={profile} />;
    }
  };

  return (
    <Layout currentView={view} setView={setView} goals={goals}>
      {renderContent()}
      
      {toast && (
          <div className="fixed bottom-8 right-8 z-50 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl border border-brand-500 animate-in slide-in-from-bottom-5 flex items-center">
             <div className="text-2xl mr-3">{toast.includes('PB') ? '🎉' : '🏆'}</div>
             <div className="font-bold">{toast}</div>
          </div>
      )}
    </Layout>
  );
};

export default App;
