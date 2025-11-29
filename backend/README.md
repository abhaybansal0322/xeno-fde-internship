# Xeno FDE Shopify Data Ingestion - Infrastructure

Complete infrastructure setup for the Xeno FDE Shopify data ingestion prototype, including Docker containerization, CI/CD pipeline, automated synchronization, and deployment tools.

## 📦 What's Included

This infrastructure setup provides:

- **🐳 Docker Containerization**: Production-ready Dockerfile and docker-compose setup
- **🔄 CI/CD Pipeline**: GitHub Actions workflow for automated testing and building
- **⏰ Automated Sync**: Cron-based tenant synchronization (every 10 minutes)
- **🔐 Webhook Verification**: Shopify HMAC signature validation
- **🧪 Smoke Tests**: Deployment verification scripts
- **📚 Comprehensive Docs**: Step-by-step guides for local development

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd xeno-fde-internship

# 2. Checkout infra branch
git checkout infra/mvp

# 3. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Shopify credentials

# 4. Start all services
docker-compose up -d

# 5. Verify deployment
cd backend
chmod +x smoke-tests.sh
BASE_URL=http://localhost:3000 ./smoke-tests.sh
```

The backend will be available at: **http://localhost:3000**

### Manual Setup

See detailed instructions in [`backend/infra.md`](./backend/infra.md)

## 📁 File Structure

```
xeno-fde-internship/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline
├── backend/
│   ├── src/
│   │   ├── cron.js                   # Automated tenant sync
│   │   └── utils/
│   │       └── webhookVerification.js # Webhook HMAC validation
│   ├── Dockerfile                    # Production Docker image
│   ├── .env.example                  # Environment variables template
│   ├── infra.md                      # Local development guide
│   ├── smoke-tests.sh                # Deployment verification
│   └── WEBHOOKS.md                   # Webhook setup guide
└── docker-compose.yml                # Local development stack
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://xenouser:xenopass@localhost:5432/xenodb"

# Shopify (from Partner Dashboard)
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# Enable automated sync (production)
ENABLE_CRON=true
```

## ⏰ Cron Scheduling

The automated tenant synchronization runs every 10 minutes when enabled.

**Enable in Development:**
```bash
ENABLE_CRON=true npm start
```

**Enable in Production:**
- Set `ENABLE_CRON=true` in environment variables
- Cron will automatically start with the application

**Manual Trigger:**
```javascript
const { syncAllTenants } = require('./src/cron');
await syncAllTenants();
```

See [`src/cron.js`](./backend/src/cron.js) for implementation details.

## 🔐 Webhook Setup

### Register Webhooks

1. Navigate to Shopify Admin → Settings → Notifications → Webhooks
2. Register required topics:
   - `orders/create` → `https://your-domain.com/webhooks/shopify/orders_create`
   - `orders/updated` → `https://your-domain.com/webhooks/shopify/orders_updated`
   - `customers/create` → `https://your-domain.com/webhooks/shopify/customers_create`
   - `products/create` → `https://your-domain.com/webhooks/shopify/products_create`

3. Format: **JSON**
4. API Version: **2024-01**

For detailed instructions, see [`backend/WEBHOOKS.md`](./backend/WEBHOOKS.md)

## 🧪 Testing

### Smoke Tests

Verify deployed backend:

```bash
cd backend
chmod +x smoke-tests.sh

# Test local instance
BASE_URL=http://localhost:3000 ./smoke-tests.sh

# Test deployed instance
BASE_URL=https://your-api.com ./smoke-tests.sh
```

### CI Pipeline

GitHub Actions automatically runs on push:

- ✅ Install dependencies
- ✅ Run linter
- ✅ Run tests
- ✅ Build Docker image
- ✅ Integration tests

## 🐳 Docker

### Build Image

```bash
cd backend
docker build -t xeno-backend:latest .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e SHOPIFY_API_SECRET="..." \
  xeno-backend:latest
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 📊 Deployment

### Prerequisites

- PostgreSQL 14+ database
- Node.js 18+ runtime (or Docker)
- Publicly accessible HTTPS endpoint for webhooks

### Deploy to Production

1. **Set Environment Variables:**
   ```bash
   DATABASE_URL="postgresql://..."
   SHOPIFY_API_KEY="..."
   SHOPIFY_API_SECRET="..."
   SHOPIFY_WEBHOOK_SECRET="..."
   ENABLE_CRON=true
   NODE_ENV=production
   ```

2. **Deploy Backend:**
   ```bash
   # Using Docker
   docker-compose -f docker-compose.prod.yml up -d
   
   # Or manually
   npm ci --production
   npx prisma migrate deploy
   npm start
   ```

3. **Register Webhooks:**
   - Update webhook URLs to production domain
   - Test with sample events

4. **Run Smoke Tests:**
   ```bash
   BASE_URL=https://your-production-api.com ./smoke-tests.sh
   ```

## 📚 Documentation

- **[infra.md](./backend/infra.md)** - Complete local development guide
- **[WEBHOOKS.md](./backend/WEBHOOKS.md)** - Webhook registration and verification
- **[ci.yml](./.github/workflows/ci.yml)** - CI/CD pipeline configuration
- **[cron.js](./backend/src/cron.js)** - Automated sync implementation

## 🛠️ Troubleshooting

### Docker Issues

**Port already in use:**
```bash
# Change port in docker-compose.yml or .env
BACKEND_PORT=3001 docker-compose up -d
```

**Permission errors:**
```bash
# Reset volumes
docker-compose down -v
docker-compose up -d
```

### Webhook Issues

**401 Unauthorized:**
- Verify `SHOPIFY_WEBHOOK_SECRET` matches Shopify app settings
- Ensure raw body is used for HMAC verification

**Webhooks not arriving:**
- Check firewall/security groups
- Verify URL is publicly accessible (use ngrok for testing)
- Check Shopify webhook logs

### Cron Issues

**Sync not running:**
- Verify `ENABLE_CRON=true` is set
- Check application logs for cron initialization
- Ensure API endpoints are accessible

## 📝 Contributing

When making infrastructure changes:

1. Update relevant documentation
2. Test locally with Docker Compose
3. Verify CI pipeline passes
4. Run smoke tests
5. Update this README if needed

## 🔗 Resources

- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Shopify Webhooks](https://shopify.dev/docs/api/webhooks)
- [Node-cron](https://www.npmjs.com/package/node-cron)

## 📋 Deliverables Checklist

- ✅ `Dockerfile` for backend
- ✅ `docker-compose.yml` for local stack
- ✅ `infra.md` for local development
- ✅ `.github/workflows/ci.yml` for CI/CD
- ✅ `src/cron.js` for automated sync
- ✅ `src/utils/webhookVerification.js` for webhook security
- ✅ `smoke-tests.sh` for deployment verification
- ✅ `WEBHOOKS.md` for webhook setup guide
- ✅ `.env.example` for configuration template

---

**Branch:** `infra/mvp`

For questions or issues, refer to the main project README or contact the development team.
