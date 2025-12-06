import { useState, useEffect } from 'react';
import { getCustomersList, getOrdersList } from '../lib/api';

export default function DataListModal({ isOpen, onClose, type, tenantId, customersData, ordersData }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && tenantId && type) {
            // If data is passed as props, use it directly (no need to fetch)
            if (type === 'customers' && customersData) {
                setData(Array.isArray(customersData) ? customersData : []);
                setLoading(false);
                setError(null);
                return;
            }
            
            if (type === 'orders' && ordersData) {
                setData(Array.isArray(ordersData) ? ordersData : []);
                setLoading(false);
                setError(null);
                return;
            }

            // Otherwise, fetch data from API
            setLoading(true);
            setError(null);
            setData([]);
            
            const fetchData = async () => {
                try {
                    let result;
                    if (type === 'customers') {
                        result = await getCustomersList(tenantId);
                        // Handle both response formats: {customers: [...]} or just [...]
                        if (Array.isArray(result)) {
                            setData(result);
                        } else if (result?.customers) {
                            setData(result.customers);
                        } else {
                            setData([]);
                        }
                    } else if (type === 'orders') {
                        result = await getOrdersList(tenantId);
                        // Handle both response formats: {orders: [...]} or just [...]
                        if (Array.isArray(result)) {
                            setData(result);
                        } else if (result?.orders) {
                            setData(result.orders);
                        } else {
                            setData([]);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching data:', err);
                    const errorMessage = err.response?.data?.error || 
                                       err.response?.data?.message || 
                                       err.message || 
                                       'Failed to load data';
                    setError(errorMessage);
                } finally {
                    setLoading(false);
                }
            };

            fetchData();
        } else if (!isOpen) {
            // Reset when modal closes
            setData([]);
            setError(null);
            setLoading(true);
        }
    }, [isOpen, type, tenantId, customersData, ordersData]);

    if (!isOpen) return null;

    const title = type === 'customers' ? 'Customers' : 'Orders';
    const count = data.length;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900" id="modal-title">
                                {title} ({count.toLocaleString()})
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-96">
                                {type === 'customers' ? (
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spent</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {data.map((customer) => (
                                                <tr key={customer.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                        {customer.name || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {customer.email || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                                                        ${(customer.totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order #</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {data.map((order) => (
                                                <tr key={order.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                        {order.orderNumber}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {order.customerName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {new Date(order.orderDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                                                        ${(order.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {data.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        No {type} found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}




