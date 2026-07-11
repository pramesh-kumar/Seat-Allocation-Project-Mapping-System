import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically add simulated User Role header
client.interceptors.request.use((config) => {
  const role = localStorage.getItem('user_role') || 'Employee';
  config.headers['X-User-Role'] = role;
  return config;
});

export const api = {
  // Employees
  getEmployees: (params) => client.get('/employees', { params }).then(res => res.data),
  getEmployee: (id) => client.get(`/employees/${id}`).then(res => res.data),
  createEmployee: (data) => client.post('/employees', data).then(res => res.data),
  updateEmployee: (id, data) => client.put(`/employees/${id}`, data).then(res => res.data),
  deleteEmployee: (id) => client.delete(`/employees/${id}`).then(res => res.data),

  // Projects
  getProjects: (params) => client.get('/projects', { params }).then(res => res.data),
  getProject: (id) => client.get(`/projects/${id}`).then(res => res.data),
  createProject: (data) => client.post('/projects', data).then(res => res.data),
  updateProject: (id, data) => client.put(`/projects/${id}`, data).then(res => res.data),
  assignEmployeeToProject: (projectId, employeeId, isPrimary = true) => 
    client.post(`/projects/${projectId}/assign`, null, { params: { employee_id: employeeId, is_primary: isPrimary } }).then(res => res.data),
  removeEmployeeFromProject: (projectId, employeeId) => 
    client.post(`/projects/${projectId}/remove`, null, { params: { employee_id: employeeId } }).then(res => res.data),

  // Seats
  getSeats: (params) => client.get('/seats', { params }).then(res => res.data),
  getSeat: (id) => client.get(`/seats/${id}`).then(res => res.data),
  allocateSeat: (employeeId, seatId) => client.post('/seats/allocate', { employee_id: employeeId, seat_id: seatId }).then(res => res.data),
  releaseSeat: (seatId) => client.post('/seats/release', null, { params: { seat_id: seatId } }).then(res => res.data),
  getSeatRecommendations: (employeeId, limit = 5) => client.get(`/seats/recommend/${employeeId}`, { params: { limit } }).then(res => res.data),
  changeSeatStatus: (seatId, status) => client.put(`/seats/${seatId}/status`, { status }).then(res => res.data),

  // Analytics
  getAnalytics: () => client.get('/analytics').then(res => res.data),

  // AI Assistant
  queryAI: (query) => client.post('/ai/query', { query }).then(res => res.data),

  // Admin Seeding
  triggerSeeding: () => client.post('/seed').then(res => res.data),
};
