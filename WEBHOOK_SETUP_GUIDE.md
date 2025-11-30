# Shopify Webhook Setup Guide

## ⚠️ Common Error: "Address cannot be a Shopify or an internal domain"

**If you see this error**, you're using an invalid URL. Shopify requires:
- ✅ **HTTPS** (not HTTP)
- ✅ **Publicly accessible** (not localhost)
- ✅ **Not a Shopify domain** (not *.myshopify.com)

**Invalid URLs** (will cause error):
- ❌ `http://localhost:3000/webhooks/shopify/orders_create`
- ❌ `http://127.0.0.1:3000/webhooks/shopify/orders_create`
- ❌ `https://yourstore.myshopify.com/webhooks/...`

**Valid URLs**:
- ✅ `https://abc123.ngrok.io/webhooks/shopify/orders_create` (ngrok for local)
- ✅ `https://api.yourdomain.com/webhooks/shopify/orders_create` (production)

**Quick Fix**: Use **ngrok** for local development (see "Testing Locally" section below)

---

## Quick Answer

**You need to CREATE webhooks in Shopify** - the signature verification is automatic. Here's what you need:

1. **Create webhooks** for specific topics (orders, customers, products)
2. **Set the secret** in your `.env` file (signature verification is automatic)
3. **No separate signature setup needed** - Shopify sends it automatically
4. **Use a public HTTPS URL** - use ngrok for local testing

---

## What Type of Webhooks to Create

Based on your code, you should create **JSON webhooks** for these topics:

### Required Webhooks (Minimum)

1. **`orders/create`** → `https://your-domain.com/webhooks/shopify/orders_create`
2. **`orders/updated`** → `https://your-domain.com/webhooks/shopify/orders_updated`
3. **`customers/create`** → `https://your-domain.com/webhooks/shopify/customers_create`
4. **`products/create`** → `https://your-domain.com/webhooks/shopify/products_create`

### Optional (Recommended)

5. **`customers/update`** → `https://your-domain.com/webhooks/shopify/customers_update`
6. **`products/update`** → `https://your-domain.com/webhooks/shopify/products_update`

---

## How to Create Webhooks

### Option 1: Via Shopify Admin (Easiest for Testing)

1. Go to your **Shopify Admin** → **Settings** → **Notifications**
2. Scroll to **Webhooks** section
3. Click **Create webhook**
4. Configure each webhook:
   - **Event**: Select the topic (e.g., "Order creation")
   - **Format**: **JSON** (important!)
   - **URL**: Your endpoint URL
     - Pattern: `https://your-domain.com/webhooks/shopify/{topic_with_underscores}`
     - Example: `https://api.example.com/webhooks/shopify/orders_create`
   - **API Version**: 2024-01 (or latest)
5. Click **Save webhook**
6. Repeat for each topic

### Option 2: Via Shopify API (For Production)

Use the Admin API to programmatically create webhooks:

```javascript
const shopifyApiUrl = `https://${shopDomain}/admin/api/2024-01/webhooks.json`;

const webhookTopics = [
  'orders/create',
  'orders/updated',
  'customers/create',
  'customers/update',
  'products/create',
  'products/update',
];

for (const topic of webhookTopics) {
  const response = await fetch(shopifyApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      webhook: {
        topic: topic,
        address: `https://your-domain.com/webhooks/shopify/${topic.replace('/', '_')}`,
        format: 'json',
      },
    }),
  });
}
```

---

## Signature Verification (Automatic)

### How It Works

1. **Shopify automatically signs every webhook** with HMAC-SHA256
2. **Your backend automatically verifies** the signature using your secret
3. **You just need to set the secret** in your `.env` file

### What Secret to Use

Your code accepts either:
- `SHOPIFY_WEBHOOK_SECRET` (preferred, if your app has a separate webhook secret)
- `SHOPIFY_API_SECRET` (fallback, uses your app's API secret)

**In your `backend/.env`:**

```env
# Use one of these (or both - webhook secret takes priority)
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here  # Optional, falls back to API_SECRET
```

### Where to Get the Secret

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Select your app
3. Go to **App Setup** → **API credentials**
4. Copy the **API Secret Key** → This is your `SHOPIFY_API_SECRET`
5. Some apps have a separate **Webhook Secret** - if available, use that for `SHOPIFY_WEBHOOK_SECRET`

**Note**: The secret used for verification must match what Shopify uses to sign the webhooks. For most apps, this is the same as your API secret.

---

## URL Pattern

Your backend expects URLs in this format:

```
https://your-domain.com/webhooks/shopify/{topic}
```

Where `{topic}` uses **underscores** instead of slashes:
- `orders/create` → `/webhooks/shopify/orders_create`
- `customers/update` → `/webhooks/shopify/customers_update`
- `products/create` → `/webhooks/shopify/products_create`

---

## Testing Locally

**⚠️ IMPORTANT**: Shopify **does NOT accept** localhost URLs. You **MUST** use a tunneling service like ngrok.

### Step-by-Step: Using ngrok

1. **Install ngrok**:
   - Download from: https://ngrok.com/download
   - Or install via npm: `npm install -g ngrok`
   - Or via package manager: `brew install ngrok` (Mac), `choco install ngrok` (Windows)

2. **Start your backend**:
   ```bash
   cd backend
   npm start
   # Backend should be running on port 3000
   ```

3. **Start ngrok tunnel** (in a new terminal):
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** from ngrok output:
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```
   **Use the HTTPS URL** (not HTTP): `https://abc123.ngrok.io`

5. **Use in webhook URLs**:
   - ✅ `https://abc123.ngrok.io/webhooks/shopify/orders_create`
   - ✅ `https://abc123.ngrok.io/webhooks/shopify/orders_updated`
   - ✅ `https://abc123.ngrok.io/webhooks/shopify/customers_create`
   - etc.

6. **Monitor webhook requests**:
   - Open ngrok dashboard: http://localhost:4040
   - See all incoming webhook requests in real-time
   - View request/response details

### ⚠️ Important Notes

- **ngrok URL changes** when you restart ngrok (free tier)
  - You'll need to update webhook URLs in Shopify each time
  - Consider ngrok paid plan for fixed domains

- **Keep ngrok running** while testing
  - If ngrok stops, webhooks will fail
  - Keep the terminal open

- **Use HTTPS URL** (not HTTP)
  - Shopify requires HTTPS for webhooks
  - ngrok provides both, but always use the HTTPS one

### Alternative: Other Tunneling Services

If you prefer alternatives to ngrok:

**localtunnel** (Free, no signup):
```bash
npx localtunnel --port 3000
# Gives you: https://random-name.loca.lt
```

**Cloudflare Tunnel** (Free, requires Cloudflare account):
```bash
cloudflared tunnel --url http://localhost:3000
```

---

## Verification Checklist

After setting up webhooks, verify:

- [ ] Webhooks created in Shopify Admin
- [ ] URLs use correct pattern: `/webhooks/shopify/{topic_with_underscores}`
- [ ] Format is set to **JSON** (not XML)
- [ ] `SHOPIFY_API_SECRET` or `SHOPIFY_WEBHOOK_SECRET` set in `.env`
- [ ] Backend is publicly accessible (or using ngrok for testing)
- [ ] Test webhook delivery by triggering an event (e.g., create a test order)
- [ ] Check backend logs for webhook processing

---

## Troubleshooting

### ❌ Error: "Address cannot be a Shopify or an internal domain"

**Problem**: You're trying to use a URL that Shopify doesn't allow:
- ❌ `http://localhost:3000` 
- ❌ `http://127.0.0.1:3000`
- ❌ `https://yourstore.myshopify.com`
- ❌ Internal IP addresses (e.g., `192.168.x.x`)

**Why**: Shopify requires webhook URLs to be:
- ✅ Publicly accessible (not localhost)
- ✅ HTTPS (not HTTP)
- ✅ Not a Shopify domain

**Solutions**:

1. **For Local Development - Use ngrok** (Recommended):
   ```bash
   # Install ngrok: https://ngrok.com/download
   # Or: npm install -g ngrok
   
   # Start your backend
   cd backend
   npm start  # Runs on port 3000
   
   # In another terminal, start ngrok
   ngrok http 3000
   ```
   
   You'll get output like:
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```
   
   **Use the ngrok URL** in your webhook:
   - ✅ `https://abc123.ngrok.io/webhooks/shopify/orders_create`
   - ❌ NOT `http://localhost:3000/webhooks/shopify/orders_create`

2. **For Production - Deploy Your Backend**:
   - Deploy to Heroku, Railway, Render, AWS, etc.
   - Use your production domain:
   - ✅ `https://api.yourdomain.com/webhooks/shopify/orders_create`

3. **Alternative Tunneling Services**:
   - **Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
   - **localtunnel**: `npx localtunnel --port 3000`
   - **serveo**: `ssh -R 80:localhost:3000 serveo.net`

**Important Notes**:
- ngrok free tier gives you a **random URL each time** - you'll need to update webhook URLs when you restart ngrok
- ngrok paid plans offer **fixed domains** (e.g., `https://yourname.ngrok.io`)
- For production, always use a deployed backend with a fixed domain

### Webhook Returns 401 Unauthorized

- **Problem**: Signature verification failed
- **Solution**: 
  - Verify `SHOPIFY_API_SECRET` matches your app's secret
  - Ensure you're using the raw request body (your code handles this)
  - Check that Shopify is sending the `X-Shopify-Hmac-Sha256` header

### Webhook Returns 404 Not Found

- **Problem**: URL pattern doesn't match
- **Solution**: 
  - Verify URL uses underscores: `orders_create` not `orders/create`
  - Check your backend route is mounted correctly
  - Ensure the topic parameter matches

### Webhooks Not Arriving

- **Problem**: Webhooks not being delivered
- **Solution**:
  - Check webhook is active in Shopify Admin
  - Verify URL is publicly accessible (use ngrok for local)
  - Check firewall/security groups allow incoming requests
  - View webhook delivery logs in Shopify Admin
  - Ensure URL uses HTTPS (not HTTP)

---

## Summary

**What you need to do:**

1. ✅ **Create webhooks** in Shopify for each topic you want to receive
2. ✅ **Set `SHOPIFY_API_SECRET`** in your `.env` file
3. ✅ **Configure webhook URLs** to match your backend endpoint pattern
4. ✅ **That's it!** Signature verification happens automatically

**You DON'T need to:**
- ❌ Manually configure signatures
- ❌ Set up separate signature verification
- ❌ Create a separate webhook secret (unless your app provides one)

The signature is automatically:
- Generated by Shopify for each webhook
- Sent in the `X-Shopify-Hmac-Sha256` header
- Verified by your backend using your secret

---

For more details, see `backend/WEBHOOKS.md`

