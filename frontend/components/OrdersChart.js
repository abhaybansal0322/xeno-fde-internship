import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getOrdersTimeSeries } from '../lib/api';

export default function OrdersChart({ tenantId }) {
    const [data, setData] = useState([]);
    const [range, setRange] = useState('7d');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getOrdersTimeSeries(tenantId, range);
                setData(result);
            } catch (error) {
                console.error('Error fetching chart data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId, range]);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Orders Over Time</h3>
                <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="mt-1 block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            <div className="h-72">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#4F46E5"
                                strokeWidth={2}
                                dot={{ r: 4, strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
