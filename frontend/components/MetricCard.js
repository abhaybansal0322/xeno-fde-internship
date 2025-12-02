export default function MetricCard({ title, value, icon, onClick, clickable = false }) {
    const baseClasses = "bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300";
    const hoverClasses = clickable ? "hover:shadow-md hover:border-indigo-300 cursor-pointer" : "hover:shadow-md";
    
    const content = (
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
                {clickable && (
                    <div className="flex-shrink-0 ml-4">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );

    if (clickable && onClick) {
        return (
            <div 
                className={`${baseClasses} ${hoverClasses}`}
                onClick={onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                    }
                }}
            >
                {content}
            </div>
        );
    }

    return (
        <div className={`${baseClasses} ${hoverClasses}`}>
            {content}
        </div>
    );
}
