# Acceptance Criteria & Verification

## Functional Requirements

- [ ] **Authentication**:
  - User can sign in with GitHub.
  - Unauthenticated users are redirected to login page.
  - Authenticated users are redirected to dashboard.
  - Logout button works.

- [ ] **Dashboard Metrics**:
  - Displays "Total Customers", "Total Orders", and "Total Revenue".
  - Values are formatted correctly (currency, thousands separators).

- [ ] **Orders Chart**:
  - Shows line chart of orders over time.
  - Date range filter works (7 days, 30 days, All time).
  - Tooltip shows exact count on hover.

- [ ] **Top Customers**:
  - Displays table with top 5 customers.
  - Shows Name, Email, Orders count, and Total Spent.
  - Handles empty state gracefully.

## Sample API Calls

The frontend makes the following calls to the backend:

1. **Get Metrics**:
   ```http
   GET /api/metrics?tenantId=...
   ```
   Response:
   ```json
   {
     "totalCustomers": 1250,
     "totalOrders": 450,
     "totalRevenue": 15750.50
   }
   ```

2. **Get Orders Time Series**:
   ```http
   GET /api/metrics/orders?tenantId=...&range=7d
   ```
   Response:
   ```json
   [
     { "date": "2023-11-01", "count": 12 },
     { "date": "2023-11-02", "count": 19 }
   ]
   ```

3. **Get Top Customers**:
   ```http
   GET /api/metrics/top-customers?tenantId=...
   ```
   Response:
   ```json
   [
     { "id": 1, "firstName": "John", "lastName": "Doe", "email": "john@example.com", "totalOrders": 15, "totalSpent": 1200.50 }
   ]
   ```

## Mobile Responsiveness

- [ ] Dashboard layout stacks vertically on mobile screens (< 640px).
- [ ] Navigation header adapts (hides email on small screens).
- [ ] Tables are scrollable or stacked on mobile.
