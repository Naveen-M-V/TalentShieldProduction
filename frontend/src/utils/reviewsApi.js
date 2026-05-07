import axios from 'axios';
import { buildApiUrl } from './apiConfig';

// Create axios instance for reviews API
const api = axios.create({
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
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

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_session');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ==================== REVIEWS API ====================

export const reviewsApi = {
    // Get all reviews
    getAllReviews: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.employeeId) params.append('employeeId', filters.employeeId);
        if (filters.reviewType && filters.reviewType !== 'all') params.append('reviewType', filters.reviewType);

        const url = buildApiUrl(`/reviews?${params.toString()}`);
        const response = await api.get(url);
        return response.data;
    },

    // Get my reviews
    getMyReviews: async () => {
        try {
            const url = buildApiUrl('/reviews/my');
            const response = await api.get(url);
            return response.data;
        } catch (err) {
            // If endpoint is not available (404) or other client error, return empty array
            if (err.response && err.response.status === 404) {
                console.warn('reviewsApi.getMyReviews: endpoint not found (404), returning empty array');
                return [];
            }
            throw err;
        }
    },

    // Get review by ID
    getReviewById: async (id) => {
        const url = buildApiUrl(`/reviews/${id}`);
        const response = await api.get(url);
        return response.data;
    },

    createReview: async (payload) => {
        const url = buildApiUrl('/reviews');
        const response = await api.post(url, payload);
        return response.data;
    },

    // Update review
    updateReview: async (id, updates) => {
        const url = buildApiUrl(`/reviews/${id}`);
        const response = await api.put(url, updates);
        return response.data;
    },

    submitReview: async (id) => {
        const url = buildApiUrl(`/reviews/${id}/submit`);
        const response = await api.post(url, {});
        return response.data;
    },

    // Publish review: DRAFT → RATING_PUBLISHED (employee can see rating)
    publishReview: async (id) => {
        const url = buildApiUrl(`/reviews/${id}/publish`);
        const response = await api.post(url, {});
        return response.data;
    },

    closeReview: async (id) => {
        const url = buildApiUrl(`/reviews/${id}/close`);
        const response = await api.post(url, {});
        return response.data;
    },

    addEmployeeComment: async (id, comment) => {
        const url = buildApiUrl(`/reviews/${id}/comment`);
        const response = await api.post(url, { comment });
        return response.data;
    },

    // Delete review
    deleteReview: async (id) => {
        const url = buildApiUrl(`/reviews/${id}`);
        const response = await api.delete(url);
        return response.data;
    },
};

export default reviewsApi;
