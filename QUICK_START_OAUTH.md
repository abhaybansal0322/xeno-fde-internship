# Quick Start: Shopify OAuth Integration

## 🚀 Get Started in 5 Minutes

### Step 1: Get Shopify Partner App Credentials

1. Go to [partners.shopify.com](https://partners.shopify.com) and sign up/login
2. Click **Apps** → **Create app**
3. Choose **Custom app** → Name it "Xeno Dashboard"
4. Go to **API credentials** tab
5. Copy:
   - **Client ID** → You'll use this as `SHOPIFY_API_KEY`
   - **Client secret** → You'll use this as `SHOPIFY_API_SECRET`

### Step 2: Update Backend Environment

Add to `backend/.env`:

```env
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here
API_BASE_URL=http://localhost:4000
```

### Step 3: Configure Shopify App URLs

In Shopify Partner Dashboard → Your App → Configuration:

**App URL:**
```
http://localhost:3000
```

**Allowed redirection URL(s):**
```
http://localhost:4000/api/shopify/callback
http://localhost:3000/auth/shopify/callback
```

**Required Scopes:**
- ✅ `read_customers`
- ✅ `read_orders`
- ✅ `read_products`

### Step 4: Restart Backend

```bash
cd backend
npm run dev
```

### Step 5: Test OAuth Flow

1. Open your frontend dashboard
2. Use the OAuth install button (see `SHOPIFY_OAUTH_SETUP.md` for frontend code)
3. Enter your store domain (e.g., `mystore.myshopify.com`)
4. Click "Connect with Shopify"
5. Authorize the app in Shopify
6. You'll be redirected back and your store will be connected!

---

## 📝 What Changed

### New Files Created:
- ✅ `backend/src/lib/shopifyOAuth.js` - OAuth utilities
- ✅ `backend/src/routes/shopify-auth.js` - OAuth routes
- ✅ `backend/src/lib/shopifyGraphQL.js` - GraphQL client (optional)

### Updated Files:
- ✅ `backend/src/index.js` - Added OAuth routes
- ✅ `backend/src/lib/shopifyClient.js` - Better API version management

### New Routes:
- `GET /api/shopify/install` - Start OAuth flow
- `GET /api/shopify/callback` - Handle OAuth callback
- `POST /api/shopify/complete` - Complete connection

---

## 🔄 Backward Compatibility

✅ **Your existing setup still works!**
- Manual token entry still supported
- Existing tenants continue to work
- No breaking changes

You can use OAuth for new connections while keeping existing ones.

---

## 📚 Full Documentation

- **SHOPIFY_OAUTH_SETUP.md** - Complete setup guide with frontend code
- **SHOPIFY_UPGRADE_SUMMARY.md** - What was implemented
- **CONFIGURATION_CHECKLIST.md** - All environment variables

---

## 🆘 Troubleshooting

**Issue: "Shopify API credentials not configured"**
→ Make sure `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are in your `.env` file

**Issue: "Invalid HMAC signature"**
→ Check that your `SHOPIFY_API_SECRET` matches your Partner Dashboard

**Issue: "Redirect URI mismatch"**
→ Make sure callback URL in Partner Dashboard matches `API_BASE_URL/api/shopify/callback`

---

**Need help?** Check `SHOPIFY_OAUTH_SETUP.md` for detailed instructions!

