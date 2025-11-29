import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
    baseURL: API_URL,
});

// Mock data for development when backend is not available
const MOCK_DATA = {
    metrics: {
        totalCustomers: 1250,
        totalOrders: 450,
        totalRevenue: 15750.50
    },
    ordersTimeSeries: [
        { date: '2023-11-01', count: 12 },
        { date: '2023-11-02', count: 19 },
        { date: '2023-11-03', count: 15 },
        { date: '2023-11-04', count: 25 },
        { date: '2023-11-05', count: 22 },
        { date: '2023-11-06', count: 30 },
        { date: '2023-11-07', count: 28 },
    ],
    topCustomers: [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', totalOrders: 15, totalSpent: 1200.50 },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', totalOrders: 12, totalSpent: 950.00 },
        { id: 3, firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', totalOrders: 10, totalSpent: 800.25 },
        { id: 4, firstName: 'Alice', lastName: 'Brown', email: 'alice@example.com', totalOrders: 8, totalSpent: 650.75 },
        { id: 5, firstName: 'Charlie', lastName: 'Wilson', email: 'charlie@example.com', totalOrders: 6, totalSpent: 450.00 },
    ]
};

export const getMetrics = async (tenantId) => {
    try {
        // Uncomment to use real backend
        // const response = await api.get(`/api/metrics?tenantId=${tenantId}`);
        // return response.data;

        // Return mock data for now
        return MOCK_DATA.metrics;
    } catch (error) {
        console.error('Error fetching metrics:', error);
        throw error;
    }
};

export const getOrdersTimeSeries = async (tenantId, dateRange) => {
    try {
        // const response = await api.get(`/api/metrics/orders?tenantId=${tenantId}&range=${dateRange}`);
        // return response.data;
        return MOCK_DATA.ordersTimeSeries;
    } catch (error) {
        console.error('Error fetching orders time series:', error);
        throw error;
    }
};

export const getTopCustomers = async (tenantId) => {
    try {
        // const response = await api.get(`/api/metrics/top-customers?tenantId=${tenantId}`);
        // return response.data;
        return MOCK_DATA.topCustomers;
    } catch (error) {
        console.error('Error fetching top customers:', error);
        throw error;
    }
};

export default api;
