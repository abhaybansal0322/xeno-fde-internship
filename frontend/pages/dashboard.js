import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import OrdersChart from '../components/OrdersChart';
import TopCustomers from '../components/TopCustomers';
import { getMetrics } from '../lib/api';
import { useTenant } from '../contexts/TenantContext';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { tenantId } = useTenant();
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

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
        <div className="min-h-screen bg-gray-100">
            <Head>
                <title>Dashboard | Xeno</title>
            </Head>

            <Header />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                        <MetricCard
                            title="Total Customers"
                            value={loading ? "..." : metrics?.totalCustomers?.toLocaleString()}
                            icon={
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            }
                        />
                        <MetricCard
                            title="Total Orders"
                            value={loading ? "..." : metrics?.totalOrders?.toLocaleString()}
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

                    {/* Charts and Tables */}
                    {tenantId && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <OrdersChart tenantId={tenantId} />
                            <TopCustomers tenantId={tenantId} />
                        </div>
                    )}
                    {!tenantId && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Please select a tenant to view dashboard data.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
