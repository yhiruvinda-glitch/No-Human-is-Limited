
import { GoogleGenAI } from "@google/genai";
import { Workout, Goal, UserProfile } from '../types';
import { SYSTEM_INSTRUCTION_COACH } from '../constants';

// Initialize Gemini Client
const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' }); 

const PRIMARY_MODEL = 'gemini-3-pro-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash';

const handleGenAIError = (error: any, defaultMsg: string) => {
    console.error("Gemini API Error:", error);
    const msg = error.message || '';
    
    if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') || !apiKey) {
        return "⚠️ Setup Error: API_KEY is missing or invalid. Please configure it in your Vercel project settings.";
    }

    if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        return "⚠️ AI Limit Reached: Coach is taking a break. Please try again later.";
    }
    return defaultMsg;
};

const checkApiKey = (): boolean => {
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('undefined')) {
        console.warn("API_KEY is missing in environment variables.");
        return false;
    }
    return true;
}

const generateSafe = async (contents: any, config?: any): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            contents,
            config
        });
        return response;
    } catch (error: any) {
        const msg = error.message || '';
        if (msg.includes('API key') || msg.includes('403') || msg.includes('INVALID_ARGUMENT')) {
            throw error;
        }
        console.warn(`Primary model (${PRIMARY_MODEL}) failed. Retrying with fallback (${FALLBACK_MODEL})...`, error);
        const response = await ai.models.generateContent({
            model: FALLBACK_MODEL,
            contents,
            config
        });
        return response;
    }
};

export const analyzeWorkoutLog = async (workout: Workout, profile?: UserProfile): Promise<string> => {
  if (!checkApiKey()) return "⚠️ Configuration Error: API_KEY is missing.";

  try {
    const today = new Date().toLocaleDateString();
    const prompt = `
      Today's date is: ${today}. Use this as the reference point for relative time.
      Analyze this specific workout for the following runner:
      ${profile ? `Profile: Age ${profile.age}, Preferred Race ${profile.preferredRace}. Injuries: ${profile.injuryHistory.filter(i=>i.status!=='Resolved').map(i=>i.description).join(', ') || 'None active'}.` : ''}

      Workout Details:
      Date: ${new Date(workout.date).toDateString()}
      Type: ${workout.type}
      Distance: ${workout.distance}km
      Duration: ${workout.duration}min
      Avg HR: ${workout.avgHr || 'N/A'} bpm
      Max HR: ${workout.maxHr || 'N/A'} bpm
      Surface: ${workout.surface || 'N/A'}
      Shoes: ${workout.shoe || 'N/A'}
      RPE: ${workout.rpe}/10
      Feeling: ${workout.feeling}/10
      Notes: ${workout.notes}
      ${workout.intervals ? `Intervals: ${JSON.stringify(workout.intervals)}` : ''}
      
      Provide a brief 3-sentence feedback on quality, pacing (relative to HR if available), and recovery needs.
    `;

    const response = await generateSafe(prompt, {
        systemInstruction: SYSTEM_INSTRUCTION_COACH,
    });
    
    return response.text || "Could not generate analysis.";
  } catch (error) {
    return handleGenAIError(error, "AI service unavailable.");
  }
};

export const getWeeklyCoachInsights = async (workouts: Workout[], profile?: UserProfile): Promise<string> => {
  if (!checkApiKey()) return "⚠️ Configuration Error: API_KEY is missing.";

  try {
    const today = new Date().toLocaleDateString();
    // FIX: Sort newest-first, take 10, then reverse to chronological for AI readability
    const recentWorkouts = workouts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .reverse();

    const prompt = `
      Today's date is: ${today}. Use this to accurately calculate gaps between sessions.
      If the most recent workout was several days ago, do not say it was "yesterday".
      ${profile ? `Athlete Profile: Name: ${profile.name}, Age: ${profile.age}, Weekly Avail: ${profile.weeklyAvailability}. Injuries: ${JSON.stringify(profile.injuryHistory)}` : ''}
      
      Here are the athlete's 10 most recent workouts (Chronological Order):
      ${JSON.stringify(recentWorkouts)}

      Analyze the training trend OVER THE LAST WEEK relative to today (${today}).
      - Focus on the most recent entries. If there are gaps, comment on the comeback or consistency.
      - Analyze the Training Load trend.
      - Look at Heart Rate response.
      - Any signs of overtraining?
      - Are they hitting the specific systems for their preferred race (${profile?.preferredRace || '5k'})?
      
      Format response as a concise bulleted list of 3 Key Insights and 1 Actionable Tip for next week.
    `;

    const response = await generateSafe(prompt, {
        systemInstruction: SYSTEM_INSTRUCTION_COACH,
    });

    return response.text || "Could not generate insights.";
  } catch (error) {
    return handleGenAIError(error, "AI insights currently unavailable.");
  }
};

export const getDailyGuidance = async (workouts: Workout[], goals: Goal[], profile?: UserProfile): Promise<{title: string, content: string}> => {
    if (!checkApiKey()) {
        return { title: 'Setup Required', content: 'API_KEY is missing.' };
    }

    try {
        const today = new Date().toLocaleDateString();
        // FIX: Grab 5 most recent workouts correctly
        const recent = workouts
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .reverse();
        
        const upcomingRace = goals.find(g => {
            if (!g.deadline) return false;
            const diff = new Date(g.deadline).getTime() - Date.now();
            return diff > 0 && diff < (14 * 24 * 60 * 60 * 1000);
        });

        const prompt = `
        Today's date is: ${today}. Reference this for taper calculations.
        Athlete Context: ${profile ? `Age ${profile.age}, Injuries: ${profile.injuryHistory.filter(i=>i.status==='Active').map(i=>i.description).join(',') || 'none'}.` : ''}
        
        Recent Training History (Last 5 sessions):
        ${JSON.stringify(recent)}
        
        Current Goals: ${JSON.stringify(goals)}
        Upcoming Race: ${upcomingRace ? `Yes, ${upcomingRace.name} on ${upcomingRace.deadline}` : 'None immediate'}

        Task:
        Provide a specific training suggestion for TODAY. 
        If a race is within 14 days, strictly apply tapering principles.
        Check the date of the very last workout. If it was more than 2 days ago, encourage getting back into rhythm rolig.
        
        Output Format:
        Return JSON object: { "title": "Short Headline", "content": "2-3 sentences of specific advice." }
        `;

        const response = await generateSafe(prompt, {
            responseMimeType: 'application/json',
            systemInstruction: SYSTEM_INSTRUCTION_COACH
        });

        const json = JSON.parse(response.text || '{}');
        return {
            title: json.title || 'Daily Training Focus',
            content: json.content || 'Continue with your structured plan. Listen to your body.'
        };

    } catch (error: any) {
        console.error("Gemini Daily Guidance Error:", error);
        return { title: 'Daily Focus', content: 'Focus on consistency and recovery today.' };
    }
};

export const compareWorkouts = async (w1: Workout, w2: Workout): Promise<string> => {
    if (!checkApiKey()) return "⚠️ API_KEY missing.";

    try {
        const prompt = `
        Compare these two workouts side-by-side:
        
        Workout A (${new Date(w1.date).toDateString()}):
        Type: ${w1.type}, Dist: ${w1.distance}, Time: ${w1.duration}, RPE: ${w1.rpe}, HR: ${w1.avgHr}, Notes: ${w1.notes}
        ${w1.intervals ? `Intervals: ${JSON.stringify(w1.intervals)}` : ''}

        Workout B (${new Date(w2.date).toDateString()}):
        Type: ${w2.type}, Dist: ${w2.distance}, Time: ${w2.duration}, RPE: ${w2.rpe}, HR: ${w2.avgHr}, Notes: ${w2.notes}
        ${w2.intervals ? `Intervals: ${JSON.stringify(w2.intervals)}` : ''}

        Task:
        Identify the progression or regression.
        Keep it to 4 concise sentences.
        `;

        const response = await generateSafe(prompt, { 
            systemInstruction: SYSTEM_INSTRUCTION_COACH 
        });

        return response.text || "Comparison unavailable.";
    } catch (error) {
        return handleGenAIError(error, "Could not compare workouts.");
    }
};

export const chatWithCoach = async (message: string, contextWorkouts: Workout[], profile?: UserProfile): Promise<string> => {
    if (!checkApiKey()) return "⚠️ Configuration Error: API_KEY is missing.";

    try {
        const today = new Date().toLocaleDateString();
        // FIX: Ensure chat context uses 5 most recent workouts
        const recentContext = contextWorkouts
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .reverse();

        const prompt = `
        Today's date is: ${today}. Use this as your temporal reference.
        Context: 
        User Profile: ${profile ? JSON.stringify(profile) : 'N/A'}
        Most Recent Training: ${JSON.stringify(recentContext)}.
        
        User Question: "${message}"
        
        Answer as their coach Jakob. Use their profile (Name, Injuries, Goals) to personalize the answer.
        `;

        const response = await generateSafe(prompt, {
            systemInstruction: SYSTEM_INSTRUCTION_COACH,
        });
        return response.text || "Coach is silent right now.";
    } catch (error) {
        return handleGenAIError(error, "Coach is offline.");
    }
}
