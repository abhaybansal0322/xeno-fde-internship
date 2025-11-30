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

export const getOrdersTimeSeries = async (tenantId, dateRange) => {
    try {
        const response = await api.get(`/api/metrics/orders?tenantId=${tenantId}&range=${dateRange}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching orders time series:', error);
        throw error;
    }
};

export const getTopCustomers = async (tenantId) => {
    try {
        const response = await api.get(`/api/metrics/top-customers?tenantId=${tenantId}`);
        return response.data;
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
