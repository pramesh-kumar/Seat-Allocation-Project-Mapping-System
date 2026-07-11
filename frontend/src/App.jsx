import React, { useState, useEffect } from 'react';
import { api } from './api';
import StatsDashboard from './components/StatsDashboard';
import FloorPlan from './components/FloorPlan';
import SeatingTable from './components/SeatingTable';
import OnboardingPanel from './components/OnboardingPanel';
import ProjectsPanel from './components/ProjectsPanel';
import ReportsPanel from './components/ReportsPanel';
import SettingsPanel from './components/SettingsPanel';
import AiChatPanel from './components/AiChatPanel';
import { 
  LayoutDashboard, 
  Map, 
  Users, 
  UserPlus, 
  Bot, 
  RefreshCw, 
  ChevronRight, 
  Building,
  Sparkles,
  Sun,
  Moon,
  FolderLock,
  FileBarChart,
  Settings,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [role, setRole] = useState(() => localStorage.getItem('user_role') || 'Employee');
  const [seeding, setSeeding] = useState(false);

  // Dark/Light Mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Sync role to localStorage
  useEffect(() => {
    localStorage.setItem('user_role', role);
  }, [role]);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleRoleChange = (e) => {
    setRole(e.target.value);
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm("Are you sure you want to reset and seed the database with 5,000 employees and seats? This will clear current allocations.")) return;
    setSeeding(true);
    try {
      const res = await api.triggerSeeding();
      alert(res.message || "Seeding started! Please wait ~60 seconds then refresh the page.");
    } catch (err) {
      if (err?.response?.status === 202) {
        alert("Seeding started! Please wait ~60 seconds then refresh the page.");
      } else {
        alert("Seeding error: " + (err?.response?.data?.detail || err.message));
      }
    } finally {
      setSeeding(false);
    }
  };

  // External Navigation state (controlled by AI Chat or Onboarding Panel)
  const [extFloor, setExtFloor] = useState(null);
  const [extZone, setExtZone] = useState(null);
  const [extSeatCode, setExtSeatCode] = useState(null);

  const handleAiNavigation = ({ floor, zone, seatCode }) => {
    if (floor) setExtFloor(floor);
    if (zone) setExtZone(zone);
    if (seatCode) setExtSeatCode(seatCode);
    setActiveTab('floor-plan');
  };

  const handleOnboardingManualSelection = (employee) => {
    setActiveTab('floor-plan');
  };

  const clearExternalNav = () => {
    setExtFloor(null);
    setExtZone(null);
    setExtSeatCode(null);
  };

  // Helper to format tab label for breadcrumb
  const getTabLabel = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'floor-plan': return 'Floor Plan';
      case 'employees': return 'Employees';
      case 'onboarding': return 'Onboarding';
      case 'projects': return 'Projects';
      case 'ai-assistant': return 'AI Assistant';
      case 'reports': return 'Reports';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen bg-ethara-dark text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar navigation */}
      <aside className="hidden md:flex md:flex-col w-64 bg-ethara-sidebar border-r border-ethara-border/50 flex-shrink-0">
        <div className="p-5 border-b border-ethara-border/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            ET
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-wider text-slate-800 dark:text-slate-100 uppercase">Ethara Workspace</div>
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">Seat & Project Management</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === 'dashboard'
                ? 'bg-blue-600/10 border border-blue-500/30 text-ethara-primary shadow-sm shadow-blue-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('floor-plan')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === 'floor-plan'
                ? 'bg-blue-600/10 border border-blue-500/30 text-ethara-primary shadow-sm shadow-blue-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <Map className="w-4 h-4" />
            Floor Plan
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === 'employees'
                ? 'bg-blue-600/10 border border-blue-500/30 text-ethara-primary shadow-sm shadow-blue-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <Users className="w-4 h-4" />
            Employees
          </button>

          <button
            onClick={() => setActiveTab('onboarding')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === 'onboarding'
                ? 'bg-blue-600/10 border border-blue-500/30 text-ethara-primary shadow-sm shadow-blue-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Onboarding
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === 'projects'
                ? 'bg-blue-600/10 border border-blue-500/30 text-ethara-primary shadow-sm shadow-blue-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <FolderLock className="w-4 h-4" />
            Projects
          </button>

          <button
            onClick={() => setActiveTab('ai-assistant')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === 'ai-assistant'
                ? 'bg-blue-600/10 border border-blue-500/30 text-ethara-primary shadow-sm shadow-blue-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <Bot className="w-4 h-4" />
            AI Assistant
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === 'reports'
                ? 'bg-blue-600/10 border border-blue-500/30 text-ethara-primary shadow-sm shadow-blue-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <FileBarChart className="w-4 h-4" />
            Reports
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === 'settings'
                ? 'bg-blue-600/10 border border-blue-500/30 text-ethara-primary shadow-sm shadow-blue-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>

        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-ethara-border/30 text-[10px] text-slate-400 dark:text-slate-500 space-y-1 bg-ethara-sidebar flex-shrink-0">
          <div className="font-semibold">Ethara Workspace</div>
          <div className="flex justify-between items-center text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Environment: Production
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-16 bg-ethara-sidebar border-b border-ethara-border/50 px-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-7 h-7 rounded bg-ethara-primary flex items-center justify-center font-bold text-white text-sm">E</div>
            <span className="font-bold text-base tracking-wide text-slate-855 dark:text-slate-100">Ethara Workspace</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm text-slate-550 dark:text-slate-400">
            <Building className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
            <span>Headquarters</span>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{getTabLabel()}</span>
          </div>

          {/* User controls / Role Selector / Mode Toggle / Seeding */}
          <div className="flex items-center gap-4">
            
            {/* Simulated Session Role Switcher */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-sm font-semibold text-slate-550 dark:text-slate-400">Role:</span>
              <select
                value={role}
                onChange={handleRoleChange}
                className="bg-ethara-input border border-ethara-border rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ethara-primary cursor-pointer"
              >
                <option value="Employee">Employee (View-only)</option>
                <option value="HR">HR Specialist</option>
                <option value="Project Lead">Project Team Manager</option>
                <option value="Admin">System Administrator</option>
              </select>
            </div>

            {/* Quick Seeding Tool for Admin */}
            {role === 'Admin' && (
              <button
                onClick={handleSeedDatabase}
                disabled={seeding}
                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 border border-ethara-border hover:border-slate-400 dark:hover:border-slate-500 text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                title="Reset database and seed 5,000 employees"
              >
                <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Reset & Seed DB</span>
              </button>
            )}

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-lg border bg-ethara-input border-ethara-border hover:border-slate-400 dark:hover:border-slate-650 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

          </div>
        </header>

        {/* Tab content router view */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-ethara-dark">
          {activeTab === 'dashboard' && <StatsDashboard />}
          {activeTab === 'floor-plan' && (
            <FloorPlan 
              activeRole={role}
              externalFloor={extFloor}
              externalZone={extZone}
              externalSeatCode={extSeatCode}
              clearExternal={clearExternalNav}
            />
          )}
          {activeTab === 'employees' && <SeatingTable activeRole={role} />}
          {activeTab === 'onboarding' && (
            <OnboardingPanel 
              activeRole={role} 
              switchToFloorPlan={handleOnboardingManualSelection} 
            />
          )}
          {activeTab === 'projects' && <ProjectsPanel activeRole={role} />}
          {activeTab === 'ai-assistant' && (
            <AiChatPanel 
              activeRole={role} 
              onAiNavigation={handleAiNavigation} 
            />
          )}
          {activeTab === 'reports' && <ReportsPanel />}
          {activeTab === 'settings' && <SettingsPanel activeRole={role} />}
        </div>

        {/* Mobile quick-nav overlay bar */}
        <div className="md:hidden h-14 bg-ethara-sidebar border-t border-ethara-border/50 flex justify-around items-center flex-shrink-0 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`p-2 flex flex-col items-center gap-0.5 min-w-[70px] ${activeTab === 'dashboard' ? 'text-ethara-primary' : 'text-slate-500'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[9px]">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('floor-plan')}
            className={`p-2 flex flex-col items-center gap-0.5 min-w-[70px] ${activeTab === 'floor-plan' ? 'text-ethara-primary' : 'text-slate-500'}`}
          >
            <Map className="w-4 h-4" />
            <span className="text-[9px]">Map</span>
          </button>
          <button 
            onClick={() => setActiveTab('employees')}
            className={`p-2 flex flex-col items-center gap-0.5 min-w-[70px] ${activeTab === 'employees' ? 'text-ethara-primary' : 'text-slate-500'}`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[9px]">Employees</span>
          </button>
          <button 
            onClick={() => setActiveTab('onboarding')}
            className={`p-2 flex flex-col items-center gap-0.5 min-w-[70px] ${activeTab === 'onboarding' ? 'text-ethara-primary' : 'text-slate-500'}`}
          >
            <UserPlus className="w-4 h-4" />
            <span className="text-[9px]">Onboarding</span>
          </button>
        </div>

      </main>

    </div>
  );
}
