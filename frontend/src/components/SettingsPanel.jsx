import React, { useState } from 'react';
import { api } from '../api';
import { ShieldAlert, RefreshCw, Server, Database } from 'lucide-react';

export default function SettingsPanel({ activeRole }) {
  const [seeding, setSeeding] = useState(false);

  const handleSeedDatabase = async () => {
    if (!window.confirm("Are you sure you want to reset and seed the database with 5,000 employees and 5,500 seats? This will clear current allocations.")) return;
    setSeeding(true);
    try {
      const res = await api.triggerSeeding();
      alert(res.message || "Seeding started! Please wait ~60 seconds then refresh the page.");
    } catch (err) {
      // 202 Accepted is success — some axios versions treat non-200 as error
      if (err?.response?.status === 202) {
        alert("Seeding started! Please wait ~60 seconds then refresh the page.");
      } else {
        alert("Failed to seed database: " + (err?.response?.data?.detail || err.message));
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* System Status Details */}
      <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-ethara-border/30">
          <Server className="w-4 h-4 text-ethara-primary" />
          Environment Diagnostics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-200 dark:border-ethara-border/30 space-y-1">
            <span className="text-slate-500 block">Workspace Application</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Ethara Workspace</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-200 dark:border-ethara-border/30 space-y-1">
            <span className="text-slate-500 block">Hosting Environment</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Production</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-200 dark:border-ethara-border/30 space-y-1">
            <span className="text-slate-500 block">FastAPI Server Host</span>
            <span className="font-mono text-slate-850 dark:text-slate-300 text-[10px]">seat-allocation-project-mapping-system.onrender.com</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-200 dark:border-ethara-border/30 space-y-1">
            <span className="text-slate-500 block">Database Status</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-500" /> PostgreSQL (Supabase)
            </span>
          </div>
        </div>
      </div>

      {/* Database Operations (Admin Only) */}
      <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-ethara-border/30">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          Administrative Operations
        </h3>
        <div className="space-y-4 text-xs">
          <p className="text-slate-550 dark:text-slate-400">
            System Administrator actions will override database constraints. Operations like seeding or clearing records can result in permanent modifications to active seating allocations.
          </p>
          
          {activeRole === 'Admin' ? (
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="max-w-md bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
              Reset & Seed Database (5,500 seats, 5,000 employees)
            </button>
          ) : (
            <div className="bg-slate-100 dark:bg-slate-900/40 p-4 rounded text-slate-550 dark:text-slate-500 border border-slate-250 dark:border-ethara-border/30 text-center italic">
              Only active Administrators can reset or seed database. Use the simulated Role Switcher in the top navbar to switch roles.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
