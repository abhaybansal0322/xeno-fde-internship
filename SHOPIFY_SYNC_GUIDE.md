# Shopify Data Sync Guide

## 🎯 Overview

Your dashboard now has full Shopify integration! You can:
1. **Connect your Shopify store** - Add your store credentials
2. **Sync data** - Pull customers, products, and orders from Shopify
3. **View analytics** - See metrics, charts, and top customers

---

## 📋 Step-by-Step: Connect Your Shopify Store

### Step 1: Get Your Shopify Admin API Access Token

1. **Log in to your Shopify Admin**
   - Go to your Shopify store admin panel
   - URL format: `https://yourstore.myshopify.com/admin`

2. **Navigate to Apps**
   - Go to **Settings** → **Apps and sales channels**
   - Click **Develop apps** (at the bottom)

3. **Create a New App**
   - Click **Allow custom app development** (if prompted)
   - Click **Create an app**
   - Enter app name: "Xeno Dashboard" (or any name)
   - Click **Create app**

4. **Configure API Scopes**
   - Click **Configure Admin API scopes**
   - Select the following scopes:
     - ✅ `read_customers`
     - ✅ `read_orders`
     - ✅ `read_products`
   - Click **Save**

5. **Install App and Get Token**
   - Click **Install app**
   - Click **API credentials** tab
   - Under **Admin API access token**, click **Reveal token once**
   - **Copy the token** (starts with `shpat_...`)
   - ⚠️ **Save this token securely** - you won't be able to see it again!

6. **Get Your Shopify Domain**
   - Your domain is: `yourstore.myshopify.com`
   - You can find it in your Shopify admin URL

---

### Step 2: Connect Store in Dashboard

1. **Go to Dashboard**
   - Log in to your dashboard
   - If you don't have any stores connected, you'll see the onboarding form

2. **Fill in the Form**
   - **Store Name**: Enter a friendly name (e.g., "My Store")
   - **Shopify Domain**: Enter `yourstore.myshopify.com`
   - **Admin API Access Token**: Paste the token you copied (starts with `shpat_...`)

3. **Click "Connect Store"**
   - The system will validate your credentials
   - If successful, your store will be added and selected automatically

---

### Step 3: Sync Your Data

1. **Select Your Store**
   - Use the dropdown in the header to select your store
   - If you only have one store, it's selected automatically

2. **Click "Sync Data" Button**
   - Located in the top-right of the dashboard
   - This will pull all customers, products, and orders from Shopify

3. **Wait for Sync to Complete**
   - The sync may take a few minutes depending on your data size
   - You'll see a success message with counts:
     - "X customers, Y products, Z orders"

4. **View Your Data**
   - After sync, your dashboard will automatically refresh
   - You'll see:
     - Total customers, orders, and revenue
     - Orders chart with date filtering
     - Top 5 customers by spend

---

## 🔄 How Sync Works

### What Gets Synced

- **Customers**: All customer data including email, name, and total spent
- **Products**: Product catalog with titles, vendors, types, and prices
- **Orders**: All orders with customer linking, dates, and totals

### Sync Behavior

- **Idempotent**: Running sync multiple times is safe - it updates existing records
- **Incremental**: New data from Shopify is added, existing data is updated
- **Automatic Linking**: Orders are automatically linked to customers

### When to Sync

- **First Time**: After connecting a new store
- **Regular Updates**: When you want to refresh data from Shopify
- **After New Orders**: To get the latest sales data

---

## 🛠️ Troubleshooting

### Issue: "Failed to sync data" Error

**Possible Causes:**
1. **Invalid Access Token**
   - Token may have expired or been revoked
   - Solution: Generate a new token in Shopify and update it

2. **Insufficient API Scopes**
   - Token doesn't have required permissions
   - Solution: Recreate app with correct scopes (read_customers, read_orders, read_products)

3. **Shopify Domain Incorrect**
   - Domain format must be: `yourstore.myshopify.com`
   - Solution: Check your Shopify admin URL

4. **Network Issues**
   - Backend can't reach Shopify API
   - Solution: Check backend logs and network connectivity

### Issue: "Tenant with this Shopify domain already exists"

**Solution:**
- This store is already connected
- Use the tenant dropdown to select it
- Or use a different Shopify store

### Issue: No Data Showing After Sync

**Check:**
1. Did sync complete successfully? (Check success message)
2. Is the correct tenant selected? (Check header dropdown)
3. Does your Shopify store have data? (Check Shopify admin)

**Solution:**
- Try syncing again
- Check browser console for errors
- Verify your Shopify store has customers/orders/products

---

## 📊 Understanding Your Data

### Metrics Explained

- **Total Customers**: Count of unique customers in your store
- **Total Orders**: Count of all orders (any status)
- **Total Revenue**: Sum of all order totals

### Charts

- **Orders Chart**: Shows order count over time
  - Filter by: 7 days, 30 days, or All time
  - Hover to see exact counts

- **Top Customers**: Shows top 5 customers by total spent
  - Displays: Name, Email, Total Spent

---

## 🔐 Security Notes

1. **Access Tokens are Secure**
   - Tokens are stored encrypted in the database
   - Never share your access token

2. **API Scopes**
   - Only read permissions are requested
   - No write/delete permissions needed

3. **Data Privacy**
   - All data is stored securely
   - Multi-tenant isolation ensures data separation

---

## 🚀 Next Steps

After syncing your data:

1. **Explore Your Dashboard**
   - Check metrics and trends
   - Analyze top customers
   - Review order patterns

2. **Regular Syncs**
   - Sync periodically to keep data fresh
   - Recommended: Daily or weekly

3. **Multiple Stores**
   - You can connect multiple Shopify stores
   - Switch between them using the dropdown

---

## 💡 Tips

- **First Sync**: May take longer if you have lots of data
- **Regular Syncs**: Keep your dashboard data up-to-date
- **Store Selection**: Use the header dropdown to switch stores
- **Sync Button**: Only appears when a store is selected

---

## 📞 Need Help?

If you encounter issues:

1. Check browser console (F12) for errors
2. Check backend logs (Render dashboard)
3. Verify Shopify credentials are correct
4. Ensure API scopes are properly configured

---

**Happy syncing! 🎉**

