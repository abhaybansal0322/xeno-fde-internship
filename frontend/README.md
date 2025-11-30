# Xeno FDE Internship - Frontend MVP

This is the frontend prototype for the Xeno FDE Shopify data ingestion dashboard. It is built with Next.js, Tailwind CSS, and Recharts.

## Features

- **Authentication**: GitHub OAuth via NextAuth.js
- **Tenant Selection**: Dropdown to switch between multiple Shopify stores
- **Dashboard**:
  - Key metrics (Customers, Orders, Revenue)
  - Interactive Orders Chart (Recharts) with date range filter
  - Top Customers table
- **Responsive Design**: Mobile-friendly layout using Tailwind CSS

## Prerequisites

- Node.js 16+
- npm or yarn
- GitHub OAuth App credentials (for authentication)

## Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**:
   Create a `.env.local` file in the `frontend` directory:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_development_secret
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

Run unit tests with Jest:
```bash
npm test
```

## Project Structure

- `pages/`: Next.js pages (index, dashboard, api/auth)
- `components/`: Reusable UI components (Header, MetricCard, OrdersChart, TopCustomers)
- `lib/`: Utilities (API client)
- `styles/`: Global styles and Tailwind config

## API Integration

The frontend expects a backend running at `NEXT_PUBLIC_API_URL`.
If the backend is unavailable, the `lib/api.js` file contains commented-out mock data that can be enabled for testing UI logic in isolation.

## DOM Structure (for verification)

The dashboard page (`/dashboard`) has the following key structure:
- `header`: Navigation bar
- `main`: Content area
  - `h1`: "Dashboard"
  - `div.grid`: Metrics cards container
  - `div.grid`: Charts and tables container
    - `div.recharts-responsive-container`: Orders chart
    - `table`: Top customers list
