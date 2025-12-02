import axios from 'axios';

let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Ensure protocol is present (Render provides host without protocol)
if (!API_URL.startsWith('http')) {
    API_URL = `https://${API_URL}`;
}

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor for debugging
api.interceptors.request.use(
    (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for debugging
api.interceptors.response.use(
    (response) => {
        console.log(`[API] Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        if (error.code === 'ECONNREFUSED') {
            console.error('[API] Connection refused - Is the backend server running?');
        } else if (error.code === 'ERR_NETWORK') {
            console.error('[API] Network error - Check your connection and backend URL');
        } else if (error.response) {
            console.error(`[API] Error ${error.response.status}:`, error.response.data);
        } else {
            console.error('[API] Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export const getMetrics = async (tenantId) => {
    try {
        const response = await api.get(`/api/metrics?tenantId=${tenantId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching metrics:', error);
        throw error;
    }
};

export const getOrdersTimeSeries = async (tenantId, range) => {
    try {
        let start = new Date();
        const end = new Date();

        if (range === '7d') {
            start.setDate(start.getDate() - 7);
        } else if (range === '30d') {
            start.setDate(start.getDate() - 30);
        } else {
            // All time - set start to null or very old date
            start = null;
        }

        const startParam = start ? `&start=${start.toISOString()}` : '';
        const endParam = `&end=${end.toISOString()}`;

        const response = await api.get(`/api/metrics?tenantId=${tenantId}${startParam}${endParam}`);
        return response.data.ordersByDate;
    } catch (error) {
        console.error('Error fetching orders time series:', error);
        throw error;
    }
};

export const getTopCustomers = async (tenantId) => {
    try {
        const response = await api.get(`/api/metrics?tenantId=${tenantId}`);
        return response.data.topCustomers;
    } catch (error) {
        console.error('Error fetching top customers:', error);
        throw error;
    }
};

export const getTenants = async () => {
    try {
        const response = await api.get('/api/tenants');
        return response.data;
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return [];
    }
};

// Authentication functions
export const registerUser = async (email, password, name) => {
    try {
        const response = await api.post('/api/auth/register', {
            email,
            password,
            name,
        });
        return response.data;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
};

export const loginUser = async (email, password) => {
    try {
        const response = await api.post('/api/auth/login', {
            email,
            password,
        });
        return response.data;
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
};

export default api;
