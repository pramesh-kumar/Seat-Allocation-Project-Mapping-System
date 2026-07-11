import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { LayoutDashboard, Users, UserCheck, AlertTriangle, Building, Armchair, Percent, Activity } from 'lucide-react';

export default function StatsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ethara-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-10 text-slate-500 dark:text-slate-400">
        Failed to load analytics dashboard data. Make sure the database is seeded.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Occupancy Card */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Seat Utilization</span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.overall_occupancy_rate}%</div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Allocated seats vs total office slots</p>
          </div>
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-200 dark:border-blue-900/30 text-blue-600 dark:text-blue-400">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Total Seats Card */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Allocated Seats</span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.occupied_seats} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">/ {stats.total_seats}</span></div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{stats.available_seats} slots available for booking</p>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-250 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <Armchair className="w-6 h-6" />
          </div>
        </div>

        {/* Active Staff Card */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Employees</span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.active_employees}</div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Currently mapped to projects</p>
          </div>
          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/50 rounded-xl border border-purple-250 dark:border-purple-900/30 text-purple-600 dark:text-purple-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Onboarding Card */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Joiners</span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.onboarding_employees}</div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Pending seat allocation queue</p>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-250 dark:border-amber-900/30 text-amber-600 dark:text-amber-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Floor-by-Floor Metrics */}
        <div className="glass p-6 rounded-xl border border-ethara-border/40 space-y-4">
          <div className="flex items-center gap-2 border-b border-ethara-border/30 pb-3">
            <Building className="w-5 h-5 text-ethara-primary" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Floor Seating Metrics</h3>
          </div>
          
          <div className="space-y-4">
            {stats.by_floor.map((fl) => (
              <div key={fl.floor} className="space-y-1.5 p-3 bg-slate-100 dark:bg-slate-900/40 rounded-lg border border-ethara-border/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Floor {fl.floor}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {fl.occupied_seats} occupied • {fl.available_seats} free • {fl.occupancy_rate}%
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-ethara-border/40">
                  <div 
                    className="bg-ethara-primary h-full rounded-full transition-all duration-500" 
                    style={{ width: `${fl.occupancy_rate}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-500">
                  <span>Reserved: {fl.reserved_seats}</span>
                  <span>Maintenance: {fl.maintenance_seats}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Metrics */}
        <div className="glass p-6 rounded-xl border border-ethara-border/40 space-y-4">
          <div className="flex items-center gap-2 border-b border-ethara-border/30 pb-3">
            <Activity className="w-5 h-5 text-ethara-secondary" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Department Seating Utilization</h3>
          </div>

          <div className="max-h-[396px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {stats.by_department.map((dept) => (
              <div key={dept.department} className="p-3 bg-slate-100 dark:bg-slate-900/40 rounded-lg border border-ethara-border/30 flex justify-between items-center gap-4 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{dept.department}</div>
                  <div className="text-[10px] text-slate-500">{dept.employee_count} employees total</div>
                </div>
                
                <div className="text-right space-y-1">
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    {dept.allocated_seats} seats ({dept.occupancy_rate}%)
                  </div>
                  {/* Progress bar */}
                  <div className="w-24 bg-slate-200 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-300 dark:border-ethara-border/40 ml-auto">
                    <div 
                      className="bg-ethara-secondary h-full rounded-full transition-all" 
                      style={{ width: `${dept.occupancy_rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Database adjustments notice / quick admin actions */}
      <div className="p-4 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-ethara-border/40 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300">System Performance Metrics</div>
          <p>
            Utilization metrics reflect active allocations only. Reserved seats (3%) are locked for new joiners, and maintenance seats (2%) are temporarily offline. Seating calculations are performed on-demand directly via SQLite query aggregation providers.
          </p>
        </div>
      </div>

    </div>
  );
}
