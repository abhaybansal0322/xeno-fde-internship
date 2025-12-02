import axios from 'axios';

let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Ensure protocol is present (Render provides host without protocol)
if (!API_URL.startsWith('http')) {
    API_URL = `https://${API_URL}`;
}

const api = axios.create({
    baseURL: API_URL,
});

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

export default api;
