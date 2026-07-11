import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Filter, Edit, Trash2, ArrowLeft, ArrowRight, X } from 'lucide-react';

export default function SeatingTable({ activeRole }) {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projects, setProjects] = useState([]);
  const [projFilter, setProjFilter] = useState('');
  
  // Edit Employee State
  const [editingEmp, setEditingEmp] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, [skip, search, deptFilter, statusFilter, projFilter]);

  useEffect(() => {
    api.getProjects({ limit: 100 })
      .then(res => setProjects(res || []))
      .catch(err => console.error(err));
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployees({
        skip,
        limit,
        search: search || undefined,
        department: deptFilter || undefined,
        status: statusFilter || undefined,
        project_id: projFilter ? Number(projFilter) : undefined
      });
      setEmployees(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newSkip) => {
    if (newSkip >= 0 && newSkip < total) {
      setSkip(newSkip);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete employee ${name}?`)) return;
    try {
      await api.deleteEmployee(id);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete employee');
    }
  };

  const handleEditClick = (emp) => {
    setEditingEmp(emp);
    setEditStatus(emp.status);
    setEditRole(emp.role);
  };

  const handleSaveEdit = async () => {
    if (!editingEmp) return;
    try {
      await api.updateEmployee(editingEmp.id, {
        status: editStatus,
        role: editRole
      });
      setEditingEmp(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update employee details');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Bar */}
      <div className="glass p-4 rounded-xl border border-ethara-border/40 flex flex-wrap items-center gap-4">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
            className="w-full bg-ethara-input border border-ethara-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ethara-primary"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
        </div>

        {/* Dept Filter */}
        <div>
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setSkip(0); }}
            className="bg-ethara-input border border-ethara-border rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ethara-primary"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Marketing">Marketing</option>
            <option value="Finance">Finance</option>
            <option value="Operations">Operations</option>
            <option value="HR">HR</option>
            <option value="Sales">Sales</option>
            <option value="Support">Support</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setSkip(0); }}
            className="bg-ethara-input border border-ethara-border rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ethara-primary"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ONBOARDING">Onboarding</option>
            <option value="EXITED">Exited</option>
          </select>
        </div>

        {/* Project Filter */}
        <div>
          <select
            value={projFilter}
            onChange={(e) => { setProjFilter(e.target.value); setSkip(0); }}
            className="bg-ethara-input border border-ethara-border rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ethara-primary max-w-[200px]"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Main Table */}
      <div className="glass rounded-xl border border-ethara-border/50 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-ethara-border text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">ID Code</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Seat</th>
                <th className="px-5 py-3.5">Primary Project</th>
                <th className="px-5 py-3.5">Status</th>
                {(activeRole === 'HR' || activeRole === 'Admin') && (
                  <th className="px-5 py-3.5 text-center">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-ethara-border/40 text-slate-750 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ethara-primary mx-auto"></div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-500 italic">No employees match the filter criteria.</td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const primaryProj = emp.projects.find(p => p.is_primary)?.project_name || 'N/A';
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{emp.employee_id}</td>
                      <td className="px-5 py-3">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{emp.first_name} {emp.last_name}</div>
                          <div className="text-[10px] text-slate-500">{emp.email}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{emp.department}</td>
                      <td className="px-5 py-3 text-slate-550 dark:text-slate-400">{emp.role}</td>
                      <td className="px-5 py-3">
                        {emp.seat_code ? (
                          <span className="font-mono bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">
                            {emp.seat_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">Unallocated</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{primaryProj}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider ${
                          emp.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30' :
                          emp.status === 'ONBOARDING' ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900/30' :
                          'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-250 dark:border-rose-900/30'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      {(activeRole === 'HR' || activeRole === 'Admin') && (
                        <td className="px-5 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(emp)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                              title="Edit Employee Status"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {activeRole === 'Admin' && (
                              <button
                                onClick={() => handleDelete(emp.id, `${emp.first_name} ${emp.last_name}`)}
                                className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete Employee"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-100 dark:bg-slate-900/40 px-5 py-3.5 border-t border-slate-200 dark:border-ethara-border flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(skip + 1, total)}</span> to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(skip + limit, total)}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> employees
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(skip - limit)}
              disabled={skip === 0 || loading}
              className="p-1.5 bg-slate-200 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(skip + limit)}
              disabled={skip + limit >= total || loading}
              className="p-1.5 bg-slate-200 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal (Glass Overlay) */}
      {editingEmp && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-premium p-6 rounded-xl border border-ethara-border/50 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-ethara-border pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Edit Employee Details</h3>
              <button 
                onClick={() => setEditingEmp(null)} 
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Employee Name</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{editingEmp.first_name} {editingEmp.last_name}</div>
                <div className="text-xs text-slate-500">{editingEmp.employee_id}</div>
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-ethara-input border border-ethara-border rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-ethara-primary"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="EXITED">Exited</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Designation / Role</label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-ethara-input border border-ethara-border rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-ethara-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-ethara-border/40">
              <button
                onClick={() => setEditingEmp(null)}
                className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-200 text-xs font-semibold py-2 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-ethara-primary hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
