import { useState } from 'react';
import { onboardTenant } from '../lib/api';
import { useRouter } from 'next/router';

export default function OnboardTenant({ onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        shopifyDomain: '',
        accessToken: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate shopifyDomain format
        if (!formData.shopifyDomain.includes('.myshopify.com')) {
            setError('Shopify domain must be in format: yourstore.myshopify.com');
            setLoading(false);
            return;
        }

        try {
            const result = await onboardTenant(
                formData.name,
                formData.shopifyDomain,
                formData.accessToken
            );
            
            // Reset form
            setFormData({ name: '', shopifyDomain: '', accessToken: '' });
            
            if (onSuccess) {
                onSuccess(result);
            } else {
                // Refresh page to show new tenant
                router.reload();
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to onboard tenant';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Connect Shopify Store</h2>
            <p className="text-sm text-slate-600 mb-6">
                Add your Shopify store to start syncing customer, product, and order data.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                        Store Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="My Store"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="shopifyDomain" className="block text-sm font-medium text-slate-700 mb-1">
                        Shopify Domain
                    </label>
                    <input
                        type="text"
                        id="shopifyDomain"
                        value={formData.shopifyDomain}
                        onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="yourstore.myshopify.com"
                        required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Your Shopify store domain (e.g., mystore.myshopify.com)
                    </p>
                </div>

                <div>
                    <label htmlFor="accessToken" className="block text-sm font-medium text-slate-700 mb-1">
                        Admin API Access Token
                    </label>
                    <input
                        type="password"
                        id="accessToken"
                        value={formData.accessToken}
                        onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                        required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Create an Admin API access token in your Shopify admin: Settings → Apps and sales channels → Develop apps
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connecting...
                        </span>
                    ) : (
                        'Connect Store'
                    )}
                </button>
            </form>
        </div>
    );
}

