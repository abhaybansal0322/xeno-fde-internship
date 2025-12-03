# Configuration Checklist - APIs, Secrets & External Services

Complete list of all APIs, secrets, and external configurations required to finalize the Xeno FDE project.

---

## 🔐 **BACKEND ENVIRONMENT VARIABLES**

### Required in `backend/.env`:

#### 1. **Database Configuration**
```env
DATABASE_URL="postgresql://xenouser:xenopass@localhost:5432/xenodb"
```
- **What it is**: PostgreSQL connection string
- **Where to get it**: 
  - **Local**: Use docker-compose defaults or configure your own PostgreSQL instance
  - **Production**: Get from your database provider (AWS RDS, Heroku Postgres, Railway, etc.)
- **Format**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`

#### 2. **Shopify API Credentials (OAuth Flow)**
```env
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here
SHOPIFY_API_VERSION=2024-01
```
- **What they are**: Credentials for Shopify Partner App (OAuth flow)
- **Where to get them**:
  1. Go to [Shopify Partner Dashboard](https://partners.shopify.com/)
  2. Create a new app or select existing app
  3. Navigate to **API credentials** tab
  4. Copy:
     - **Client ID** → `SHOPIFY_API_KEY`
     - **Client secret** → `SHOPIFY_API_SECRET`
  5. Set **API version** (optional, defaults to 2024-01) → `SHOPIFY_API_VERSION`
- **Note**: 
  - These are app-level credentials for OAuth flow
  - Required for OAuth-based store connection
  - See `SHOPIFY_OAUTH_SETUP.md` for detailed setup

#### 2b. **Shopify Webhook Secret (Optional)**
```env
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
```
- **What it is**: Secret for verifying webhook signatures
- **When needed**: If using Shopify Partner App webhooks
- **Where to get**: From Shopify Partner Dashboard → App → Webhooks

#### 3. **Server Configuration**
```env
PORT=4000
NODE_ENV=development
ENABLE_CRON=false
API_BASE_URL=http://localhost:4000
```
- **PORT**: Backend server port (default: 4000)
- **NODE_ENV**: `development` or `production`
- **ENABLE_CRON**: Set to `true` to enable automated tenant sync (runs every 10 minutes)
- **API_BASE_URL**: 
  - Base URL for OAuth callbacks and cron jobs
  - **Local**: `http://localhost:4000`
  - **Production**: `https://your-backend-domain.com`

---

## 🌐 **FRONTEND ENVIRONMENT VARIABLES**

### Required in `frontend/.env.local`:

#### 1. **NextAuth Configuration**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_development_secret
```
- **NEXTAUTH_URL**: Your frontend URL
  - **Local**: `http://localhost:3000`
  - **Production**: `https://your-domain.com`
- **NEXTAUTH_SECRET**: Random secret for session encryption
  - **How to generate**: 
    ```bash
    openssl rand -base64 32
    ```
    Or use: https://generate-secret.vercel.app/32

#### 2. **GitHub OAuth Credentials**
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```
- **What they are**: OAuth credentials for GitHub authentication
- **Where to get them**:
  1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
  2. Click **OAuth Apps** → **New OAuth App**
  3. Fill in:
     - **Application name**: Xeno Dashboard (or your choice)
     - **Homepage URL**: `http://localhost:3000` (local) or your production URL
     - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
  4. Click **Register application**
  5. Copy:
     - **Client ID** → `GITHUB_CLIENT_ID`
     - **Client Secret** → `GITHUB_CLIENT_SECRET` (click "Generate a new client secret" if needed)

#### 3. **Backend API URL**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```
- **What it is**: URL of your backend API
- **Local**: `http://localhost:4000` (or whatever port your backend runs on)
- **Production**: `https://your-api-domain.com`

---

## 🗄️ **DATABASE SETUP**

### PostgreSQL Database
- **What**: PostgreSQL 14+ database
- **Options**:
  1. **Docker Compose** (Local): Already configured in `docker-compose.yml`
  2. **Local PostgreSQL**: Install PostgreSQL locally
  3. **Cloud Providers**:
     - **AWS RDS**: https://aws.amazon.com/rds/postgresql/
     - **Heroku Postgres**: https://www.heroku.com/postgres
     - **Railway**: https://railway.app/
     - **Supabase**: https://supabase.com/
     - **Neon**: https://neon.tech/
- **Connection String Format**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`

---

## 🛍️ **SHOPIFY CONFIGURATION**

### 1. **Shopify Partner Account**
- **What**: Account to create and manage Shopify apps
- **Where**: https://partners.shopify.com/
- **Steps**:
  1. Sign up for free Shopify Partner account
  2. Create a new app in Partner Dashboard
  3. Configure app settings

### 2. **Shopify Store Access Tokens**
- **What**: Store-specific access tokens for each tenant/store
- **Where to get them**:
  - **Option A - OAuth Flow** (Recommended):
    1. Implement OAuth redirect flow in your app
    2. User authorizes your app to access their store
    3. Receive access token via OAuth callback
  - **Option B - Private App** (Testing):
    1. Go to Shopify Admin → **Settings** → **Apps and sales channels**
    2. Click **Develop apps** → **Create an app**
    3. Configure Admin API scopes (read_orders, read_customers, read_products)
    4. Install app and get access token
- **Format**: `shpat_xxxxxxxxxxxxxxxxxxxxx`
- **Note**: These are stored per tenant when onboarding via `/api/tenants/onboard`

### 3. **Shopify Webhook Registration**
- **What**: Webhooks to receive real-time updates from Shopify stores
- **Important**: You need to **CREATE webhooks** in Shopify - signature verification is automatic!
- **Required Webhooks** (create these in Shopify):
  - `orders/create` → `https://your-domain.com/webhooks/shopify/orders_create`
  - `orders/updated` → `https://your-domain.com/webhooks/shopify/orders_updated`
  - `customers/create` → `https://your-domain.com/webhooks/shopify/customers_create`
  - `customers/update` → `https://your-domain.com/webhooks/shopify/customers_update`
  - `products/create` → `https://your-domain.com/webhooks/shopify/products_create`
  - `products/update` → `https://your-domain.com/webhooks/shopify/products_update`
- **Webhook Configuration**:
  - **Format**: JSON (required)
  - **URL Pattern**: Use underscores in URL (`orders_create` not `orders/create`)
  - **API Version**: 2024-01 (or latest)
- **Signature Verification**: 
  - **Automatic** - Shopify signs webhooks, your backend verifies them
  - Just set `SHOPIFY_API_SECRET` in `.env` (or `SHOPIFY_WEBHOOK_SECRET` if available)
  - No manual signature setup needed!
- **Where to register**:
  1. **Via Shopify Admin** (Testing):
     - Go to Shopify Admin → **Settings** → **Notifications** → **Webhooks**
     - Click **Create webhook**
     - Select event, format (JSON), and enter your webhook URL
  2. **Via Shopify API** (Production):
     - Use Admin API to programmatically register webhooks
     - See `backend/WEBHOOKS.md` for code examples
- **Testing Locally**: Use [ngrok](https://ngrok.com/) to expose local server:
  ```bash
  ngrok http 3000
  # Use the ngrok URL in webhook configuration
  ```
- **See**: `WEBHOOK_SETUP_GUIDE.md` for detailed step-by-step instructions

---

## 🚀 **DEPLOYMENT CONFIGURATION**

### Production Environment Variables

#### Backend Production `.env`:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...  # Production database
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_WEBHOOK_SECRET=...
ENABLE_CRON=true
API_BASE_URL=https://your-api-domain.com
```

#### Frontend Production `.env.local`:
```env
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=...  # Strong production secret
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Deployment Platforms
- **Backend Options**:
  - **Heroku**: https://www.heroku.com/
  - **Railway**: https://railway.app/
  - **Render**: https://render.com/
  - **AWS EC2/ECS**: https://aws.amazon.com/
  - **DigitalOcean App Platform**: https://www.digitalocean.com/products/app-platform
- **Frontend Options**:
  - **Vercel**: https://vercel.com/ (Recommended for Next.js)
  - **Netlify**: https://www.netlify.com/
  - **AWS Amplify**: https://aws.amazon.com/amplify/

---

## 📋 **QUICK SETUP CHECKLIST**

### Backend Setup:
- [ ] Create `backend/.env` file
- [ ] Set `DATABASE_URL` (use docker-compose or external database)
- [ ] Get Shopify Partner credentials:
  - [ ] `SHOPIFY_API_KEY`
  - [ ] `SHOPIFY_API_SECRET`
  - [ ] `SHOPIFY_WEBHOOK_SECRET`
- [ ] Configure `PORT`, `NODE_ENV`, `ENABLE_CRON` as needed
- [ ] Run database migrations: `npx prisma migrate deploy`

### Frontend Setup:
- [ ] Create `frontend/.env.local` file
- [ ] Set `NEXTAUTH_URL` (local or production URL)
- [ ] Generate `NEXTAUTH_SECRET` (use openssl or online generator)
- [ ] Create GitHub OAuth App:
  - [ ] `GITHUB_CLIENT_ID`
  - [ ] `GITHUB_CLIENT_SECRET`
- [ ] Set `NEXT_PUBLIC_API_URL` to backend URL

### Shopify Setup:
- [ ] Create Shopify Partner account
- [ ] Create Shopify app in Partner Dashboard
- [ ] Get app credentials (API Key, Secret, Webhook Secret)
- [ ] For each store/tenant:
  - [ ] Get store access token (via OAuth or Private App)
  - [ ] Onboard tenant via `POST /api/tenants/onboard`
- [ ] Register webhooks for each store (if using webhooks)

### Testing:
- [ ] Test backend health: `GET /health`
- [ ] Test tenant listing: `GET /api/tenants`
- [ ] Test onboarding: `POST /api/tenants/onboard`
- [ ] Test frontend login with GitHub
- [ ] Test tenant switching in dashboard
- [ ] Test webhook delivery (use ngrok for local testing)

---

## 🔗 **USEFUL LINKS**

### Documentation:
- **Shopify Partner Dashboard**: https://partners.shopify.com/
- **Shopify Admin API**: https://shopify.dev/docs/api/admin-rest
- **Shopify Webhooks**: https://shopify.dev/docs/api/webhooks
- **NextAuth.js**: https://next-auth.js.org/
- **GitHub OAuth**: https://docs.github.com/en/apps/oauth-apps
- **Prisma**: https://www.prisma.io/docs

### Tools:
- **ngrok** (Webhook Testing): https://ngrok.com/
- **Secret Generator**: https://generate-secret.vercel.app/32
- **PostgreSQL Providers**:
  - AWS RDS: https://aws.amazon.com/rds/postgresql/
  - Heroku Postgres: https://www.heroku.com/postgres
  - Railway: https://railway.app/
  - Supabase: https://supabase.com/

---

## ⚠️ **SECURITY NOTES**

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong secrets** - Generate random strings for `NEXTAUTH_SECRET`
3. **Rotate credentials** - Change secrets periodically, especially if exposed
4. **Use HTTPS in production** - Required for OAuth callbacks and webhooks
5. **Encrypt access tokens** - In production, encrypt tenant access tokens before storing
6. **Limit API scopes** - Request only necessary Shopify API permissions
7. **Validate webhooks** - Always verify HMAC signatures (already implemented)

---

## 📝 **ENVIRONMENT FILE TEMPLATES**

### `backend/.env`:
```env
# Database
DATABASE_URL="postgresql://xenouser:xenopass@localhost:5432/xenodb"

# Shopify
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# Server
PORT=3000
NODE_ENV=development
ENABLE_CRON=false
API_BASE_URL=http://localhost:3000
```

### `frontend/.env.local`:
```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_here

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

**Last Updated**: Based on current codebase structure
**For Questions**: Refer to `backend/README.md` and `frontend/README.md`

