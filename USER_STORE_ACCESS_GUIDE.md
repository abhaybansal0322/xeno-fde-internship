# User-Specific Store Access - Implementation Guide

## 🎯 What Changed

Your system now supports **user-specific Shopify store access**. Each user can only see and manage their own connected stores.

---

## ✅ What's Been Implemented

### 1. **Database Schema Updates**
- Added `userId` field to `Tenant` model
- Linked `Tenant` to `User` via foreign key
- Changed `shopifyDomain` from globally unique to unique per user
- Users can now have multiple stores, but each store belongs to one user

### 2. **Backend Security**
- All tenant routes now require user email authentication
- Middleware verifies tenant ownership before allowing access
- Users can only:
  - See their own stores
  - Sync their own stores
  - View metrics for their own stores

### 3. **Frontend Features**
- **Clickable Metrics**: Click "Total Customers" or "Total Orders" to see full lists
- **Modal Views**: Beautiful modal dialogs showing:
  - All customers with details
  - All orders with customer info
- **Auto-refresh**: Top customers and metrics refresh after sync
- **User Email**: Automatically sent in API requests

---

## 🔄 Migration Required

**IMPORTANT**: You need to run a database migration to add the `userId` field to existing tenants.

### Option 1: Via Render Shell (Recommended)

1. Go to Render dashboard → Your backend service
2. Click **Shell** tab
3. Run:
   ```bash
   npx prisma db push
   ```

### Option 2: Manual Migration

If you have existing tenants without `userId`, you'll need to:
1. Run migration: `npx prisma db push`
2. Manually assign existing tenants to users (or delete and recreate them)

---

## 📋 How It Works

### User Flow

1. **User Signs Up/In**
   - User creates account with email
   - Email is stored in `User` table

2. **User Connects Store**
   - User enters Shopify credentials
   - Store is created in `Tenant` table
   - `userId` is automatically set to current user's ID

3. **User Views Dashboard**
   - Only sees stores they own
   - Can sync only their stores
   - Metrics filtered to their stores

4. **User Clicks Metrics**
   - Click "Total Customers" → See all customers
   - Click "Total Orders" → See all orders
   - Modal shows detailed lists

---

## 🔐 Security Features

### Backend Protection

All routes now verify:
1. User email is provided (via `X-User-Email` header)
2. User exists in database
3. Tenant belongs to that user

**Protected Routes:**
- `GET /api/tenants` - Only returns user's stores
- `POST /api/tenants/onboard` - Associates store with user
- `GET /api/metrics` - Verifies tenant ownership
- `GET /api/metrics/customers` - Verifies tenant ownership
- `GET /api/metrics/orders` - Verifies tenant ownership
- `POST /api/ingest/sync` - Verifies tenant ownership

### Frontend Security

- User email automatically included in all API requests
- Session-based authentication via NextAuth
- No way to access other users' stores

---

## 🎨 New UI Features

### Clickable Metric Cards

**Total Customers Card:**
- Click to see full customer list
- Shows: Name, Email, Total Spent
- Sorted by total spent (highest first)

**Total Orders Card:**
- Click to see full order list
- Shows: Order #, Customer, Date, Total
- Sorted by date (newest first)

### Modal Features

- **Responsive**: Works on mobile and desktop
- **Scrollable**: Handles large lists
- **Searchable**: Easy to scan through data
- **Close**: Click outside or close button

---

## 📊 Top Customers Display

Top customers are automatically shown in the dashboard:
- Updates after every sync
- Shows top 5 customers by total spent
- Displays in the right column of dashboard
- Refreshes when metrics refresh

---

## 🚀 Next Steps

### 1. Run Database Migration

```bash
cd backend
npx prisma db push
```

### 2. Test the Features

1. **Sign up/Login** with your email
2. **Connect a Shopify store** - It will be linked to your email
3. **Sync data** - Pull customers, products, orders
4. **Click "Total Customers"** - See full customer list
5. **Click "Total Orders"** - See full order list
6. **Check Top Customers** - Should appear after sync

### 3. Verify Multi-User

1. Create a second user account
2. Connect a different store
3. Verify each user only sees their own stores

---

## 🐛 Troubleshooting

### Issue: "User not found" Error

**Solution:**
- Make sure you're logged in
- Check that user email is being sent in headers
- Verify session is active

### Issue: "Access denied" Error

**Solution:**
- Store doesn't belong to current user
- Reconnect the store with current user's account
- Or check if you're logged in as the correct user

### Issue: Top Customers Not Showing

**Check:**
1. Did sync complete successfully?
2. Are there customers in your Shopify store?
3. Do customers have `totalSpent > 0`?
4. Try refreshing the page after sync

### Issue: Modal Not Opening

**Check:**
1. Is a tenant selected?
2. Are there customers/orders to show?
3. Check browser console for errors

---

## 📝 API Changes

### New Headers Required

All API requests now include:
```
X-User-Email: user@example.com
```

This is automatically added by the frontend - no manual configuration needed.

### New Endpoints

**Get Customers List:**
```
GET /api/metrics/customers?tenantId=<id>
Headers: X-User-Email: user@example.com
```

**Get Orders List:**
```
GET /api/metrics/orders?tenantId=<id>
Headers: X-User-Email: user@example.com
```

---

## ✅ Checklist

- [ ] Database migration run (`npx prisma db push`)
- [ ] Backend redeployed with new code
- [ ] Frontend redeployed with new code
- [ ] Test: Sign up new user
- [ ] Test: Connect Shopify store
- [ ] Test: Sync data
- [ ] Test: Click "Total Customers" - see list
- [ ] Test: Click "Total Orders" - see list
- [ ] Test: Verify Top Customers appear after sync
- [ ] Test: Multiple users can have separate stores

---

**Your system now has full user-specific store access!** 🎉

