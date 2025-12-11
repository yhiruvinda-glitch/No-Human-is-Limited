import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { chatWithCoach } from '../services/geminiService';
import { Workout, UserProfile } from '../types';
import { FormatAIResponse } from './Dashboard';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
}

interface CoachChatProps {
    workouts: Workout[];
    profile: UserProfile;
}

const CoachChat: React.FC<CoachChatProps> = ({ workouts, profile }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: `Hei. I am Jakob. I have reviewed your training logs. Let's keep it kontrollert. Do not ask me for magic workouts; ask me how to do the work.`, sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const responseText = await chatWithCoach(input, workouts, profile);
        
        const botMsg: Message = { id: Date.now() + 1, text: responseText, sender: 'bot' };
        setMessages(prev => [...prev, botMsg]);
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-4xl mx-auto bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="bg-slate-900/90 p-4 border-b border-slate-700 flex items-center justify-between backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white flex items-center">
                    <div className="bg-brand-600 p-1.5 rounded-lg mr-3">
                        <Bot className="text-white" size={18} />
                    </div>
                    Coach Jakob
                </h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">Gemini 3.0</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-950/30">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] md:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${msg.sender === 'user' ? 'bg-brand-600' : 'bg-slate-700'}`}>
                                {msg.sender === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-brand-400" />}
                            </div>
                            
                            {/* Bubble */}
                            <div className={`px-5 py-4 rounded-2xl text-sm shadow-md ${
                                msg.sender === 'user' 
                                ? 'bg-brand-600 text-white rounded-br-sm' 
                                : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                            }`}>
                                {msg.sender === 'bot' ? (
                                    <FormatAIResponse text={msg.text} />
                                ) : (
                                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                         <div className="flex max-w-[80%] items-end gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10"><Bot size={14} className="text-brand-400" /></div>
                             <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
                                <div className="flex space-x-1.5 h-5 items-center">
                                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-200"></div>
                                </div>
                             </div>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about pacing, threshold, or race strategy..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-5 pr-14 py-4 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-600 transition shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="absolute right-2 top-2 bottom-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-2.5 rounded-lg transition shadow-lg"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CoachChat;