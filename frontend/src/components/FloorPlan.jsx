import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { User, ShieldAlert, CheckCircle, Lock, Users, ArrowRight, UserPlus, X, Search } from 'lucide-react';

export default function FloorPlan({ activeRole, externalFloor, externalZone, externalSeatCode, clearExternal }) {
  const [floor, setFloor] = useState(externalFloor || 1);
  const [zone, setZone] = useState((externalZone || 'A').toUpperCase());
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [allocationLoading, setAllocationLoading] = useState(false);

  // Sync with external navigation parameters (AI Assistant / Onboarding)
  useEffect(() => {
    if (externalFloor) {
      setFloor(externalFloor);
    }
    if (externalZone) {
      setZone(externalZone.toUpperCase());
    }
  }, [externalFloor, externalZone]);

  useEffect(() => {
    if (externalSeatCode && seats.length > 0) {
      const matched = seats.find(s => s.seat_code === externalSeatCode);
      if (matched) {
        setSelectedSeat(matched);
        if (clearExternal) clearExternal();
      }
    }
  }, [externalSeatCode, seats]);

  // Load seats for current floor & zone (with request cancellation guard)
  useEffect(() => {
    let active = true;
    
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getSeats({ floor, zone });
        if (active) {
          setSeats(data);
          if (selectedSeat) {
            const updated = data.find(s => s.id === selectedSeat.id);
            if (updated) setSelectedSeat(updated);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [floor, zone]);

  // Load onboarding employees if role is HR or Admin to assign seats
  useEffect(() => {
    if (activeRole === 'HR' || activeRole === 'Admin') {
      api.getEmployees({ status: 'ONBOARDING', limit: 100 })
        .then(res => setEmployees(res.data || []))
        .catch(err => console.error(err));
    }
  }, [activeRole]);

  const fetchSeats = async () => {
    setLoading(true);
    try {
      const data = await api.getSeats({ floor, zone });
      setSeats(data);
      // Update selected seat details if it's currently open
      if (selectedSeat) {
        const updated = data.find(s => s.id === selectedSeat.id);
        if (updated) setSelectedSeat(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat) => {
    setSelectedSeat(seat);
  };

  const handleAllocate = async (employeeId) => {
    if (!selectedSeat) return;
    setAllocationLoading(true);
    try {
      await api.allocateSeat(employeeId, selectedSeat.id);
      await fetchSeats();
      // Refresh onboarding employees
      const res = await api.getEmployees({ status: 'ONBOARDING', limit: 100 });
      setEmployees(res.data || []);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to allocate seat');
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedSeat) return;
    if (!window.confirm(`Are you sure you want to release seat ${selectedSeat.seat_code}?`)) return;
    setAllocationLoading(true);
    try {
      await api.releaseSeat(selectedSeat.id);
      await fetchSeats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to release seat');
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedSeat) return;
    setAllocationLoading(true);
    try {
      await api.changeSeatStatus(selectedSeat.id, newStatus);
      await fetchSeats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update seat status');
    } finally {
      setAllocationLoading(false);
    }
  };

  // Group seats into a grid layout (e.g. 10 rows of 25 desks)
  const rows = 11;
  const cols = 25;

  const renderSeatGrid = () => {
    if (loading && seats.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ethara-primary"></div>
        </div>
      );
    }

    const grid = [];
    for (let r = 0; r < rows; r++) {
      const rowSeats = [];
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        const seat = seats[index];

        // Add visual spacing gaps as walking aisles
        const isAisle = c === 6 || c === 12 || c === 18;

        if (isAisle) {
          rowSeats.push(
            <div key={`aisle-${r}-${c}`} className="w-8 h-8 flex-shrink-0" />
          );
        }

        if (seat) {
          let bgClass = 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700';
          let borderClass = '';

          if (seat.status === 'OCCUPIED') {
            bgClass = 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 shadow-md shadow-blue-500/20';
          } else if (seat.status === 'RESERVED') {
            bgClass = 'bg-amber-500 dark:bg-amber-600/80 hover:bg-amber-400 dark:hover:bg-amber-500 text-amber-950 dark:text-amber-100 border border-amber-400/50 dark:border-amber-500/50';
          } else if (seat.status === 'MAINTENANCE') {
            bgClass = 'bg-rose-200 dark:bg-rose-950/60 hover:bg-rose-300 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/50 cursor-not-allowed';
          } else if (seat.status === 'AVAILABLE') {
            bgClass = 'bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40';
          }

          if (selectedSeat && selectedSeat.id === seat.id) {
            borderClass = 'ring-2 ring-blue-600 dark:ring-white ring-offset-2 ring-offset-ethara-dark scale-110 z-10';
          }

          rowSeats.push(
            <button
              key={seat.id}
              onClick={() => handleSeatClick(seat)}
              title={`${seat.seat_code} - ${seat.status}`}
              className={`w-8 h-8 rounded text-[10px] font-semibold flex items-center justify-center transition-all cursor-pointer ${bgClass} ${borderClass}`}
            >
              {seat.number}
            </button>
          );
        }
      }
      grid.push(
        <div key={`row-${r}`} className="flex gap-2 justify-start min-w-[900px] mb-2">
          {rowSeats}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="min-w-[950px] p-4 glass rounded-xl border border-ethara-border/50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4 items-center">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Floor Layout Bay view:</span>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/40 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400">Available</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400">Occupied</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500 dark:bg-amber-600 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400">Reserved</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-rose-200 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/50 inline-block"></span>
                  <span className="text-slate-600 dark:text-slate-400">Maintenance</span>
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total: 250 seats in Zone {zone}</div>
          </div>
          {grid}
        </div>
      </div>
    );
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Selection Navbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass p-4 rounded-xl border border-ethara-border/40">
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Select Floor</label>
            <select 
              value={floor} 
              onChange={(e) => setFloor(Number(e.target.value))}
              className="bg-ethara-input border border-ethara-border rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ethara-primary"
            >
              {[1, 2, 3, 4, 5].map(f => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Select Zone</label>
            <div className="flex bg-ethara-input p-1 rounded-lg border border-ethara-border">
              {['A', 'B', 'C', 'D'].map(z => (
                <button
                  key={z}
                  onClick={() => setZone(z)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    zone === z 
                      ? 'bg-ethara-primary text-white shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Zone {z}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ethara Office HQ</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Floor {floor} • Zone {zone} Layout Map</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Seating Grid Map */}
        <div className="lg:col-span-3 space-y-4">
          {renderSeatGrid()}
        </div>

        {/* Action Panel Side Panel */}
        <div className="space-y-4">
          <div className="glass-premium p-5 rounded-xl border border-ethara-border/50 h-full flex flex-col justify-between min-h-[400px]">
            {selectedSeat ? (
              <div className="space-y-5 flex-1">
                <div className="flex justify-between items-start border-b border-ethara-border/50 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">{selectedSeat.seat_code}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Floor {selectedSeat.floor} • Zone {selectedSeat.zone} • Seat {selectedSeat.number}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    selectedSeat.status === 'AVAILABLE' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-800/30' :
                    selectedSeat.status === 'OCCUPIED' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400 border border-blue-250 dark:border-blue-800/30' :
                    selectedSeat.status === 'RESERVED' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border border-amber-250 dark:border-amber-800/30' :
                    'bg-rose-105 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-250 dark:border-rose-800/30'
                  }`}>
                    {selectedSeat.status}
                  </span>
                </div>

                {/* Seat Content */}
                {selectedSeat.status === 'OCCUPIED' && selectedSeat.occupant ? (
                  <div className="space-y-4">
                    <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-lg border border-ethara-border/40">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Occupant</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-ethara-primary" />
                        {selectedSeat.occupant.full_name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 ml-5">{selectedSeat.occupant.employee_id}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded border border-ethara-border/30">
                        <div className="text-slate-500 dark:text-slate-400 mb-0.5">Department</div>
                        <div className="font-medium text-slate-700 dark:text-slate-300">{selectedSeat.occupant.department}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded border border-ethara-border/30">
                        <div className="text-slate-500 dark:text-slate-400 mb-0.5">Role</div>
                        <div className="font-medium text-slate-700 dark:text-slate-300">{selectedSeat.occupant.role}</div>
                      </div>
                    </div>
                    {(activeRole === 'HR' || activeRole === 'Admin') && (
                      <button
                        onClick={handleRelease}
                        disabled={allocationLoading}
                        className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-semibold text-sm py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Release Seat
                      </button>
                    )}
                  </div>
                ) : selectedSeat.status === 'AVAILABLE' ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="text-sm text-slate-600 dark:text-slate-400">This seat is currently vacant and available for assignment.</div>
                    
                    {/* HR or Admin Allocation Flow */}
                    {activeRole === 'HR' || activeRole === 'Admin' ? (
                      <div className="space-y-3 flex-1 flex flex-col justify-end">
                        <div className="border-t border-ethara-border/30 pt-3">
                          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Assign to New Joiner (Onboarding)</label>
                          <div className="relative mb-2">
                            <input
                              type="text"
                              placeholder="Search onboarding staff..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full bg-ethara-input border border-ethara-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ethara-primary"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                          </div>
                          <div className="max-h-[160px] overflow-y-auto border border-ethara-border/40 rounded-lg bg-ethara-input/50">
                            {filteredEmployees.length === 0 ? (
                              <div className="text-[11px] text-slate-500 p-3 text-center">No onboarding employees found</div>
                            ) : (
                              filteredEmployees.map(emp => (
                                <button
                                  key={emp.id}
                                  onClick={() => handleAllocate(emp.id)}
                                  disabled={allocationLoading}
                                  className="w-full text-left px-3 py-2 border-b border-ethara-border/30 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors flex items-center justify-between text-xs cursor-pointer"
                                >
                                  <div>
                                    <div className="font-medium text-slate-700 dark:text-slate-300">{emp.first_name} {emp.last_name}</div>
                                    <div className="text-[10px] text-slate-500">{emp.employee_id} • {emp.department}</div>
                                  </div>
                                  <UserPlus className="w-3.5 h-3.5 text-ethara-secondary" />
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic mt-auto">Regular employees cannot allocate or book seats. Please contact HR or Admin.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-650 dark:text-slate-400">
                      {selectedSeat.status === 'RESERVED' 
                        ? 'This seat is reserved for an upcoming joiner or project cluster expansion.' 
                        : 'This seat is currently offline for maintenance or repairs.'}
                    </p>
                    {activeRole === 'Admin' && (
                      <button
                        onClick={() => handleStatusChange('AVAILABLE')}
                        disabled={allocationLoading}
                        className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 text-white font-semibold text-sm py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        Set to Available
                      </button>
                    )}
                  </div>
                )}

                {/* Administrative seat status override */}
                {activeRole === 'Admin' && (
                  <div className="border-t border-ethara-border/40 pt-4 mt-4">
                    <label className="block text-xs text-slate-550 dark:text-slate-400 mb-2">Override Seat Status (Admin)</label>
                    <div className="flex gap-2">
                      {selectedSeat.status !== 'MAINTENANCE' && (
                        <button
                          onClick={() => handleStatusChange('MAINTENANCE')}
                          disabled={allocationLoading}
                          className="flex-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800/40 text-xs font-semibold py-1.5 rounded transition-all cursor-pointer"
                        >
                          Maintenance
                        </button>
                      )}
                      {selectedSeat.status !== 'RESERVED' && (
                        <button
                          onClick={() => handleStatusChange('RESERVED')}
                          disabled={allocationLoading}
                          className="flex-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40 text-xs font-semibold py-1.5 rounded transition-all cursor-pointer"
                        >
                          Reserve
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center flex-1 py-10">
                <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3 animate-pulse-soft" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select a seat</h4>
                <p className="text-xs text-slate-500 max-w-[200px] mt-1">Click on any seat number on the map grid to view its occupancy details or allocate it.</p>
              </div>
            )}
            
            <div className="border-t border-ethara-border/20 pt-4 text-[10px] text-slate-500 flex justify-between">
              <span>Selected Role: <span className="font-bold text-ethara-primary">{activeRole}</span></span>
              <span>Ethara HQ Seating v1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
