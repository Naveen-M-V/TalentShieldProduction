import axios from 'axios';

const API_BASE_URL = '/api/performance';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isFileUpload = error.config?.url?.includes('/documents') ||
                error.config?.headers?.['Content-Type']?.includes('multipart');

            if (!isFileUpload && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_session');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ==================== GOALS API ====================

export const goalsApi = {
    // Get all goals (manager view)
    getAllGoals: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.approvalStatus && filters.approvalStatus !== 'all') params.append('approvalStatus', filters.approvalStatus);
        if (filters.employee) params.append('employee', filters.employee);
        if (filters.search) params.append('search', filters.search);

        const url = `/goals?${params.toString()}`;
        const response = await api.get(url);
        return response.data;
    },

    // Get my own goals (employee view)
    getMyGoals: async () => {
        const response = await api.get('/goals/my');
        return response.data;
    },

    // Get goals for a specific employee (manager view)
    getEmployeeGoals: async (employeeId) => {
        const response = await api.get(`/goals/employee/${employeeId}`);
        return response.data;
    },

    // Get pending approval goals (manager view)
    getPendingApprovals: async () => {
        const response = await api.get('/goals/pending-approvals');
        return response.data;
    },

    getSummaryAll: async () => {
        const response = await api.get('/goals/summary/all');
        return response.data;
    },

    // Get goal by ID
    getGoalById: async (id) => {
        const response = await api.get(`/goals/${id}`);
        return response.data;
    },

    // Create new goal
    createGoal: async (goalData) => {
        const response = await api.post('/goals', goalData);
        return response.data;
    },

    // Update goal
    updateGoal: async (id, updates) => {
        const response = await api.put(`/goals/${id}`, updates);
        return response.data;
    },

    // Delete goal
    deleteGoal: async (id) => {
        const response = await api.delete(`/goals/${id}`);
        return response.data;
    },

    approveGoal: async (id) => {
        const response = await api.post(`/goals/${id}/approve`);
        return response.data;
    },

    // Approve an employee-submitted objective
    approveObjective: async (id) => {
        const response = await api.post(`/goals/${id}/approve-objective`);
        return response.data;
    },

    // Send back an objective with a reason
    sendBackObjective: async (id, reason) => {
        const response = await api.post(`/goals/${id}/send-back`, { reason });
        return response.data;
    },

    // Employee submits their contribution input for an approved objective
    submitInput: async (id, payload) => {
        const response = await api.post(`/goals/${id}/input`, payload);
        return response.data;
    },

    addComment: async (id, comment) => {
        const response = await api.post(`/goals/${id}/comment`, { comment });
        return response.data;
    },
};

// ==================== NOTES API ====================
export const notesApi = {
    createNote: async (noteData) => {
        const response = await api.post('/notes', noteData);
        return response.data;
    },
    getNotesForEmployee: async (employeeId) => {
        const response = await api.get(`/notes/${employeeId}`);
        return response.data;
    },
    deleteNote: async (id) => {
        const response = await api.delete(`/notes/${id}`);
        return response.data;
    }
};

// ==================== DISCIPLINARY API ====================
export const disciplinaryApi = {
    createRecord: async (data) => {
        const response = await api.post('/disciplinary', data);
        return response.data;
    },
    getForEmployee: async (employeeId) => {
        const response = await api.get(`/disciplinary/${employeeId}`);
        return response.data;
    }
};

// ==================== IMPROVEMENT PLANS API ====================
export const pipsApi = {
    createPlan: async (data) => {
        const response = await api.post('/pips', data);
        return response.data;
    },
    getForEmployee: async (employeeId) => {
        const response = await api.get(`/pips/${employeeId}`);
        return response.data;
    }
};

export default { goalsApi, notesApi, disciplinaryApi, pipsApi };
