import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { onboardTenant, validateShopifyCredentials, setUserEmail, getApiUrl } from '../lib/api';
import { useRouter } from 'next/router';

export default function OnboardTenant({ onSuccess }) {
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        name: '',
        shopifyDomain: '',
        accessToken: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Ensure user email is set before form submission
    useEffect(() => {
        if (session?.user?.email) {
            setUserEmail(session.user.email);
        }
    }, [session]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate user is authenticated
        if (!session?.user?.email) {
            setError('Please sign in to connect a store. Redirecting to login...');
            setLoading(false);
            setTimeout(() => router.push('/auth/signin'), 2000);
            return;
        }

        // Ensure user email is set
        setUserEmail(session.user.email);

        // Validate shopifyDomain format
        if (!formData.shopifyDomain.includes('.myshopify.com')) {
            setError('Shopify domain must be in format: yourstore.myshopify.com');
            setLoading(false);
            return;
        }

        try {
            // First validate credentials through backend (backend makes Shopify API call)
            // This ensures we catch CORS/auth errors before attempting to create tenant
            try {
                const validationResult = await validateShopifyCredentials(
                    formData.shopifyDomain,
                    formData.accessToken
                );
                
                if (!validationResult.valid) {
                    setError(validationResult.message || 'Invalid Shopify credentials');
                    setLoading(false);
                    return;
                }
                
                // Optionally use shop name from validation if name is empty
                if (!formData.name && validationResult.shop?.name) {
                    formData.name = validationResult.shop.name;
                }
            } catch (validationError) {
                // Handle validation errors (invalid token, CORS, etc.)
                if (validationError.response) {
                    const errorMessage = validationError.response?.data?.message || 
                                       validationError.response?.data?.error || 
                                       'Failed to validate Shopify credentials';
                    setError(errorMessage);
                } else {
                    setError('Could not connect to Shopify. Please check your credentials and try again.');
                }
                setLoading(false);
                return;
            }

            // If validation passes, create tenant (backend handles all Shopify API calls)
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
            console.error('Onboard tenant error:', err);
            
            // Handle network errors specifically
            if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
                const apiUrl = getApiUrl();
                setError(`Cannot connect to server at ${apiUrl}. Please check if the backend is running. If you're in production, verify your NEXT_PUBLIC_API_URL environment variable is set correctly.`);
            } else if (err.response) {
                // Server responded with error
                const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to onboard tenant';
                setError(errorMessage);
            } else if (err.message) {
                // Other errors
                setError(err.message);
            } else {
                setError('Failed to onboard tenant. Please try again.');
            }
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

