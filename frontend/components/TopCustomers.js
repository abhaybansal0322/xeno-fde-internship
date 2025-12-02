import { useState, useEffect } from 'react';
import { getTopCustomers } from '../lib/api';

export default function TopCustomers({ tenantId }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getTopCustomers(tenantId);
                setCustomers(result);
            } catch (error) {
                console.error('Error fetching top customers:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Top Customers</h3>
                <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-slate-100 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Top Customers</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Customer
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Total Spent
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {customers.length > 0 ? (
                            customers.map((customer, index) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900">{customer.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {customer.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                                        ${customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="px-6 py-8 text-center text-sm text-slate-500">
                                    No customers found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
