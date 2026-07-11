import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FileText, Building, Activity, Wrench, Users } from 'lucide-react';

export default function ReportsPanel() {
  const [stats, setStats] = useState(null);
  const [maintSeats, setMaintSeats] = useState([]);
  const [onboarders, setOnboarders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const statsData = await api.getAnalytics();
      setStats(statsData);

      const seatMaint = await api.getSeats({ status: 'MAINTENANCE' });
      setMaintSeats(seatMaint);

      const onboardList = await api.getEmployees({ status: 'ONBOARDING', limit: 100 });
      setOnboarders(onboardList.data || []);
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass p-4 rounded-xl border border-ethara-border/40">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-ethara-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">System Seating Reports</h3>
            <p className="text-[10px] text-slate-500">Generate and view office seating utilization reports</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Floor Utilization Report */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-ethara-border/30">
            <Building className="w-4 h-4 text-ethara-primary" />
            Floor Utilization Breakdown
          </h4>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-200 dark:border-ethara-border/20">
                <th className="py-2">Floor</th>
                <th className="py-2">Total Seats</th>
                <th className="py-2">Occupied</th>
                <th className="py-2">Available</th>
                <th className="py-2 text-right">Occupancy %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-ethara-border/10 text-slate-700 dark:text-slate-300">
              {stats?.by_floor.map(fl => (
                <tr key={fl.floor}>
                  <td className="py-2.5 font-semibold">Floor {fl.floor}</td>
                  <td className="py-2.5">{fl.total_seats}</td>
                  <td className="py-2.5">{fl.occupied_seats}</td>
                  <td className="py-2.5">{fl.available_seats}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">{fl.occupancy_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Department Seating Report */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-ethara-border/30">
            <Activity className="w-4 h-4 text-ethara-secondary" />
            Department Seating Summary
          </h4>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-200 dark:border-ethara-border/20">
                <th className="py-2">Department</th>
                <th className="py-2">Employees</th>
                <th className="py-2">Mapped Seats</th>
                <th className="py-2 text-right">Utilization %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-ethara-border/10 text-slate-700 dark:text-slate-300">
              {stats?.by_department.map(dept => (
                <tr key={dept.department}>
                  <td className="py-2.5 font-semibold">{dept.department}</td>
                  <td className="py-2.5">{dept.employee_count}</td>
                  <td className="py-2.5">{dept.allocated_seats}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">{dept.occupancy_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Maintenance Flagged Seats Report */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-ethara-border/30">
            <Wrench className="w-4 h-4 text-rose-500" />
            Offline Maintenance Roster ({maintSeats.length})
          </h4>
          <div className="max-h-[220px] overflow-y-auto pr-1 custom-scrollbar text-xs">
            {maintSeats.length === 0 ? (
              <p className="text-slate-500 italic py-2">No seats currently marked for repairs.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-200 dark:border-ethara-border/20">
                    <th className="py-2">Seat Code</th>
                    <th className="py-2">Floor</th>
                    <th className="py-2">Zone</th>
                    <th className="py-2">Desk Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-ethara-border/10 text-slate-700 dark:text-slate-300">
                  {maintSeats.map(seat => (
                    <tr key={seat.id}>
                      <td className="py-2 font-mono font-bold text-rose-600 dark:text-rose-400">{seat.seat_code}</td>
                      <td className="py-2">Floor {seat.floor}</td>
                      <td className="py-2">Zone {seat.zone}</td>
                      <td className="py-2">{seat.number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending New Joiner Seating Report */}
        <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-ethara-border/30">
            <Users className="w-4 h-4 text-amber-500" />
            Pending Onboarding Roster ({onboarders.length})
          </h4>
          <div className="max-h-[220px] overflow-y-auto pr-1 custom-scrollbar text-xs">
            {onboarders.length === 0 ? (
              <p className="text-slate-500 italic py-2">No new joiners pending seating assignments.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-200 dark:border-ethara-border/20">
                    <th className="py-2">Employee ID</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Department</th>
                    <th className="py-2">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-ethara-border/10 text-slate-700 dark:text-slate-300">
                  {onboarders.map(emp => (
                    <tr key={emp.id}>
                      <td className="py-2 font-semibold text-slate-800 dark:text-slate-200">{emp.employee_id}</td>
                      <td className="py-2">{emp.first_name} {emp.last_name}</td>
                      <td className="py-2">{emp.department}</td>
                      <td className="py-2 text-slate-500">{emp.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
