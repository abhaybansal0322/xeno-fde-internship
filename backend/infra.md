# Local Development Infrastructure Guide

This guide provides step-by-step instructions for setting up and running the Xeno FDE Shopify ingestion backend locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (v20.10+): [Download here](https://www.docker.com/products/docker-desktop)
- **Node.js** (v18+): [Download here](https://nodejs.org/)
- **npm** (v8+): Comes with Node.js
- **Git**: For version control

## Quick Start with Docker Compose

The fastest way to get started is using Docker Compose, which runs both PostgreSQL and the backend automatically:

```bash
# 1. Clone the repository (if not already done)
git clone <repository-url>
cd xeno-fde-internship

# 2. Create .env file (see Environment Variables section below)
cp backend/.env.example backend/.env

# 3. Start all services
docker-compose up -d

# 4. View logs
docker-compose logs -f backend

# 5. Stop all services
docker-compose down
```

The backend API will be available at: `http://localhost:3000`

---

## Manual Setup (Without Docker Compose)

### Step 1: Start PostgreSQL Locally

#### Option A: Using Docker

```bash
# Pull PostgreSQL 14 image
docker pull postgres:14-alpine

# Run PostgreSQL container
docker run --name xeno-postgres \
  -e POSTGRES_USER=xenouser \
  -e POSTGRES_PASSWORD=xenopass \
  -e POSTGRES_DB=xenodb \
  -p 5432:5432 \
  -v xeno_postgres_data:/var/lib/postgresql/data \
  -d postgres:14-alpine

# Verify PostgreSQL is running
docker ps | grep xeno-postgres

# View PostgreSQL logs
docker logs xeno-postgres
```

**To stop PostgreSQL:**
```bash
docker stop xeno-postgres
```

**To start again:**
```bash
docker start xeno-postgres
```

**To remove (deletes data):**
```bash
docker stop xeno-postgres
docker rm xeno-postgres
docker volume rm xeno_postgres_data
```

#### Option B: Using Local PostgreSQL Installation

If you have PostgreSQL installed locally:

```bash
# Create database
createdb xenodb -U <your-postgres-user>

# Or using psql
psql -U postgres -c "CREATE DATABASE xenodb;"
```

### Step 2: Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://xenouser:xenopass@localhost:5432/xenodb?schema=public"

# Server Configuration
NODE_ENV=development
PORT=3000

# Shopify Configuration (get from Shopify Partner Dashboard)
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here

# Cron Configuration
ENABLE_CRON=false  # Set to true to enable automated tenant syncing
```

### Step 3: Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 4: Run Database Migrations

Migrations create the database schema (tables, relationships, indexes):

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate deploy

# Or during development (creates migration files)
npx prisma migrate dev --name init
```

**Verify migrations:**
```bash
# Open Prisma Studio to view database
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can view your database tables.

### Step 5: Seed Database (Optional)

Seed the database with sample data for testing:

```bash
# Run seed script
npm run seed

# Or manually with Prisma
npx prisma db seed
```

**Create a seed file** (`backend/prisma/seed.js`):

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create a test tenant
  const tenant = await prisma.tenant.upsert({
    where: { shopifyDomain: 'test-store.myshopify.com' },
    update: {},
    create: {
      shopifyDomain: 'test-store.myshopify.com',
      accessToken: 'test_access_token',
      shopName: 'Test Store',
    },
  });

  console.log('Seeded tenant:', tenant);

  // Add more seed data as needed
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}
```

### Step 6: Start the Backend Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

**Verify the server is running:**
```bash
curl http://localhost:3000/
# Expected response: {"status":"ok","message":"Xeno FDE API is running"}
```

---

## Common Tasks

### View Database Tables

```bash
# Open Prisma Studio
npx prisma studio

# Or use psql
docker exec -it xeno-postgres psql -U xenouser -d xenodb
```

### Reset Database

```bash
# WARNING: This deletes all data!
npx prisma migrate reset

# Confirm when prompted
```

### Update Prisma Schema

After modifying `prisma/schema.prisma`:

```bash
# Create and apply migration
npx prisma migrate dev --name your_migration_name

# Regenerate Prisma Client
npx prisma generate
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Lint Code

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

---

## Troubleshooting

### Issue: "Connection refused" when connecting to PostgreSQL

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start it
docker start xeno-postgres

# Check PostgreSQL logs
docker logs xeno-postgres

# Verify port 5432 is not in use
netstat -an | findstr 5432  # Windows
lsof -i :5432               # macOS/Linux
```

### Issue: "Migration failed" errors

**Solution:**
```bash
# Reset migrations (WARNING: deletes data)
npx prisma migrate reset

# Or manually drop and recreate database
docker exec -it xeno-postgres psql -U xenouser -c "DROP DATABASE xenodb;"
docker exec -it xeno-postgres psql -U xenouser -c "CREATE DATABASE xenodb;"
npx prisma migrate deploy
```

### Issue: Prisma Client not found

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -ti:3000                  # macOS/Linux

# Kill the process or change PORT in .env
echo "PORT=3001" >> backend/.env
```

### Issue: Docker volume permission errors

**Solution:**
```bash
# Remove volume and recreate
docker-compose down -v
docker-compose up -d
```

---

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   Backend API   │
│   (Express)     │
│   Port: 3000    │
└────────┬────────┘
         │ Prisma ORM
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   Port: 5432    │
└─────────────────┘
```

---

## Next Steps

1. ✅ PostgreSQL is running
2. ✅ Database is migrated
3. ✅ Backend server is running
4. 📝 Register with Shopify (see main README)
5. 📝 Configure webhooks (see `webhookVerification.js` docs)
6. 📝 Test API endpoints (see `smoke-tests.sh`)

---

## Useful Commands Reference

| Task | Command |
|------|---------|
| Start all services | `docker-compose up -d` |
| Stop all services | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Restart backend | `docker-compose restart backend` |
| Run migrations | `npx prisma migrate deploy` |
| Open Prisma Studio | `npx prisma studio` |
| Run tests | `npm test` |
| Lint code | `npm run lint` |
| Seed database | `npm run seed` |

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/14/)
- [Shopify API Reference](https://shopify.dev/docs/api)

For questions or issues, refer to the main project README or contact the development team.
