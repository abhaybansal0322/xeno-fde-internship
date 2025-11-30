# Xeno Shopify Backend - Neon Database & Render Deployment

Express.js backend for Shopify multi-tenant data ingestion with Neon PostgreSQL database, deployable to Render.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Neon Database account ([neon.tech](https://neon.tech))
- Shopify Partner account
- Render account ([render.com](https://render.com))

### 1. Clone and Install

```bash
git clone <repository-url>
cd xeno-fde-internship/backend
npm install
```

### 2. Database Setup (Neon)

1. **Create a Neon Project**
   - Go to [console.neon.tech](https://console.neon.tech)
   - Create a new project
   - Copy the connection string from **Connection Details**

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` with your Neon credentials:**
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require"
   ```

### 3. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:4000`

## 📡 API Endpoints

### Health Check
```bash
curl http://localhost:4000/health
```

### Tenant Onboarding
```bash
curl -X POST http://localhost:4000/api/tenants/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Shopify Store",
    "shopifyDomain": "mystore.myshopify.com",
    "accessToken": "shpat_xxxxxxxxxxxxxxxxxxxxx"
  }'
```

### Manual Data Sync
```bash
curl -X POST "http://localhost:4000/api/ingest/sync?tenantId=<TENANT_ID>"
```

### Get Metrics
```bash
curl "http://localhost:4000/api/metrics?tenantId=<TENANT_ID>"
```

##  Render Deployment

### 1. Create Web Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `xeno-shopify-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npx prisma db push`
   - **Start Command**: `npm start`

### 2. Set Environment Variables

In Render dashboard, add:

```env
DATABASE_URL=<your-neon-connection-string>
SHOPIFY_API_SECRET=<your-shopify-secret>
NODE_ENV=production
PORT=4000
```

### 3. Deploy

Render will automatically deploy on every push to main branch.

Your backend will be available at: `https://xeno-shopify-backend.onrender.com`

## 🔗 Shopify Webhook Configuration

After deploying to Render, configure webhooks in Shopify Admin:

1. Go to **Settings** → **Notifications** → **Webhooks**
2. Create webhooks for:
   - `orders/create` → `https://your-app.onrender.com/webhooks/shopify/orders/create`
   - `customers/create` → `https://your-app.onrender.com/webhooks/shopify/customers/create`
   - `products/create` → `https://your-app.onrender.com/webhooks/shopify/products/create`

## 🗄️ Database Schema

- **Tenant**: Shopify store configuration
- **Customer**: Customer data with multi-tenant isolation
- **Product**: Product catalog per tenant
- **Order**: Order history with customer linking

## 📦 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with auto-reload |
| `npm start` | Start production server |
| `npm test` | Run Jest test suite |
| `npm run migrate:deploy` | Deploy migrations (production) |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## 🔒 Security

- HMAC webhook verification enabled
- Environment variables for secrets
- SSL required for database connections
- Multi-tenant data isolation

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Verify Neon connection string format
DATABASE_URL="postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require"

# Test connection
npx prisma db push
```

### Render Build Failing

- Ensure `npx prisma generate` is in build command
- Verify all environment variables are set
- Check build logs in Render dashboard

## 📝 License

MIT
