export default function MetricCard({ title, value, icon }) {
    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 hover:shadow-md">
            <div className="p-6">
                <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg">
                        {icon && <div className="h-6 w-6 text-blue-600">{icon}</div>}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="text-sm font-medium text-slate-500 truncate">
                                {title}
                            </dt>
                            <dd>
                                <div className="text-2xl font-bold text-slate-900 mt-1">
                                    {value}
                                </div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}
