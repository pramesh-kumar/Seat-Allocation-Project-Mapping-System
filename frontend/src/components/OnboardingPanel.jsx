import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Users, User, Armchair, ChevronRight, CheckCircle, ShieldAlert, Award } from 'lucide-react';

export default function OnboardingPanel({ activeRole, switchToFloorPlan }) {
  const [onboarders, setOnboarders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    fetchOnboarders();
  }, []);

  const fetchOnboarders = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployees({ status: 'ONBOARDING', limit: 100 });
      setOnboarders(res.data || []);
      setSelectedEmp(null);
      setRecommendations([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmployee = async (emp) => {
    setSelectedEmp(emp);
    setRecommendations([]);
    setRecLoading(true);
    try {
      const data = await api.getSeatRecommendations(emp.id);
      setRecommendations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRecLoading(false);
    }
  };

  const handleAllocate = async (seatId, seatCode) => {
    if (!selectedEmp) return;
    setAllocating(true);
    try {
      await api.allocateSeat(selectedEmp.id, seatId);
      alert(`Successfully allocated seat ${seatCode} to ${selectedEmp.first_name} ${selectedEmp.last_name}!`);
      fetchOnboarders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Allocation failed');
    } finally {
      setAllocating(false);
    }
  };

  const getRecommendationReason = (seat, emp) => {
    const primaryProj = emp.projects?.find(p => p.is_primary)?.project_name;
    if (primaryProj) {
      return `Teammate Clustered (Closest free desk near '${primaryProj}' team)`;
    }
    return `Department Allocation (Located in the ${emp.department} floor zone)`;
  };

  return (
    <div className="space-y-6">
      
      {/* Onboarding Overview Warning for Employees */}
      {activeRole !== 'HR' && activeRole !== 'Admin' && (
        <div className="glass p-5 rounded-xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/60 dark:bg-rose-950/20 flex gap-3 text-sm text-rose-700 dark:text-rose-300">
          <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-800 dark:text-rose-200">Access Restricted</div>
            <p className="text-xs text-rose-600 dark:text-rose-400/90 mt-1">
              Onboarding and Seat Allocation Desk is restricted to HR and Admin accounts. As an Employee, you can view the onboarding queue, but you cannot request recommendations or commit allocations. Use the simulated Role Switcher in the top navbar to switch roles.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Onboarding Queue */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-ethara-border/30 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-ethara-primary" />
              Onboarding Queue ({onboarders.length})
            </h3>
            <button 
              onClick={fetchOnboarders}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ethara-primary mx-auto"></div>
              </div>
            ) : onboarders.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs italic">All new joiners have been allocated seats!</div>
            ) : (
              onboarders.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex items-center justify-between cursor-pointer ${
                    selectedEmp && selectedEmp.id === emp.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-ethara-primary text-slate-900 dark:text-slate-100 shadow-md shadow-blue-500/5'
                      : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-250 dark:border-ethara-border/30 hover:border-slate-400 dark:hover:border-ethara-border text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{emp.first_name} {emp.last_name}</div>
                    <div className="text-[10px] text-slate-500">{emp.employee_id} • {emp.department}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Recommendations Panel */}
        <div className="lg:col-span-2 glass-premium p-6 rounded-xl border border-ethara-border/50 h-full min-h-[400px] flex flex-col">
          {selectedEmp ? (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              
              {/* Header */}
              <div className="border-b border-slate-200 dark:border-ethara-border/50 pb-4">
                <div className="flex items-center gap-2 text-xs text-ethara-primary font-bold uppercase tracking-wider mb-1">
                  <User className="w-3.5 h-3.5" />
                  New Joiner Profile
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {selectedEmp.first_name} {selectedEmp.last_name}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Employee ID</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEmp.employee_id}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Department</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEmp.department}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500">Designated Role</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEmp.role}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="flex-1 py-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-wider">
                  AI Seating Recommendations (Proximity Clustered)
                </h4>

                {recLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethara-primary"></div>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-10 text-center">No available seats in the office could be found. Reset database.</div>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((seat, index) => (
                      <div 
                        key={seat.id} 
                        className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-ethara-border/40 hover:border-slate-450 dark:hover:border-ethara-border/80 rounded-lg flex items-center justify-between gap-4 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-250 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                            {seat.seat_code.split('-')[3]}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{seat.seat_code}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Award className="w-3 h-3 text-ethara-secondary" />
                              {getRecommendationReason(seat, selectedEmp)}
                            </div>
                          </div>
                        </div>

                        {activeRole === 'HR' || activeRole === 'Admin' ? (
                          <button
                            onClick={() => handleAllocate(seat.id, seat.seat_code)}
                            disabled={allocating}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer disabled:bg-slate-800"
                          >
                            Allocate
                          </button>
                        ) : (
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 px-2 py-1 rounded">Read-only</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Selection Trigger */}
              <div className="border-t border-slate-200 dark:border-ethara-border/40 pt-4 flex justify-between items-center text-xs">
                <span className="text-slate-500">Don't want to use suggestions?</span>
                <button
                  onClick={() => switchToFloorPlan(selectedEmp)}
                  className="text-ethara-primary hover:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Choose manually on Floor Plan
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center flex-1 py-20">
              <Armchair className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4 animate-pulse-soft" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Select an Onboarding Employee</h3>
              <p className="text-xs text-slate-500 max-w-[280px] mt-1.5">
                Click on any new joiner in the queue to load their profile. The system will automatically compute coworker proximity and recommend adjacent desks.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
