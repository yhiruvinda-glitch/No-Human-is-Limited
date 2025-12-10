
import { GoogleGenAI } from "@google/genai";
import { Workout, Goal, UserProfile } from '../types';
import { SYSTEM_INSTRUCTION_COACH } from '../constants';

// Initialize Gemini Client
// Note: process.env.API_KEY is assumed to be available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleGenAIError = (error: any, defaultMsg: string) => {
    console.error("Gemini API Error:", error);
    const msg = error.message || '';
    if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        return "⚠️ AI Limit Reached: Coach is taking a break. Please try again later.";
    }
    return defaultMsg;
};

export const analyzeWorkoutLog = async (workout: Workout, profile?: UserProfile): Promise<string> => {
  try {
    const prompt = `
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_COACH,
      }
    });
    
    return response.text || "Could not generate analysis.";
  } catch (error) {
    return handleGenAIError(error, "AI service unavailable. Please check your API key.");
  }
};

export const getWeeklyCoachInsights = async (workouts: Workout[], profile?: UserProfile): Promise<string> => {
  try {
    const recentWorkouts = workouts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Last 10 workouts

    const prompt = `
      ${profile ? `Athlete Profile: Name: ${profile.name}, Age: ${profile.age}, Weekly Avail: ${profile.weeklyAvailability}. Injuries: ${JSON.stringify(profile.injuryHistory)}` : ''}
      
      Here are the athlete's recent workouts (JSON format):
      ${JSON.stringify(recentWorkouts)}

      Analyze the training trend over the last week.
      - Are they balancing intensity and volume?
      - Analyze the Training Load (Duration * RPE) trend.
      - Look at Heart Rate response if available.
      - Any signs of overtraining (high RPE on easy days)?
      - Are they hitting the specific systems for their preferred race (${profile?.preferredRace || '5k'})?
      
      Format response as a concise bulleted list of 3 Key Insights and 1 Actionable Tip for next week.
    `;

    // Switched to 'gemini-2.5-flash' to reduce quota usage (was gemini-3-pro-preview)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_COACH,
      }
    });

    return response.text || "Could not generate insights.";
  } catch (error) {
    return handleGenAIError(error, "AI insights currently unavailable.");
  }
};

export const getDailyGuidance = async (workouts: Workout[], goals: Goal[], profile?: UserProfile): Promise<{title: string, content: string}> => {
    try {
        const recent = workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
        
        // Check for upcoming races
        const upcomingRace = goals.find(g => {
            if (!g.deadline) return false;
            const diff = new Date(g.deadline).getTime() - Date.now();
            return diff > 0 && diff < (14 * 24 * 60 * 60 * 1000); // Within 2 weeks
        });

        const prompt = `
        Context:
        ${profile ? `Athlete: Age ${profile.age}, History of ${profile.injuryHistory.filter(i=>i.status==='Active').map(i=>i.description).join(',') || 'no active injuries'}.` : ''}
        Recent Workouts: ${JSON.stringify(recent)}
        Goals: ${JSON.stringify(goals)}
        Upcoming Race: ${upcomingRace ? `Yes, ${upcomingRace.name} on ${upcomingRace.deadline}` : 'None immediate'}

        Task:
        Provide a specific training suggestion for TODAY. 
        If a race is within 14 days, strictly apply tapering principles (reduce volume, keep intensity sharpness).
        If fatigued (high RPE recently), suggest recovery.
        Consider their weekly availability: ${profile?.weeklyAvailability || 'Unspecified'}.
        
        Output Format:
        Return JSON object: { "title": "Short Headline (e.g. Rest Day Recommended)", "content": "2-3 sentences of specific advice." }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                systemInstruction: SYSTEM_INSTRUCTION_COACH
            }
        });

        const json = JSON.parse(response.text || '{}');
        return {
            title: json.title || 'Daily Training Focus',
            content: json.content || 'Continue with your structured plan. Listen to your body.'
        };

    } catch (error: any) {
        console.error("Gemini Daily Guidance Error:", error);
        const msg = error.message || '';
        if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) {
             return { title: 'AI Offline', content: 'Quota limits reached. Focus on consistency and listen to your body today.' };
        }
        return { title: 'Daily Focus', content: 'Focus on consistency and recovery today.' };
    }
};

export const compareWorkouts = async (w1: Workout, w2: Workout): Promise<string> => {
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
        - Compare pace vs heart rate efficiency.
        - Compare perceived effort.
        - Which session was higher quality for a 5K runner?
        
        Keep it to 4 concise sentences.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: SYSTEM_INSTRUCTION_COACH }
        });

        return response.text || "Comparison unavailable.";
    } catch (error) {
        return handleGenAIError(error, "Could not compare workouts.");
    }
};

export const chatWithCoach = async (message: string, contextWorkouts: Workout[], profile?: UserProfile): Promise<string> => {
    try {
        const recentContext = contextWorkouts.slice(0, 5);
        const prompt = `
        Context: 
        User Profile: ${profile ? JSON.stringify(profile) : 'N/A'}
        Recent Workouts: ${JSON.stringify(recentContext)}.
        
        User Question: "${message}"
        
        Answer as their coach. Keep it motivating but realistic. Use their profile (Name, Injuries, Goals) to personalize the answer.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION_COACH,
            }
        });
        return response.text || "Coach is silent right now.";
    } catch (error) {
        return handleGenAIError(error, "Coach is offline.");
    }
}
