import { useState, useEffect } from 'react';
import { getTopProducts } from '../lib/api';

export default function TopProducts({ tenantId, lastUpdated }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getTopProducts(tenantId);
                setProducts(result);
            } catch (error) {
                console.error('Error fetching top products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId, lastUpdated]);

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Top Products</h3>
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
                <h3 className="text-lg font-bold text-slate-900">Top Products</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Product
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Orders
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Quantity
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Revenue
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {products.length > 0 ? (
                            products.map((product, index) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {index + 1}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900">{product.title || '-'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                                        {product.orderCount?.toLocaleString() || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                                        {product.quantity?.toLocaleString() || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                                        ${(product.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-500">
                                    No products found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
