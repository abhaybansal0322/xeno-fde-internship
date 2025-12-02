import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getTenants, setUserEmail } from '../lib/api';

const TenantContext = createContext();

export function TenantProvider({ children }) {
    const { data: session } = useSession();
    const [tenantId, setTenantId] = useState(null);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Set user email for API requests
    useEffect(() => {
        if (session?.user?.email) {
            setUserEmail(session.user.email);
        }
    }, [session]);

    const fetchTenants = useCallback(async () => {
        try {
            const data = await getTenants();
            setTenants(data);

            // Try to restore from localStorage (only on client-side)
            if (typeof window !== 'undefined') {
                const savedTenantId = localStorage.getItem('selectedTenantId');
                if (savedTenantId && data.find(t => t.id === savedTenantId)) {
                    setTenantId(savedTenantId);
                } else if (data.length > 0) {
                    // Select first tenant by default if none selected
                    setTenantId((currentId) => currentId || data[0].id);
                }
            } else if (data.length > 0) {
                setTenantId((currentId) => currentId || data[0].id);
            }
        } catch (error) {
            console.error('Error loading tenants:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchTenants();
    }, [fetchTenants]);

    const selectTenant = (id) => {
        setTenantId(id);
        if (typeof window !== 'undefined') {
            localStorage.setItem('selectedTenantId', id);
        }
    };

    const refreshTenants = useCallback(async () => {
        try {
            const data = await getTenants();
            setTenants(data);

            // Try to restore from localStorage (only on client-side)
            if (typeof window !== 'undefined') {
                const savedTenantId = localStorage.getItem('selectedTenantId');
                if (savedTenantId && data.find(t => t.id === savedTenantId)) {
                    setTenantId(savedTenantId);
                } else if (data.length > 0) {
                    setTenantId((currentId) => currentId || data[0].id);
                }
            } else if (data.length > 0) {
                setTenantId((currentId) => currentId || data[0].id);
            }
        } catch (error) {
            console.error('Error loading tenants:', error);
        }
    }, []);

    return (
        <TenantContext.Provider value={{ tenantId, tenants, loading, setTenantId: selectTenant, refreshTenants }}>
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
