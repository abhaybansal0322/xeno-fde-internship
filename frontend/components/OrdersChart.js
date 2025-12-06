import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getOrdersTimeSeries } from '../lib/api';

export default function OrdersChart({ tenantId, lastUpdated }) {
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
    }, [tenantId, range, lastUpdated]);

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Orders Over Time</h3>
                <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="block w-36 pl-3 pr-10 py-2 text-sm bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            <div className="h-80">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    color: '#0f172a'
                                }}
                                itemStyle={{ color: '#0f172a' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2, fill: '#3b82f6', stroke: '#fff' }}
                                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
