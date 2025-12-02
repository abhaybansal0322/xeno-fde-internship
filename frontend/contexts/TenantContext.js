import { createContext, useContext, useState, useEffect } from 'react';
import { getTenants } from '../lib/api';

const TenantContext = createContext();

export function TenantProvider({ children }) {
    const [tenantId, setTenantId] = useState(null);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const fetchTenants = async () => {
        try {
            const data = await getTenants();
            setTenants(data);

            // Try to restore from localStorage (only on client-side)
            if (typeof window !== 'undefined') {
                const savedTenantId = localStorage.getItem('selectedTenantId');
                if (savedTenantId && data.find(t => t.id === savedTenantId)) {
                    setTenantId(savedTenantId);
                } else if (data.length > 0 && !tenantId) {
                    // Select first tenant by default if none selected
                    setTenantId(data[0].id);
                }
            } else if (data.length > 0 && !tenantId) {
                setTenantId(data[0].id);
            }
        } catch (error) {
            console.error('Error loading tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchTenants();
    }, []);

    const selectTenant = (id) => {
        setTenantId(id);
        if (typeof window !== 'undefined') {
            localStorage.setItem('selectedTenantId', id);
        }
    };

    return (
        <TenantContext.Provider value={{ tenantId, tenants, loading, setTenantId: selectTenant, refreshTenants: fetchTenants }}>
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}
