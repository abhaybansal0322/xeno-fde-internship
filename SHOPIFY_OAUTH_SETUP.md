# Shopify OAuth Integration Setup Guide

This guide explains how to set up the new OAuth-based Shopify integration, following best practices from the [official Shopify App Template](https://github.com/Shopify/shopify-app-template-remix).

## 🎯 What's New

### OAuth Flow (Recommended)
- **Secure OAuth installation** - No more manual token entry
- **Automatic scope management** - Shopify handles permissions
- **Better user experience** - One-click store connection

### Manual Token Entry (Still Supported)
- You can still use the manual token entry method
- Useful for testing or custom apps

---

## 📋 Prerequisites

### 1. Shopify Partner Account

1. **Sign up** at [partners.shopify.com](https://partners.shopify.com)
2. **Create a new app**:
   - Go to **Apps** → **Create app**
   - Choose **Custom app** (for development)
   - Enter app name: "Xeno Dashboard"

### 2. Configure App Settings

1. **Get API Credentials**:
   - Go to **API credentials** tab
   - Copy **Client ID** (this is your `SHOPIFY_API_KEY`)
   - Copy **Client secret** (this is your `SHOPIFY_API_SECRET`)

2. **Set App URL** (for production):
   - **App URL**: `https://your-frontend-domain.com`
   - **Allowed redirection URL(s)**:
     ```
     https://your-backend-domain.com/api/shopify/callback
     https://your-frontend-domain.com/auth/shopify/callback
     ```

3. **Configure Scopes**:
   - Go to **Configuration** → **Scopes**
   - Required scopes:
     - ✅ `read_customers`
     - ✅ `read_orders`
     - ✅ `read_products`

---

## 🔧 Backend Configuration

### Environment Variables

Add these to your `backend/.env`:

```env
# Shopify OAuth Configuration (Required for OAuth flow)
SHOPIFY_API_KEY=your_client_id_from_partner_dashboard
SHOPIFY_API_SECRET=your_client_secret_from_partner_dashboard

# Shopify API Version (Optional, defaults to 2024-01)
SHOPIFY_API_VERSION=2024-01

# OAuth Callback URL Base (Required)
API_BASE_URL=http://localhost:4000
# Or in production:
# API_BASE_URL=https://your-backend-domain.com

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
# Or in production:
# FRONTEND_URL=https://your-frontend-domain.com
```

### Install Routes

The OAuth routes are automatically mounted at:
- `GET /api/shopify/install` - Initiate OAuth flow
- `GET /api/shopify/callback` - Handle OAuth callback
- `POST /api/shopify/complete` - Complete tenant creation

---

## 🎨 Frontend Integration

### Option 1: OAuth Flow (New - Recommended)

#### Step 1: Create OAuth Install Component

Create `frontend/components/ShopifyInstallButton.js`:

```javascript
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { onboardTenantViaOAuth } from '../lib/api';

export default function ShopifyInstallButton({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [shopDomain, setShopDomain] = useState('');
    const [error, setError] = useState('');
    const { data: session } = useSession();

    const handleInstall = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!shopDomain) {
            setError('Please enter your Shopify store domain');
            setLoading(false);
            return;
        }

        try {
            // Call backend to get OAuth URL
            const response = await fetch('/api/shopify/install', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': session?.user?.email || '',
                },
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate OAuth');
            }

            // Redirect to Shopify OAuth page
            window.location.href = data.authUrl;
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleInstall} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">
                    Shopify Store Domain
                </label>
                <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="mystore.myshopify.com"
                    className="w-full px-4 py-2 border rounded-lg"
                />
            </div>
            {error && (
                <div className="text-red-600 text-sm">{error}</div>
            )}
            <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
                {loading ? 'Connecting...' : 'Connect with Shopify OAuth'}
            </button>
        </form>
    );
}
```

#### Step 2: Create OAuth Callback Handler

Create `frontend/pages/auth/shopify/callback.js`:

```javascript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';

export default function ShopifyCallback() {
    const router = useRouter();
    const { data: session } = useSession();
    const [status, setStatus] = useState('processing');

    useEffect(() => {
        const completeOAuth = async () => {
            const { shop, access_token, scope, error } = router.query;

            if (error) {
                setStatus('error');
                return;
            }

            if (!shop || !access_token) {
                setStatus('error');
                return;
            }

            try {
                // Complete tenant creation
                const response = await axios.post('/api/shopify/complete', {
                    shop,
                    accessToken: access_token,
                    scope,
                }, {
                    headers: {
                        'X-User-Email': session?.user?.email || '',
                    },
                });

                if (response.data.success) {
                    setStatus('success');
                    setTimeout(() => {
                        router.push('/dashboard');
                    }, 2000);
                }
            } catch (err) {
                console.error('Error completing OAuth:', err);
                setStatus('error');
            }
        };

        if (router.isReady && session) {
            completeOAuth();
        }
    }, [router.isReady, router.query, session]);

    if (status === 'processing') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4">Connecting your store...</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-green-600 text-6xl mb-4">✓</div>
                    <h2 className="text-2xl font-bold mb-2">Store Connected!</h2>
                    <p>Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="text-red-600 text-6xl mb-4">✗</div>
                <h2 className="text-2xl font-bold mb-2">Connection Failed</h2>
                <p className="mb-4">{router.query.error || 'An error occurred'}</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}
```

#### Step 3: Update API Client

Add to `frontend/lib/api.js`:

```javascript
// OAuth-based tenant onboarding
export const initiateShopifyOAuth = async (shopDomain) => {
    try {
        const response = await api.get(`/api/shopify/install?shop=${encodeURIComponent(shopDomain)}`);
        return response.data;
    } catch (error) {
        console.error('Error initiating OAuth:', error);
        throw error;
    }
};

export const completeShopifyOAuth = async (shop, accessToken, scope) => {
    try {
        const response = await api.post('/api/shopify/complete', {
            shop,
            accessToken,
            scope,
        });
        return response.data;
    } catch (error) {
        console.error('Error completing OAuth:', error);
        throw error;
    }
};
```

### Option 2: Manual Token Entry (Existing)

The existing manual token entry method still works. See `OnboardTenant.js` component.

---

## 🚀 Testing OAuth Flow

### Local Development

1. **Start your backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start your frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Use ngrok for local testing** (if needed):
   ```bash
   ngrok http 4000
   ```
   - Update `API_BASE_URL` in `.env` to your ngrok URL
   - Update Shopify app callback URL in Partner Dashboard

### Production

1. Set environment variables in your deployment platform
2. Update Shopify Partner Dashboard with production URLs
3. Test the OAuth flow end-to-end

---

## 🔄 Migration from Manual to OAuth

If you have existing tenants connected via manual token entry:

1. **Existing tenants continue to work** - No changes needed
2. **New connections** - Can use OAuth flow
3. **To migrate existing tenants**:
   - Disconnect store in dashboard
   - Reconnect using OAuth flow

---

## 📚 Resources

- [Shopify App Template (Remix)](https://github.com/Shopify/shopify-app-template-remix)
- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [Shopify API Scopes](https://shopify.dev/docs/api/admin-graphql/latest/enums/adminapiscope)

---

## ✅ Checklist

- [ ] Created Shopify Partner account
- [ ] Created app in Partner Dashboard
- [ ] Got API credentials (Client ID and Secret)
- [ ] Set callback URLs in Partner Dashboard
- [ ] Added environment variables to backend `.env`
- [ ] Created frontend OAuth components
- [ ] Tested OAuth flow locally
- [ ] Updated production environment variables
- [ ] Tested OAuth flow in production

