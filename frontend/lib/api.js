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

// Store user email for API requests (set by components using useSession)
let currentUserEmail = null;

export const setUserEmail = (email) => {
    currentUserEmail = email;
    console.log('[API] User email set:', email);
};

// Export API URL for error messages
export const getApiUrl = () => {
    return API_URL;
};

// Add interceptor to include user email in headers and debug logging
api.interceptors.request.use(
    (config) => {
        // Add user email to headers if available
        if (currentUserEmail) {
            config.headers['X-User-Email'] = currentUserEmail;
        } else {
            console.warn('[API] No user email set - request may fail authentication');
        }
        // Debug logging
        console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
            hasUserEmail: !!currentUserEmail,
            userEmail: currentUserEmail || 'not set'
        });
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
        // Increase timeout for comprehensive metrics endpoint
        const response = await api.get(`/api/metrics?tenantId=${tenantId}`, {
            timeout: 30000, // 30 seconds timeout for potentially slow queries
        });
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

export const getTopProducts = async (tenantId) => {
    try {
        // Use dedicated endpoint with longer timeout for top products
        const response = await api.get(`/api/metrics/top-products?tenantId=${tenantId}`, {
            timeout: 30000, // 30 seconds timeout for potentially slow queries
        });
        return response.data.topProducts || [];
    } catch (error) {
        console.error('Error fetching top products:', error);
        // Return empty array on error instead of throwing to prevent UI breakage
        return [];
    }
};

export const getTenants = async () => {
    try {
        const response = await api.get('/api/tenants');
        console.log('Tenants:', response.data);
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

// Tenant management functions
/**
 * Validate Shopify credentials before onboarding
 * This calls the backend which makes a test API call to Shopify
 * @param {string} shopifyDomain - Shopify store domain
 * @param {string} accessToken - Admin API access token
 * @returns {Promise<object>} - Validation result with shop info if valid
 */
export const validateShopifyCredentials = async (shopifyDomain, accessToken) => {
    try {
        const response = await api.post('/api/tenants/validate', {
            shopifyDomain,
            accessToken,
        });
        return response.data;
    } catch (error) {
        console.error('Error validating Shopify credentials:', error);
        throw error;
    }
};

/**
 * Onboard a new tenant (Shopify store)
 * All Shopify API calls are handled by the backend to avoid CORS issues
 * @param {string} name - Store name
 * @param {string} shopifyDomain - Shopify store domain
 * @param {string} accessToken - Admin API access token
 * @returns {Promise<object>} - Created tenant data
 */
export const onboardTenant = async (name, shopifyDomain, accessToken) => {
    try {
        const response = await api.post('/api/tenants/onboard', {
            name,
            shopifyDomain,
            accessToken,
        });
        return response.data;
    } catch (error) {
        console.error('Error onboarding tenant:', error);
        throw error;
    }
};

// Data sync functions
/**
 * Sync tenant data from Shopify
 * This operation can take several minutes for large stores
 * Uses extended timeout to handle long-running sync operations
 */
export const syncTenantData = async (tenantId) => {
    try {
        const response = await api.post(`/api/ingest/sync?tenantId=${tenantId}`, {}, {
            timeout: 300000, // 5 minutes timeout for sync operations
        });
        return response.data;
    } catch (error) {
        console.error('Error syncing tenant data:', error);
        if (error.code === 'ECONNABORTED') {
            throw new Error('Sync operation timed out. This may happen with large stores. Please try again or contact support.');
        }
        throw error;
    }
};

// Get customers list
export const getCustomersList = async (tenantId) => {
    try {
        const response = await api.get(`/api/metrics/customers?tenantId=${tenantId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching customers list:', error);
        throw error;
    }
};

// Get orders list
export const getOrdersList = async (tenantId) => {
    try {
        const response = await api.get(`/api/metrics/orders?tenantId=${tenantId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching orders list:', error);
        throw error;
    }
};

export default api;
