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
- ✅ `.env.example` for configuration template

---

**Branch:** `infra/mvp`

For questions or issues, refer to the main project README or contact the development team.
