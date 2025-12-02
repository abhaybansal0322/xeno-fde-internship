import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import OrdersChart from '../components/OrdersChart';
import TopCustomers from '../components/TopCustomers';
import SyncButton from '../components/SyncButton';
import OnboardTenant from '../components/OnboardTenant';
import DataListModal from '../components/DataListModal';
import { getMetrics } from '../lib/api';
import { useTenant } from '../contexts/TenantContext';

import { setUserEmail } from '../lib/api';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { tenantId, refreshTenants, setTenantId } = useTenant();
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(null);

    // Set user email for API requests
    useEffect(() => {
        if (session?.user?.email) {
            setUserEmail(session.user.email);
        }
    }, [session]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated' && tenantId) {
            setLoading(true);
            const fetchMetrics = async () => {
                try {
                    const data = await getMetrics(tenantId);
                    setMetrics(data);
                } catch (error) {
                    console.error('Error fetching metrics:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchMetrics();
        }
    }, [status, tenantId]);

    if (status === 'loading' || status === 'unauthenticated') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Head>
                <title>Dashboard | Xeno</title>
            </Head>

            <Header />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                        <p className="text-slate-500 mt-2">Overview of your store performance</p>
                    </div>
                    {tenantId && (
                        <SyncButton 
                            tenantId={tenantId} 
                            onSyncComplete={() => {
                                // Refresh metrics after sync
                                if (tenantId) {
                                    setLoading(true);
                                    getMetrics(tenantId)
                                        .then((data) => {
                                            setMetrics(data);
                                            // Force refresh of child components
                                            setTenantId(tenantId);
                                        })
                                        .catch(console.error)
                                        .finally(() => setLoading(false));
                                }
                            }} 
                        />
                    )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                    <MetricCard
                        title="Total Customers"
                        value={loading ? "..." : metrics?.totalCustomers?.toLocaleString()}
                        clickable={!!tenantId && !loading && metrics?.totalCustomers > 0}
                        onClick={() => {
                            if (tenantId && metrics?.totalCustomers > 0) {
                                setModalType('customers');
                                setModalOpen(true);
                            }
                        }}
                        icon={
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        }
                    />
                    <MetricCard
                        title="Total Orders"
                        value={loading ? "..." : metrics?.totalOrders?.toLocaleString()}
                        clickable={!!tenantId && !loading && metrics?.totalOrders > 0}
                        onClick={() => {
                            if (tenantId && metrics?.totalOrders > 0) {
                                setModalType('orders');
                                setModalOpen(true);
                            }
                        }}
                        icon={
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        }
                    />
                    <MetricCard
                        title="Total Revenue"
                        value={loading ? "..." : `$${metrics?.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                </div>

                {/* Data List Modal */}
                <DataListModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    type={modalType}
                    tenantId={tenantId}
                />

                {/* Charts and Tables */}
                {tenantId && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <OrdersChart tenantId={tenantId} />
                        <TopCustomers tenantId={tenantId} />
                    </div>
                )}
                {!tenantId && (
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-slate-900">No Store Connected</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Connect your Shopify store to start viewing analytics and metrics.
                            </p>
                        </div>
                        <OnboardTenant 
                            onSuccess={async (tenant) => {
                                // Refresh tenant list and select new tenant
                                if (refreshTenants) {
                                    await refreshTenants();
                                    // Select the newly created tenant
                                    if (tenant.tenantId && setTenantId) {
                                        setTenantId(tenant.tenantId);
                                    }
                                } else {
                                    router.reload();
                                }
                            }} 
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
