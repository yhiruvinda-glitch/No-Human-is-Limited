
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { chatWithCoach } from '../services/geminiService';
import { Workout, UserProfile } from '../types';

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
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-4xl mx-auto bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="bg-slate-900/50 p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white flex items-center">
                    <Bot className="text-brand-500 mr-2" size={20} /> Coach Jakob
                </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-brand-600' : 'bg-slate-600'}`}>
                                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`px-4 py-3 rounded-2xl text-sm ${
                                msg.sender === 'user' 
                                ? 'bg-brand-600 text-white rounded-br-none' 
                                : 'bg-slate-700 text-slate-100 rounded-bl-none'
                            }`}>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                         <div className="flex max-w-[80%] items-end gap-2">
                             <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0"><Bot size={16} /></div>
                             <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-none">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                             </div>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-700">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about pacing, threshold, or race strategy..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-3 rounded-lg transition"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CoachChat;
