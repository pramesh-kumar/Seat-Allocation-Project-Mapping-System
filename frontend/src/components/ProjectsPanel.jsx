import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Briefcase, Plus, UserPlus, FolderOpen, Calendar, User, Search, X, Users, Trash2, ArrowRight } from 'lucide-react';

export default function ProjectsPanel({ activeRole }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmps, setFilteredEmps] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Selected Project Details Modal
  const [selectedProj, setSelectedProj] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Form states
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjDept, setNewProjDept] = useState('');
  const [newProjManager, setNewProjManager] = useState('');
  const [creating, setCreating] = useState(false);

  const [assignProjId, setAssignProjId] = useState('');
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects({ limit: 100 });
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSearch = async (val) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setFilteredEmps([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.getEmployees({ search: val, limit: 20 });
      setFilteredEmps(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjName || !newProjCode || !newProjDept) return;
    setCreating(true);
    try {
      await api.createProject({
        name: newProjName,
        project_code: newProjCode,
        department: newProjDept,
        manager_name: newProjManager || undefined,
        start_date: new Date().toISOString().split('T')[0]
      });
      setNewProjName('');
      setNewProjCode('');
      setNewProjDept('');
      setNewProjManager('');
      await fetchProjects();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignEmployee = async (e) => {
    e.preventDefault();
    if (!assignProjId || !assignEmpId) return;
    setAssigning(true);
    try {
      const res = await api.assignEmployeeToProject(assignProjId, assignEmpId, true);
      alert(res.message || 'Successfully mapped employee to project!');
      setAssignProjId('');
      setAssignEmpId('');
      setSearchQuery('');
      setFilteredEmps([]);
      // Refresh current modal roster if project matches
      if (selectedProj && selectedProj.id === Number(assignProjId)) {
        fetchProjectMembers(selectedProj.id);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleProjectClick = async (proj) => {
    setSelectedProj(proj);
    fetchProjectMembers(proj.id);
  };

  const fetchProjectMembers = async (projId) => {
    setMembersLoading(true);
    try {
      const res = await api.getEmployees({ project_id: projId, limit: 100 });
      setProjectMembers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = async (empId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from this project?`)) return;
    try {
      await api.removeEmployeeFromProject(selectedProj.id, empId);
      // Refresh list
      fetchProjectMembers(selectedProj.id);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const isAllowed = activeRole === 'Project Lead' || activeRole === 'Admin';

  return (
    <div className="space-y-6">
      
      {/* Forms Section (for Project Lead and Admin) */}
      {isAllowed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Project Form */}
          <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-ethara-border/30 pb-2">
              <Plus className="w-4 h-4 text-ethara-primary" />
              Launch New Project
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Project Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PRJ-TITAN"
                    value={newProjCode}
                    onChange={(e) => setNewProjCode(e.target.value.toUpperCase())}
                    className="w-full bg-ethara-input border border-ethara-border rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Project Titan"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full bg-ethara-input border border-ethara-border rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Department</label>
                  <select
                    value={newProjDept}
                    onChange={(e) => setNewProjDept(e.target.value)}
                    className="w-full bg-ethara-input border border-ethara-border rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Project Manager</label>
                  <input
                    type="text"
                    placeholder="Manager Full Name"
                    value={newProjManager}
                    onChange={(e) => setNewProjManager(e.target.value)}
                    className="w-full bg-ethara-input border border-ethara-border rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-ethara-primary hover:bg-blue-500 text-white font-semibold py-2 rounded-lg cursor-pointer"
              >
                Create Project
              </button>
            </form>
          </div>

          {/* Map Employee Form */}
          <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-ethara-border/30 pb-2">
              <UserPlus className="w-4 h-4 text-ethara-secondary" />
              Assign Employee to Project
            </h3>
            <form onSubmit={handleAssignEmployee} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Select Project</label>
                <select
                  value={assignProjId}
                  onChange={(e) => setAssignProjId(e.target.value)}
                  className="w-full bg-ethara-input border border-ethara-border rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.project_code})</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <label className="block text-slate-500 mb-1">Select Employee</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type name or ID (e.g. Ronald)"
                    value={searchQuery}
                    onChange={(e) => handleEmployeeSearch(e.target.value)}
                    className="w-full bg-ethara-input border border-ethara-border rounded-lg pl-8 pr-8 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
                    required={!assignEmpId}
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => { setSearchQuery(''); setAssignEmpId(''); setFilteredEmps([]); }} 
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete dropdown overlay */}
                {filteredEmps.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-ethara-border rounded-lg shadow-lg text-xs">
                    {filteredEmps.map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setAssignEmpId(emp.id);
                          setSearchQuery(`${emp.first_name} ${emp.last_name} (${emp.employee_id})`);
                          setFilteredEmps([]);
                        }}
                        className="w-full text-left px-3 py-2 border-b border-ethara-border/30 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                      >
                        {emp.first_name} {emp.last_name} ({emp.employee_id} - {emp.department})
                      </button>
                    ))}
                  </div>
                )}
                {searching && (
                  <div className="text-[10px] text-slate-450 mt-1">Searching database...</div>
                )}
                {assignEmpId && (
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    ✓ Selected Employee ID: {assignEmpId}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={assigning || !assignEmpId || !assignProjId}
                className="w-full bg-ethara-secondary hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg cursor-pointer disabled:opacity-40"
              >
                Save Project Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Projects List Grid */}
      <div className="glass p-5 rounded-xl border border-ethara-border/50 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-ethara-border/30">
          <FolderOpen className="w-4 h-4 text-ethara-accent" />
          Active Project Portfolio ({projects.length})
        </h3>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethara-primary mx-auto"></div>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-4">No active projects found. Seed database.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div 
                key={proj.id} 
                onClick={() => handleProjectClick(proj)}
                className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-ethara-border/40 hover:border-slate-400 dark:hover:border-slate-500 hover:scale-[1.01] rounded-xl space-y-3 text-xs transition-all cursor-pointer shadow-sm hover:shadow-md"
                title="Click to view assigned team roster"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{proj.name}</h4>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{proj.project_code}</span>
                  </div>
                  <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
                    {proj.department}
                  </span>
                </div>
                
                <div className="space-y-1 text-slate-550 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manager: <span className="font-medium text-slate-700 dark:text-slate-300">{proj.manager_name || 'N/A'}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Started: <span className="font-medium text-slate-700 dark:text-slate-300">{proj.start_date}</span></span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 dark:border-ethara-border/20 pt-2.5 mt-2.5 text-[10px] text-ethara-primary font-semibold">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    View Team Members
                  </span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Team Roster Modal Overlay */}
      {selectedProj && (
        <div className="fixed inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-premium p-6 rounded-xl border border-ethara-border/50 max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-ethara-border/50 pb-3">
              <div>
                <span className="text-[10px] bg-blue-550/10 border border-blue-500/20 text-ethara-primary font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                  Project Workspace
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {selectedProj.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedProj.project_code} • Manager: {selectedProj.manager_name || 'N/A'} • Started: {selectedProj.start_date}
                </p>
              </div>
              <button
                onClick={() => { setSelectedProj(null); setProjectMembers([]); }}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Members List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                Assigned Team Roster ({projectMembers.length} Employees)
              </h4>

              {membersLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethara-primary mx-auto"></div>
                </div>
              ) : projectMembers.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-8">No employees currently assigned to this project.</p>
              ) : (
                <div className="overflow-x-auto border border-ethara-border/40 rounded-lg max-h-[300px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-150 dark:bg-slate-900 border-b border-slate-200 dark:border-ethara-border text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wide">
                        <th className="px-4 py-2">ID</th>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2">Role</th>
                        <th className="px-4 py-2 text-center">Seat</th>
                        {isAllowed && (
                          <th className="px-4 py-2 text-center">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-ethara-border/20 text-slate-700 dark:text-slate-300">
                      {projectMembers.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{emp.employee_id}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{emp.first_name} {emp.last_name}</td>
                          <td className="px-4 py-2.5">{emp.department}</td>
                          <td className="px-4 py-2.5 text-slate-500">{emp.role}</td>
                          <td className="px-4 py-2.5 text-center">
                            {emp.seat_code ? (
                              <span className="font-mono text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-450 px-2 py-0.5 rounded">
                                {emp.seat_code}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">None</span>
                            )}
                          </td>
                          {isAllowed && (
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => handleRemoveMember(emp.id, `${emp.first_name} ${emp.last_name}`)}
                                className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-450 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                                title="Remove from Project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer / Quick Add Section */}
            {isAllowed && (
              <div className="border-t border-slate-200 dark:border-ethara-border/50 pt-4 mt-2">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Quick Add Member to this Project
                </h5>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (assignEmpId) {
                      setAssignProjId(selectedProj.id.toString());
                      handleAssignEmployee(e);
                    }
                  }}
                  className="flex gap-3 text-xs"
                >
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Type name or ID to search..."
                      value={searchQuery}
                      onChange={(e) => handleEmployeeSearch(e.target.value)}
                      className="w-full bg-ethara-input border border-ethara-border rounded-lg pl-8 pr-8 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    {searchQuery && (
                      <button 
                        type="button" 
                        onClick={() => { setSearchQuery(''); setAssignEmpId(''); setFilteredEmps([]); }} 
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Autocomplete dropdown overlay */}
                    {filteredEmps.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 max-h-32 overflow-y-auto bg-white dark:bg-slate-900 border border-ethara-border rounded-lg shadow-lg text-xs">
                        {filteredEmps.map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setAssignEmpId(emp.id);
                              setSearchQuery(`${emp.first_name} ${emp.last_name} (${emp.employee_id})`);
                              setFilteredEmps([]);
                            }}
                            className="w-full text-left px-3 py-1.5 border-b border-ethara-border/30 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                          >
                            {emp.first_name} {emp.last_name} ({emp.employee_id})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!assignEmpId || assigning}
                    className="bg-ethara-primary hover:bg-blue-500 disabled:opacity-40 text-white font-semibold px-4 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Add Member
                  </button>
                </form>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-ethara-border/40">
              <button
                onClick={() => { setSelectedProj(null); setProjectMembers([]); }}
                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-200 text-xs font-semibold py-1.5 px-4 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
