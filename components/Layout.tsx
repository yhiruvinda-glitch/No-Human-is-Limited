import React from 'react';
import { ViewState, Goal } from '../types';
import { Activity, PlusCircle, BarChart2, MessageSquare, LayoutDashboard, User, Map, Archive, ShoppingBag, Trophy, Timer, ChevronRight, Zap } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
  goals?: Goal[];
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, goals = [] }) => {
  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'LOG', label: 'Log Activity', icon: PlusCircle },
    { id: 'HISTORY', label: 'Activities', icon: Activity },
    { id: 'RACES', label: 'Races', icon: Trophy },
    { id: 'COURSES', label: 'Courses', icon: Map },
    { id: 'SHOES', label: 'Gear', icon: ShoppingBag },
    { id: 'ANALYSIS', label: 'Analysis', icon: BarChart2 },
    { id: 'SEASONS', label: 'Seasons', icon: Archive },
    { id: 'COACH', label: 'AI Coach', icon: MessageSquare },
    { id: 'PROFILE', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-brand-500 selection:text-white">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900/90 backdrop-blur-md p-4 border-b border-slate-800 flex flex-col sticky top-0 z-50">
        <div className="flex justify-between items-center mb-4">
             <div>
                <h1 className="text-xl font-black italic tracking-tighter text-white leading-none">NO HUMAN</h1>
                <h1 className="text-xl font-black italic tracking-tighter text-brand-500 leading-none">IS LIMITED</h1>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                 <User size={16} className="text-slate-400" />
             </div>
        </div>
        <div className="flex space-x-6 overflow-x-auto pb-2 no-scrollbar">
          {navItems.map((item) => (
             <button
               key={item.id}
               onClick={() => setView(item.id as ViewState)}
               className={`flex flex-col items-center min-w-[60px] group ${currentView === item.id ? 'text-brand-500' : 'text-slate-500'}`}
             >
               <div className={`p-2 rounded-full mb-1 transition ${currentView === item.id ? 'bg-brand-500/10' : 'group-hover:bg-slate-800'}`}>
                   <item.icon size={20} className={currentView === item.id ? 'stroke-[2.5px]' : ''} />
               </div>
               <span className={`text-[10px] font-bold uppercase tracking-tight ${currentView === item.id ? 'text-white' : ''}`}>{item.label}</span>
             </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800/50 sticky top-0 h-screen p-6 shadow-2xl z-40">
        <div className="mb-10 mt-2 px-2">
          <div className="flex items-center space-x-2 mb-2">
               <Zap className="text-brand-500 fill-brand-500" size={24} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white leading-none">NO HUMAN</h1>
          <h1 className="text-3xl font-black italic tracking-tighter text-brand-500 leading-none">IS LIMITED</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group ${
                currentView === item.id 
                  ? 'bg-slate-800 text-white font-bold border-l-4 border-brand-500 shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                  <item.icon size={20} className={`transition-transform duration-200 ${currentView === item.id ? 'text-brand-500' : 'group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
              </div>
              {currentView === item.id && <ChevronRight size={14} className="text-brand-500" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-slate-950 scroll-smooth">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
             {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;