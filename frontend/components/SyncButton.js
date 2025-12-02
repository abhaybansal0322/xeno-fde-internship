import { useState } from 'react';
import { syncTenantData } from '../lib/api';

export default function SyncButton({ tenantId, onSyncComplete }) {
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSync = async () => {
        if (!tenantId) {
            setError('Please select a tenant first');
            return;
        }

        setSyncing(true);
        setError(null);
        setSyncResult(null);

        try {
            const result = await syncTenantData(tenantId);
            setSyncResult(result);
            if (onSyncComplete) {
                onSyncComplete(result);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to sync data';
            setError(errorMessage);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex flex-col items-end space-y-2">
            <button
                onClick={handleSync}
                disabled={syncing || !tenantId}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
                {syncing ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Syncing...
                    </>
                ) : (
                    <>
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sync Data
                    </>
                )}
            </button>

            {syncResult && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm">
                    <p className="font-medium">Sync completed successfully!</p>
                    <p className="text-xs mt-1">
                        {syncResult.customersUpserted} customers, {syncResult.productsUpserted} products, {syncResult.ordersUpserted} orders
                    </p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-sm max-w-xs">
                    <p className="font-medium">Sync failed</p>
                    <p className="text-xs mt-1">{error}</p>
                </div>
            )}
        </div>
    );
}

